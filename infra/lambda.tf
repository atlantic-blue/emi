# Two functions, and neither one holds a key. The authorizer reads a stored public key and checks
# a signature. The vault reads and writes ciphertext. Feature 6 steps 2 and 3 replace the
# placeholders below with the real bundles from services/vault.

# The vault placeholder answers every route with 501, so a route that exists before its handler
# does says so plainly rather than failing in some other way.
data "archive_file" "vault_placeholder" {
  type        = "zip"
  output_path = "${path.module}/build/vault-placeholder.zip"

  source {
    filename = "index.mjs"
    content  = <<-EOT
      export const handler = async () => ({
        statusCode: 501,
        headers: { 'content-type': 'application/json' },
        body: '{"error":"not implemented"}',
      });
    EOT
  }
}

# The authorizer placeholder refuses. An authorizer that is not written yet must let nobody
# through, because the failure that costs something is the one that lets everybody through.
data "archive_file" "authorizer_placeholder" {
  type        = "zip"
  output_path = "${path.module}/build/authorizer-placeholder.zip"

  source {
    filename = "index.mjs"
    content  = <<-EOT
      export const handler = async () => ({ isAuthorized: false });
    EOT
  }
}

data "aws_iam_policy_document" "lambda_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# ── The vault function ───────────────────────────────────────────────────────

resource "aws_iam_role" "vault" {
  name               = "${var.project_name}-vault"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

data "aws_iam_policy_document" "vault" {
  statement {
    sid    = "WriteItsOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.vault.arn}:*"]
  }

  statement {
    sid    = "ReadAndWriteTheVault"
    effect = "Allow"
    actions = [
      "dynamodb:BatchWriteItem",
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
    ]
    resources = [
      aws_dynamodb_table.vault.arn,
      "${aws_dynamodb_table.vault.arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "vault" {
  name   = "${var.project_name}-vault"
  role   = aws_iam_role.vault.id
  policy = data.aws_iam_policy_document.vault.json
}

# The group is declared here so it carries a retention. A group the runtime makes for itself
# keeps every line for ever.
resource "aws_cloudwatch_log_group" "vault" {
  name              = "/aws/lambda/${var.project_name}-vault"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "vault" {
  function_name = "${var.project_name}-vault"
  role          = aws_iam_role.vault.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 512
  timeout       = 10

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_VAULT_TABLE = aws_dynamodb_table.vault.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.vault]
}

# ── The authorizer function ──────────────────────────────────────────────────

resource "aws_iam_role" "authorizer" {
  name               = "${var.project_name}-authorizer"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

data "aws_iam_policy_document" "authorizer" {
  statement {
    sid    = "WriteItsOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.authorizer.arn}:*"]
  }

  # The authorizer reads one account item to get one public key, and writes one item down: the
  # signature it just accepted. Refusing a replayed request means remembering the request, and
  # remembering is a write. It reads nothing else, it writes nothing else, and it deletes nothing.
  statement {
    sid    = "ReadOneAccountItemAndRememberOneSignature"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
    ]
    resources = [aws_dynamodb_table.vault.arn]
  }
}

resource "aws_iam_role_policy" "authorizer" {
  name   = "${var.project_name}-authorizer"
  role   = aws_iam_role.authorizer.id
  policy = data.aws_iam_policy_document.authorizer.json
}

resource "aws_cloudwatch_log_group" "authorizer" {
  name              = "/aws/lambda/${var.project_name}-authorizer"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "authorizer" {
  function_name = "${var.project_name}-authorizer"
  role          = aws_iam_role.authorizer.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 256
  timeout       = 5

  filename         = data.archive_file.authorizer_placeholder.output_path
  source_code_hash = data.archive_file.authorizer_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_VAULT_TABLE = aws_dynamodb_table.vault.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.authorizer]
}

# ── The article function ─────────────────────────────────────────────────────
#
# It answers a read only catalogue to anybody who asks, so it is the one function whose requests
# carry no account. It runs as a role of its own for that reason: one table, one action, no write.

resource "aws_iam_role" "articles" {
  name               = "${var.project_name}-articles"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

data "aws_iam_policy_document" "articles" {
  statement {
    sid    = "WriteItsOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.articles.arn}:*"]
  }

  # One query over one partition of one table. No write, so a read cannot leave a trace behind it,
  # and no reach into the vault table at all.
  statement {
    sid       = "ReadOnePhaseOfTheCatalogue"
    effect    = "Allow"
    actions   = ["dynamodb:Query"]
    resources = [aws_dynamodb_table.articles.arn]
  }
}

resource "aws_iam_role_policy" "articles" {
  name   = "${var.project_name}-articles"
  role   = aws_iam_role.articles.id
  policy = data.aws_iam_policy_document.articles.json
}

resource "aws_cloudwatch_log_group" "articles" {
  name              = "/aws/lambda/${var.project_name}-articles"
  retention_in_days = var.log_retention_days
}

# The placeholder answers 501 until the bundle from services/vault is built and uploaded, which is
# the same wait the other two functions are in.
resource "aws_lambda_function" "articles" {
  function_name = "${var.project_name}-articles"
  role          = aws_iam_role.articles.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 256
  timeout       = 5

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_ARTICLES_TABLE = aws_dynamodb_table.articles.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.articles]
}
