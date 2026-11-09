# Three functions, and none of them holds a key. The authorizer reads a stored public key and
# checks a signature. The vault reads and writes ciphertext. The article function answers a
# catalogue.
#
# Each one is created from a placeholder, and each one keeps whatever the pipeline last uploaded
# to it. The bundle is built and uploaded by the functions job of .github/workflows/deploy.yml,
# so the code here is what a function answers with until the first merge reaches it.

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

  # The functions job of .github/workflows/deploy.yml uploads the bundle on a merge. Terraform
  # would read that bundle as drift and put the placeholder back on the next apply, so the route
  # in front of this function would answer from a placeholder again.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
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

  # The functions job of .github/workflows/deploy.yml uploads the bundle on a merge. Terraform
  # would read that bundle as drift and put the placeholder back on the next apply, so the route
  # in front of this function would answer from a placeholder again.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
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

  # The functions job of .github/workflows/deploy.yml uploads the bundle on a merge. Terraform
  # would read that bundle as drift and put the placeholder back on the next apply, so the route
  # in front of this function would answer from a placeholder again.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# ── The Telegram sign in: two roles, and no function yet ─────────────────────
#
# The account reads a policy per request, and a policy change takes a moment to spread, so a new
# grant and the resource that needs it can fail together in one apply. These two roles therefore
# land on their own, before anything assumes them.
#
# The salt is the one value in Emi that Terraform never creates, never holds and never reads. The
# sign in function makes it on the first sign in that finds it absent, so no plan proposes it and
# the state at s3://abs-terraform/emi/terraform.tfstate does not carry it.

# The function that answers a Telegram code. It is the only thing in Emi that reads the client
# secret and the salt, and the only thing that may write the salt.
resource "aws_iam_role" "sign_in_telegram" {
  name               = "${var.project_name}-sign-in-telegram"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

data "aws_iam_policy_document" "sign_in_telegram" {
  # The group arrives with the function, so the grant names the address the runtime writes to
  # rather than a resource of this root.
  statement {
    sid    = "WriteItsOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:${var.region}:${var.account_id}:log-group:/aws/lambda/${var.project_name}-sign-in-telegram:*"]
  }

  # Three parameters, each named in full. A prefix would reach the bot token as well, and the bot
  # token is the one credential that can act as the bot, so nothing on the sign in path reads it.
  statement {
    sid     = "ReadTheBotIdentifierTheClientSecretAndTheSalt"
    effect  = "Allow"
    actions = ["ssm:GetParameter"]
    resources = [
      "arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/accounts/telegram/bot-id",
      "arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/accounts/telegram/client-secret",
      "arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/accounts/telegram/salt",
    ]
  }

  # The client secret and the salt are secure strings under alias/aws/ssm, whose identifier the
  # service generates. The condition is what narrows this grant: the role may decrypt only through
  # a parameter store call, so it opens nothing the statement above does not already open.
  statement {
    sid       = "DecryptASecureString"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["arn:aws:kms:${var.region}:${var.account_id}:key/*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }

  # One write, on one parameter. The call names no overwrite, so a salt that exists survives a
  # function that loses the race to make it. There is no delete anywhere in this role, so nothing
  # in the account can remove the salt through the pipeline: a salt that changed would give every
  # Telegram user a new pool user name, and the account she reached yesterday would be unreachable.
  statement {
    sid       = "MakeTheSaltOnce"
    effect    = "Allow"
    actions   = ["ssm:PutParameter"]
    resources = ["arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/accounts/telegram/salt"]
  }

  # One item: the digest of a one time answer, the pool user name it belongs to, and the instant.
  # The function reads nothing from the table and deletes nothing from it.
  statement {
    sid       = "WriteTheOneTimeAnswer"
    effect    = "Allow"
    actions   = ["dynamodb:PutItem"]
    resources = [aws_dynamodb_table.vault.arn]
  }
}

resource "aws_iam_role_policy" "sign_in_telegram" {
  name   = "${var.project_name}-sign-in-telegram"
  role   = aws_iam_role.sign_in_telegram.id
  policy = data.aws_iam_policy_document.sign_in_telegram.json
}

# ── The three triggers of the custom sign in ─────────────────────────────────
#
# One role for the define, the create and the verify trigger. It holds no parameter at all, so
# nothing the pool calls can read the salt or the client secret.

resource "aws_iam_role" "sign_in_challenge" {
  name               = "${var.project_name}-sign-in-challenge"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

data "aws_iam_policy_document" "sign_in_challenge" {
  # Three functions share this role, so the grant covers the three groups their names will carry.
  statement {
    sid    = "WriteItsOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:${var.region}:${var.account_id}:log-group:/aws/lambda/${var.project_name}-sign-in-challenge-*:*"]
  }

  # The verify trigger spends the one time answer with a conditional delete, and that call returns
  # the item it removed. So the trigger reads the user name and the instant out of its own write,
  # and the role needs no read of the table. The define and the create trigger reach nothing at all.
  statement {
    sid       = "SpendTheOneTimeAnswer"
    effect    = "Allow"
    actions   = ["dynamodb:DeleteItem"]
    resources = [aws_dynamodb_table.vault.arn]
  }
}

resource "aws_iam_role_policy" "sign_in_challenge" {
  name   = "${var.project_name}-sign-in-challenge"
  role   = aws_iam_role.sign_in_challenge.id
  policy = data.aws_iam_policy_document.sign_in_challenge.json
}
