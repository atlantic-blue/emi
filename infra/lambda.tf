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

  # The authorizer reads one account item to get one public key. It can read nothing else and
  # write nothing at all.
  statement {
    sid       = "ReadOneAccountItem"
    effect    = "Allow"
    actions   = ["dynamodb:GetItem"]
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
