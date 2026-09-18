resource "aws_apigatewayv2_api" "vault" {
  name          = "${var.project_name}-vault"
  protocol_type = "HTTP"
  description   = "The encrypted vault. Ciphertext in, ciphertext out, no key anywhere behind it"
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
