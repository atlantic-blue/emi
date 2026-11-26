# Seven functions, and none of them holds a key. The authorizer reads a stored public key and
# checks a signature. The vault reads and writes ciphertext. The article function answers a
# catalogue. The sign in with Telegram answers a code, and the three triggers of the custom sign in
# turn one answer of it into tokens of the pool.
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

  # One parameter, named in full. A delete stops the renewal of the card payment it finds before it
  # removes anything, and that call needs the secret key. The signing secret of the webhook is not
  # here and neither is a prefix, so this role reads the one value it has a use for.
  statement {
    sid       = "ReadTheStripeSecretKey"
    effect    = "Allow"
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/payments/stripe/secret-key"]
  }

  # The other parameter, named in full. A filing of a purchase in the App Store signs a token with
  # this credential and asks Apple about one transaction. It is a second statement rather than a
  # second resource on the one above, so a reader sees which route reads which value.
  statement {
    sid       = "ReadTheAppStoreApiKey"
    effect    = "Allow"
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/payments/apple/api-key"]
  }

  # The key is a secure string under alias/aws/ssm, whose identifier the service generates. The
  # condition is what narrows this grant: the role may decrypt only through a parameter store call,
  # so it opens nothing the statement above does not already open.
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

# ── The Telegram sign in: two roles ──────────────────────────────────────────
#
# The account reads a policy per request, and a policy change takes a moment to spread, so a new
# grant and the resource that needs it can fail together in one apply. These two roles landed on
# their own, before anything assumed them. The grant that holds her pool user comes with the
# function below, because nothing calls it during an apply: the first call is a woman signing in.
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

  # The function holds her pool user: it creates the user, and on the second path the pool may
  # force it sets a password nothing can present. Both calls stand on this one pool. No other
  # Amazon Cognito action is named here, so nothing on this path reads a user or lists one.
  statement {
    sid    = "HoldHerPoolUser"
    effect = "Allow"
    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminSetUserPassword",
    ]
    resources = [aws_cognito_user_pool.accounts.arn]
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

# ── The four functions of the Telegram sign in ───────────────────────────────
#
# Each one is created from the 501 placeholder the vault function uses, and each one keeps whatever
# the pipeline last uploaded to it. Nothing invokes the three triggers yet: the pool names them,
# and adding them to the pool is a piece of its own, so the placeholder answer of a trigger is
# never read by anything.

resource "aws_cloudwatch_log_group" "sign_in_telegram" {
  name              = "/aws/lambda/${var.project_name}-sign-in-telegram"
  retention_in_days = var.log_retention_days
}

# It reads the pool it creates her user in, and the table it writes one answer to. The three
# parameters it reads are named by services/vault/src/telegram/parameters.ts, and the role above
# names those same three one by one.
resource "aws_lambda_function" "sign_in_telegram" {
  function_name = "${var.project_name}-sign-in-telegram"
  role          = aws_iam_role.sign_in_telegram.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 512
  # It exchanges a code with Telegram and reads the key set, so it waits on a service of somebody
  # else twice.
  timeout = 10

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_VAULT_TABLE      = aws_dynamodb_table.vault.name
      EMI_ACCOUNTS_POOL_ID = aws_cognito_user_pool.accounts.id
    }
  }

  depends_on = [aws_cloudwatch_log_group.sign_in_telegram]

  # The functions job of .github/workflows/deploy.yml uploads the bundle on a merge. Terraform
  # would read that bundle as drift and put the placeholder back on the next apply, so the route
  # in front of this function would answer from a placeholder again.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_cloudwatch_log_group" "sign_in_challenge_define" {
  name              = "/aws/lambda/${var.project_name}-sign-in-challenge-define"
  retention_in_days = var.log_retention_days
}

# The state machine of the custom sign in. It decides from the session it is handed, so it reads
# no name and holds no client. The pool allows a trigger five seconds.
resource "aws_lambda_function" "sign_in_challenge_define" {
  function_name = "${var.project_name}-sign-in-challenge-define"
  role          = aws_iam_role.sign_in_challenge.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 256
  timeout       = 5

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.sign_in_challenge_define]

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_cloudwatch_log_group" "sign_in_challenge_create" {
  name              = "/aws/lambda/${var.project_name}-sign-in-challenge-create"
  retention_in_days = var.log_retention_days
}

# It issues a challenge that asks her nothing, because she holds the answer already, so it too
# reads no name and holds no client.
resource "aws_lambda_function" "sign_in_challenge_create" {
  function_name = "${var.project_name}-sign-in-challenge-create"
  role          = aws_iam_role.sign_in_challenge.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 256
  timeout       = 5

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.sign_in_challenge_create]

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_cloudwatch_log_group" "sign_in_challenge_verify" {
  name              = "/aws/lambda/${var.project_name}-sign-in-challenge-verify"
  retention_in_days = var.log_retention_days
}

# The one trigger that reaches the table. It spends the one time answer with a conditional delete
# and reads the two fields that delete returns, so it names the table and nothing else.
resource "aws_lambda_function" "sign_in_challenge_verify" {
  function_name = "${var.project_name}-sign-in-challenge-verify"
  role          = aws_iam_role.sign_in_challenge.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 256
  timeout       = 5

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_VAULT_TABLE = aws_dynamodb_table.vault.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.sign_in_challenge_verify]

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# ── The payments role ────────────────────────────────────────────────────────
#
# One role for every function of the money. It reaches one partition prefix of the vault table and
# no account partition at all, so a function that writes a payment cannot read one day of anybody's
# history. It names each parameter of docs/design/payments.md section 5 in full, so no grant here
# reaches the bot token under the neighbouring prefix.

resource "aws_iam_role" "payments" {
  name               = "${var.project_name}-payments"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

data "aws_iam_policy_document" "payments" {
  # The groups arrive with the functions, so the grant names the addresses the runtime writes to
  # rather than resources of this root.
  statement {
    sid    = "WriteItsOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:${var.region}:${var.account_id}:log-group:/aws/lambda/${var.project_name}-payments-*:*"]
  }

  # One item, by its whole key, under a partition that opens with PAY#. There is no query and no
  # scan here, and the two conditions are what make the limit real rather than a promise about the
  # code: a ForAllValues test is true when the request names no key at all, which a scan does not,
  # so the Null condition beside it refuses a request that leaves the key out.
  statement {
    sid    = "ReadAndWriteOnePaymentPartition"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
    ]
    resources = [aws_dynamodb_table.vault.arn]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values   = ["PAY#*"]
    }

    condition {
      test     = "Null"
      variable = "dynamodb:LeadingKeys"
      values   = ["false"]
    }
  }

  # Two parameters, each named in full: the secret key, which both functions read, and the signing
  # secret of the webhook endpoint. A prefix would reach every parameter of this product, and
  # nothing in this repository creates either one or gives either one a value.
  statement {
    sid     = "ReadTheStripeSecrets"
    effect  = "Allow"
    actions = ["ssm:GetParameter"]
    resources = [
      "arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/payments/stripe/secret-key",
      "arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/payments/stripe/webhook-secret",
    ]
  }

  # The key is a secure string under alias/aws/ssm, whose identifier the service generates. The
  # condition is what narrows this grant: the role may decrypt only through a parameter store call,
  # so it opens nothing the statement above does not already open.
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
}

resource "aws_iam_role_policy" "payments" {
  name   = "${var.project_name}-payments"
  role   = aws_iam_role.payments.id
  policy = data.aws_iam_policy_document.payments.json
}

# The function that answers the press on Buy Emi. It makes the customer and the setup, writes the
# payment item, and reads the secret key from the parameter store on the first request a container
# takes. Its environment carries the table and the pool, and no secret of any kind: a Lambda update
# prints the whole configuration of a function, and the log of this pipeline is public.

resource "aws_cloudwatch_log_group" "payments_subscription" {
  name              = "/aws/lambda/${var.project_name}-payments-subscription"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "payments_subscription" {
  function_name = "${var.project_name}-payments-subscription"
  role          = aws_iam_role.payments.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 512
  # It reads a parameter and makes two objects in Stripe, so it waits on a service of somebody
  # else twice.
  timeout = 10

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_VAULT_TABLE      = aws_dynamodb_table.vault.name
      EMI_ACCOUNTS_POOL_ID = aws_cognito_user_pool.accounts.id
    }
  }

  depends_on = [aws_cloudwatch_log_group.payments_subscription]

  # The functions job of .github/workflows/deploy.yml uploads the bundle on a merge. Terraform
  # would read that bundle as drift and put the placeholder back on the next apply, so the route
  # in front of this function would answer from a placeholder again.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# The function that answers a delivery of Stripe. It verifies the signature before it reads one
# field of the body, reads the customer of the event to learn which digest paid, and writes the
# payment item. Its environment carries the table and no secret of any kind.

resource "aws_cloudwatch_log_group" "payments_webhook" {
  name              = "/aws/lambda/${var.project_name}-payments-webhook"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "payments_webhook" {
  function_name = "${var.project_name}-payments-webhook"
  role          = aws_iam_role.payments.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 512
  # It reads two parameters and one customer of Stripe, so it waits on a service of somebody else
  # twice. Stripe gives an endpoint far longer than this and sends the delivery again after a
  # failure, so a timeout costs a retry rather than a payment.
  timeout = 10

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_VAULT_TABLE = aws_dynamodb_table.vault.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.payments_webhook]

  # The functions job of .github/workflows/deploy.yml uploads the bundle on a merge. Terraform
  # would read that bundle as drift and put the placeholder back on the next apply, so the route
  # in front of this function would answer from a placeholder again.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# ── The notifications of the App Store ───────────────────────────────────────

# A role of its own, and the narrowest one here. It reads the pointer item of one purchase and
# writes the subscription onto one account item, and that is the whole of what it may do. It reads
# no parameter and decrypts nothing: Apple signs each notification, and the root that verifies the
# signature is in the bundle, so this route needs no credential of ours to believe what it is told.

resource "aws_iam_role" "store_notifications" {
  name               = "${var.project_name}-store-notifications"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

data "aws_iam_policy_document" "store_notifications" {
  statement {
    sid    = "WriteItsOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.store_notifications.arn}:*"]
  }

  # One item, by its whole key, under a partition that opens with STORE#. That item holds one
  # attribute, the account a purchase was filed by, and contract PAY-9 names it. The two conditions
  # are what make the limit real: a ForAllValues test is true when the request names no key at all,
  # which a scan does not, so the Null condition beside it refuses a request that leaves the key
  # out.
  statement {
    sid       = "ReadOnePurchasePointer"
    effect    = "Allow"
    actions   = ["dynamodb:GetItem"]
    resources = [aws_dynamodb_table.vault.arn]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values   = ["STORE#*"]
    }

    condition {
      test     = "Null"
      variable = "dynamodb:LeadingKeys"
      values   = ["false"]
    }
  }

  # The date, the state and the plan, written onto one account item by its whole key. It is an
  # update and never a put, so a notification can add the seven attributes of contract PAY-5 to an
  # account and can replace nothing else on it. There is no read of that partition here at all, so
  # this role cannot read one day of anybody's history, and no query and no scan, so it cannot
  # learn which accounts exist.
  statement {
    sid       = "WriteTheSubscriptionOnOneAccount"
    effect    = "Allow"
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.vault.arn]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values   = ["ACC#*"]
    }

    condition {
      test     = "Null"
      variable = "dynamodb:LeadingKeys"
      values   = ["false"]
    }
  }
}

resource "aws_iam_role_policy" "store_notifications" {
  name   = "${var.project_name}-store-notifications"
  role   = aws_iam_role.store_notifications.id
  policy = data.aws_iam_policy_document.store_notifications.json
}

resource "aws_cloudwatch_log_group" "store_notifications" {
  name              = "/aws/lambda/${var.project_name}-store-notifications"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "store_notifications" {
  function_name = "${var.project_name}-store-notifications"
  role          = aws_iam_role.store_notifications.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 512
  # It verifies a chain of certificates and reaches the table twice, and it waits on nobody else at
  # all. Apple asks for an answer within a bounded time and sends the notification again after a
  # failure, so a timeout costs a retry rather than a date.
  timeout = 10

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_VAULT_TABLE = aws_dynamodb_table.vault.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.store_notifications]

  # The functions job of .github/workflows/deploy.yml uploads the bundle on a merge. Terraform
  # would read that bundle as drift and put the placeholder back on the next apply, so the route
  # in front of this function would answer from a placeholder again.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# ── The Telegram Stars route ─────────────────────────────────────────────────
#
# One role for the two functions that sell a year in Stars. It reaches the same partition prefix
# of the vault table as the card route and no account partition at all, and it is the only role in
# Emi that reads the bot token: that token is the one credential that can act as the Emi bot, so
# the payments role and the sign in role are both kept away from it.

resource "aws_iam_role" "stars" {
  name               = "${var.project_name}-stars"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}

data "aws_iam_policy_document" "stars" {
  statement {
    sid    = "WriteItsOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = [
      "arn:aws:logs:${var.region}:${var.account_id}:log-group:/aws/lambda/${var.project_name}-payments-stars-invoice:*",
      "arn:aws:logs:${var.region}:${var.account_id}:log-group:/aws/lambda/${var.project_name}-telegram-updates:*",
    ]
  }

  # One item, by its whole key, under a partition that opens with PAY#. The two conditions are the
  # same pair the payments role carries: a ForAllValues test is true when the request names no key
  # at all, which a scan does not, so the Null condition beside it refuses that request.
  statement {
    sid    = "ReadAndWriteOnePaymentPartition"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
    ]
    resources = [aws_dynamodb_table.vault.arn]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values   = ["PAY#*"]
    }

    condition {
      test     = "Null"
      variable = "dynamodb:LeadingKeys"
      values   = ["false"]
    }
  }

  # Two parameters, each named in full. The bot token a person wrote, and the secret of the webhook
  # that this root creates. A prefix would reach every parameter of this product.
  statement {
    sid     = "ReadTheBotTokenAndTheWebhookSecret"
    effect  = "Allow"
    actions = ["ssm:GetParameter"]
    resources = [
      "arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/accounts/telegram/bot-token",
      "arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/payments/telegram/webhook-secret",
    ]
  }

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
}

resource "aws_iam_role_policy" "stars" {
  name   = "${var.project_name}-stars"
  role   = aws_iam_role.stars.id
  policy = data.aws_iam_policy_document.stars.json
}

# The secret every update of the bot must present. It is the one secret of Emi that this root
# creates rather than a person: no value of hers is in it, it names nothing, and the deploy that
# registers the webhook reads it back and hands it to Telegram in the same job.
#
# A new value here costs one registration, which the same job makes, so this parameter can be
# replaced at any time. That is why it is generated and the bot token is not.
resource "random_password" "telegram_webhook_secret" {
  length = 48
  # Telegram allows the characters below in this header and refuses the rest.
  override_special = "_-"
  special          = true
  upper            = true
  lower            = true
  numeric          = true
}

resource "aws_ssm_parameter" "telegram_webhook_secret" {
  name        = "/${var.project_name}/payments/telegram/webhook-secret"
  description = "The secret an update of the Emi bot carries. Generated, never written by hand"
  type        = "SecureString"
  value       = random_password.telegram_webhook_secret.result
}

# The function that answers the press on Buy with Stars. It makes one invoice link and writes
# nothing: the payment itself arrives as an update of the bot. Its environment carries the table
# and the pool, and no secret of any kind.

resource "aws_cloudwatch_log_group" "payments_stars_invoice" {
  name              = "/aws/lambda/${var.project_name}-payments-stars-invoice"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "payments_stars_invoice" {
  function_name = "${var.project_name}-payments-stars-invoice"
  role          = aws_iam_role.stars.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 512
  # It reads one parameter, one item and one method of the bot api, so it waits on a service of
  # somebody else twice.
  timeout = 10

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_VAULT_TABLE      = aws_dynamodb_table.vault.name
      EMI_ACCOUNTS_POOL_ID = aws_cognito_user_pool.accounts.id
    }
  }

  depends_on = [aws_cloudwatch_log_group.payments_stars_invoice]

  # The functions job of .github/workflows/deploy.yml uploads the bundle on a merge. Terraform
  # would read that bundle as drift and put the placeholder back on the next apply, so the route
  # in front of this function would answer from a placeholder again.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# The function that answers an update of the Emi bot. It matches the secret of the header before it
# reads one field of the body, answers the pre checkout query, and writes the payment down.

resource "aws_cloudwatch_log_group" "telegram_updates" {
  name              = "/aws/lambda/${var.project_name}-telegram-updates"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "telegram_updates" {
  function_name = "${var.project_name}-telegram-updates"
  role          = aws_iam_role.stars.arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = 512
  # Telegram cancels a payment whose pre checkout query is not answered within 10 seconds, and it
  # sends an update again after a failure, so a timeout costs a retry rather than a payment.
  timeout = 10

  filename         = data.archive_file.vault_placeholder.output_path
  source_code_hash = data.archive_file.vault_placeholder.output_base64sha256

  environment {
    variables = {
      EMI_VAULT_TABLE = aws_dynamodb_table.vault.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.telegram_updates]

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}
