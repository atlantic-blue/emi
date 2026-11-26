resource "aws_apigatewayv2_api" "vault" {
  name          = "${var.project_name}-vault"
  protocol_type = "HTTP"
  description   = "The encrypted vault. Ciphertext in, ciphertext out, no key anywhere behind it"

  # The site is the only browser that calls this api from another address, so one origin is named
  # and a wildcard is refused. The api answers the preflight itself, before it matches a route, so
  # no authorizer runs for one and no route gives its authorizer up by being listed here.
  # A request carrying an authorization header is never a simple request, so the browser asks
  # first and sends nothing the answer does not list. Every method the site calls belongs here.
  cors_configuration {
    allow_origins     = ["https://myemi.app"]
    allow_methods     = ["GET", "PATCH", "POST", "PUT"]
    allow_headers     = ["authorization", "content-type"]
    allow_credentials = false
    max_age           = 86400
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${var.project_name}-vault"
  retention_in_days = var.log_retention_days
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.vault.id
  name        = "$default"
  auto_deploy = true

  # The route key is the template, so a record identifier never reaches this line. No header is
  # named here either, which is what keeps the account identifier and the signature out of the
  # log. That is contract KEEP-1, and feature 6 step 7 proves it by driving every endpoint.
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId = "$context.requestId"
      method    = "$context.httpMethod"
      route     = "$context.routeKey"
      status    = "$context.status"
      latencyMs = "$context.responseLatency"
    })
  }

  # A bound on what a runaway client can spend, not a product limit.
  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }
}

resource "aws_apigatewayv2_integration" "vault" {
  api_id                 = aws_apigatewayv2_api.vault.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.vault.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

resource "aws_apigatewayv2_authorizer" "signature" {
  api_id                            = aws_apigatewayv2_api.vault.id
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.authorizer.invoke_arn
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  name                              = "${var.project_name}-signature"

  identity_sources = [
    "$request.header.emi-account",
    "$request.header.emi-instant",
    "$request.header.emi-signature",
  ]

  # Zero, and it may not be raised. A cached answer is a replayed signature that passes, which is
  # the one thing contract AUTH-1 exists to refuse.
  authorizer_result_ttl_in_seconds = 0
}

# Registration is the one call with no authorizer, because the account does not exist yet and
# there is no stored key to check against. The body is signed by the key it registers, so it
# asserts only itself, and the handler checks that in feature 6 step 2.
resource "aws_apigatewayv2_route" "register" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "POST /v1/accounts"
  target             = "integrations/${aws_apigatewayv2_integration.vault.id}"
  authorization_type = "NONE"
}

# The sign in has a function of its own, and the sign in is the only handler its bundle carries. So
# the one route that reaches the client secret and the salt answers nothing else, and its role may
# write one item to the table and read none.
resource "aws_apigatewayv2_integration" "sign_in_telegram" {
  api_id                 = aws_apigatewayv2_api.vault.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.sign_in_telegram.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

# The sign in with Telegram takes no authorizer, for the same reason registration takes none: a
# woman signing in holds no device key for the account she is reaching, so there is no stored key
# to check a signature against. What she sends is a code Telegram gave her, and the function
# believes it only after Telegram signs an identity token for it.
resource "aws_apigatewayv2_route" "sign_in_telegram" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "POST /v1/sign-in/telegram"
  target             = "integrations/${aws_apigatewayv2_integration.sign_in_telegram.id}"
  authorization_type = "NONE"
}

resource "aws_apigatewayv2_route" "put_record" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "PUT /v1/records/{recordId}"
  target             = "integrations/${aws_apigatewayv2_integration.vault.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.signature.id
}

resource "aws_apigatewayv2_route" "pull_records" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "GET /v1/records"
  target             = "integrations/${aws_apigatewayv2_integration.vault.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.signature.id
}

resource "aws_apigatewayv2_route" "delete_account" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "DELETE /v1/account"
  target             = "integrations/${aws_apigatewayv2_integration.vault.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.signature.id
}

# What the phone sends after she buys a plan in the App Store. It carries one transaction identifier
# and it is signed by her device key, the same as every other route of the vault function, so the
# server knows the account with no sign in and no token.
resource "aws_apigatewayv2_route" "file_store_transaction" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "POST /v1/payments/store"
  target             = "integrations/${aws_apigatewayv2_integration.vault.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.signature.id
}

resource "aws_apigatewayv2_integration" "articles" {
  api_id                 = aws_apigatewayv2_api.vault.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.articles.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 5000
}

# The article catalogue takes no authorizer, because a request says which phase is being read and
# never who is reading it. The phase is a path parameter, so the route key the access log writes is
# this template and not the filled path: the log records that somebody read an article and cannot
# record which phase it was.
resource "aws_apigatewayv2_route" "read_articles" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "GET /v1/articles/{phase}"
  target             = "integrations/${aws_apigatewayv2_integration.articles.id}"
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "articles" {
  statement_id  = "AllowInvokeFromTheApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.articles.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.vault.execution_arn}/*/*"
}

resource "aws_lambda_permission" "sign_in_telegram" {
  statement_id  = "AllowInvokeFromTheApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sign_in_telegram.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.vault.execution_arn}/*/*"
}

# The token authorizer of the pool, which is the one authorizer that is not a function of ours. It
# verifies the signature, the issuer and the audience of an identity token before the payments
# function runs, so a token minted by another pool or by another client never reaches the money.
#
# The audience is the site alone. The application on her phone sells through the App Store, and
# section 6 of docs/design/payments.md says it sells nothing through this route, so a token of the
# iPhone client is refused here.
resource "aws_apigatewayv2_authorizer" "pool_token" {
  api_id          = aws_apigatewayv2_api.vault.id
  authorizer_type = "JWT"
  name            = "${var.project_name}-pool-token"

  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.website.id]
    issuer   = "https://${aws_cognito_user_pool.accounts.endpoint}"
  }
}

# The money runs in a function of its own, under the role that reaches the payment partition and
# the Stripe secret key. The vault function reaches neither, and this one reaches no account
# partition, so neither one can do the other's half.
resource "aws_apigatewayv2_integration" "payments_subscription" {
  api_id                 = aws_apigatewayv2_api.vault.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.payments_subscription.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

# The press on Buy Emi. It makes the customer and the setup her card is collected on, and the
# payer digest it writes under is cut from a claim of her own token, so the request names no
# account and carries no body at all.
resource "aws_apigatewayv2_route" "start_subscription" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "POST /v1/payments/subscription"
  target             = "integrations/${aws_apigatewayv2_integration.payments_subscription.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.pool_token.id
}

# What her browser sends once Stripe has taken the card or the wallet on the Buy Emi page. It
# names the setup and nothing else, and the function reads that setup back from Stripe, makes it
# the card every invoice goes to, and creates the yearly subscription on the customer the press
# already made.
resource "aws_apigatewayv2_route" "finish_subscription" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "PUT /v1/payments/subscription"
  target             = "integrations/${aws_apigatewayv2_integration.payments_subscription.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.pool_token.id
}

# Her account page, which reads whether a subscription is running and what the card says. It is
# the same function and the same authorizer as the press above, because both read one claim of one
# token and reach one item under one digest.
resource "aws_apigatewayv2_route" "read_subscription" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "GET /v1/payments/subscription"
  target             = "integrations/${aws_apigatewayv2_integration.payments_subscription.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.pool_token.id
}

# Cancel renewal, and the press that turns it back on. It is the same function and the same
# authorizer again, because it reaches the one item under her digest and the one subscription that
# item names. The year she paid for is not touched by it.
resource "aws_apigatewayv2_route" "change_renewal" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "PATCH /v1/payments/subscription"
  target             = "integrations/${aws_apigatewayv2_integration.payments_subscription.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.pool_token.id
}

# The receipts row of her account page. It lists the invoices Stripe already holds for the
# customer she pays under, and Emi keeps no copy of any of them. It is the same function and the
# same authorizer as the three routes above, because it reads the same claim of the same token.
resource "aws_apigatewayv2_route" "read_receipts" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "GET /v1/payments/receipts"
  target             = "integrations/${aws_apigatewayv2_integration.payments_subscription.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.pool_token.id
}

# The press on Change card, which makes a second setup to collect a payment method. It is the same
# function and the same authorizer as the routes above, because it reads the same claim of the same
# token and reaches the one item under her own payer digest.
resource "aws_apigatewayv2_route" "start_card_change" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "POST /v1/payments/payment-method"
  target             = "integrations/${aws_apigatewayv2_integration.payments_subscription.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.pool_token.id
}

# What her browser sends once Stripe has taken the card or the wallet. It names the setup and
# nothing else, and the function reads that setup back from Stripe to see whose it is.
resource "aws_apigatewayv2_route" "finish_card_change" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "PUT /v1/payments/payment-method"
  target             = "integrations/${aws_apigatewayv2_integration.payments_subscription.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.pool_token.id
}

resource "aws_lambda_permission" "payments_subscription" {
  statement_id  = "AllowInvokeFromTheApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.payments_subscription.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.vault.execution_arn}/*/*"
}

# The webhook runs in a function of its own, under the same role as the subscription route. It is
# the one route of the money with no authorizer, because Stripe holds no token of this account.
resource "aws_apigatewayv2_integration" "payments_webhook" {
  api_id                 = aws_apigatewayv2_api.vault.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.payments_webhook.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

# The deliveries of Stripe. They carry no authorizer because Stripe signs each one instead, and the
# function verifies that signature against the signing secret before it reads one field of the
# body. A body that fails the check is answered 400 and written nowhere.
resource "aws_apigatewayv2_route" "stripe_events" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "POST /v1/payments/webhook"
  target             = "integrations/${aws_apigatewayv2_integration.payments_webhook.id}"
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "payments_webhook" {
  statement_id  = "AllowInvokeFromTheApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.payments_webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.vault.execution_arn}/*/*"
}

# The Telegram Stars route runs in two functions of its own, under the one role that reads the bot
# token. The press on Buy with Stars stands behind the token authorizer of the pool, the same as
# every other route a woman presses, and the updates of the bot stand behind no authorizer at all.
resource "aws_apigatewayv2_integration" "payments_stars_invoice" {
  api_id                 = aws_apigatewayv2_api.vault.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.payments_stars_invoice.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

# The press on Buy with Stars. It answers one invoice link for one year, made for the digest her
# own token names, and it writes nothing at all.
resource "aws_apigatewayv2_route" "stars_invoice" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "POST /v1/payments/stars/invoice"
  target             = "integrations/${aws_apigatewayv2_integration.payments_stars_invoice.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.pool_token.id
}

resource "aws_lambda_permission" "payments_stars_invoice" {
  statement_id  = "AllowInvokeFromTheApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.payments_stars_invoice.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.vault.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "telegram_updates" {
  api_id                 = aws_apigatewayv2_api.vault.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.telegram_updates.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

# The updates of the Emi bot. They carry no authorizer because Telegram holds no token of this
# account: every update carries the secret of the webhook in a header instead, and the function
# matches it against the parameter store before it reads one field of the body. A body that fails
# the check is answered 401 and written nowhere. The functions job of the deploy registers this
# address with Telegram.
resource "aws_apigatewayv2_route" "telegram_updates" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "POST /v1/telegram/updates"
  target             = "integrations/${aws_apigatewayv2_integration.telegram_updates.id}"
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "telegram_updates" {
  statement_id  = "AllowInvokeFromTheApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.telegram_updates.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.vault.execution_arn}/*/*"
}

# The notifications of the App Store run in a function of their own, under the role that reads the
# pointer of one purchase and writes the date on one account item. The vault function cannot be
# reached without a signature of her device key, and this one is reached by Apple, so the two are
# kept apart: neither can do the other's half.
resource "aws_apigatewayv2_integration" "store_notifications" {
  api_id                 = aws_apigatewayv2_api.vault.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.store_notifications.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

# What Apple posts when a subscription renews, lapses or is refunded, with nothing of Emi running
# on her phone. It carries no authorizer because Apple holds no token of this account: it signs the
# whole body instead, and the function verifies that chain of certificates against the root it
# carries before it reads one field. A body that fails the check is answered 400 and written
# nowhere. The address of this route is the one the operator pastes into App Store Connect.
resource "aws_apigatewayv2_route" "store_notifications" {
  api_id             = aws_apigatewayv2_api.vault.id
  route_key          = "POST /v1/payments/store/notifications"
  target             = "integrations/${aws_apigatewayv2_integration.store_notifications.id}"
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "store_notifications" {
  statement_id  = "AllowInvokeFromTheApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.store_notifications.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.vault.execution_arn}/*/*"
}

resource "aws_lambda_permission" "vault" {
  statement_id  = "AllowInvokeFromTheApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.vault.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.vault.execution_arn}/*/*"
}

resource "aws_lambda_permission" "authorizer" {
  statement_id  = "AllowInvokeFromTheApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.vault.execution_arn}/authorizers/${aws_apigatewayv2_authorizer.signature.id}"
}

output "api_endpoint" {
  description = "Address the application sends ciphertext to"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "vault_table_name" {
  description = "Name of the table the vault reads and writes"
  value       = aws_dynamodb_table.vault.name
}

output "articles_table_name" {
  description = "Name of the table the article catalogue is written into"
  value       = aws_dynamodb_table.articles.name
}
