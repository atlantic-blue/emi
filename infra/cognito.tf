# One user pool holds the sign in. It holds an email address, a subject and the way she signed in.
# It holds no vault key, no day and no account identifier, because the vault keys on the public key
# of her phone and the recovery code is the only thing that opens a record.
#
# A pool bills by monthly active user, so a month in which nobody signs in costs nothing.
resource "aws_cognito_user_pool" "accounts" {
  name = "${var.project_name}-accounts"

  # The email one time code is a first factor, and the Lite tier does not carry one. Essentials is
  # the cheapest tier that does.
  user_pool_tier = "ESSENTIALS"

  # The username stays a string the service writes, and her email address signs her in beside it.
  # A pool that made the address the username would refuse every username that is not an address,
  # and Telegram names its user tg_ followed by a hash. This setting cannot be changed after the
  # pool exists.
  alias_attributes         = ["email"]
  auto_verified_attributes = ["email"]

  username_configuration {
    case_sensitive = false
  }

  # A one time code cannot be a first factor in a pool that asks for a second one.
  mfa_configuration = "OFF"

  # The two factors a sign in may start with. The service refuses a list without PASSWORD, so the
  # word is here and nothing uses it: no screen asks for a password, no client allows a password
  # flow, and the recovery below leaves no way to set one.
  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD", "EMAIL_OTP"]
  }

  # No self service recovery, because there is no password to recover. A woman who loses her email
  # address loses the way back to the account and never her days: the recovery code opens those.
  account_recovery_setting {
    recovery_mechanism {
      name     = "admin_only"
      priority = 1
    }
  }

  # She makes her own account from the application, so a pool administrator is not needed to make
  # one.
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # Her way back into the account cannot be removed by a configuration change alone. Deleting the
  # pool takes a person turning this off first, on purpose, in the same way as the vault table.
  deletion_protection = "ACTIVE"

  # The code she signs in with leaves from the Emi sender rather than from an address of the
  # service. DEVELOPER means the pool calls Amazon Simple Email Service in this account, so the
  # message is signed as Emi, it is counted on the configuration set of Emi, and its daily limit
  # is the limit of the account rather than the 50 messages the service lends a pool.
  #
  # The from address is the one the sender holds, so the address Emi writes from has one home and
  # the registration with Apple names the same string.
  #
  # Saving this makes a service linked role, with the credentials of whoever saved it. The grant
  # for that landed in step 28.9, in a merge of its own.
  email_configuration {
    email_sending_account = "DEVELOPER"
    source_arn            = aws_sesv2_email_identity.sender.arn
    from_email_address    = local.sender_from
    configuration_set     = aws_sesv2_configuration_set.sender.configuration_set_name
  }

  # The three triggers of the custom sign in, which is the one way in the pool cannot run on its
  # own. Sign in with Telegram authenticates her outside the pool, and the custom sign in is what
  # turns that into tokens of this pool. The define trigger is the state machine, the create
  # trigger issues a challenge she already holds the answer to, and the verify trigger spends that
  # answer once.
  #
  # Federated sign in invokes no custom authentication trigger, so Sign in with Apple and Sign in
  # with Google reach none of these three.
  #
  # Each one is named through the resource that makes it, so Terraform makes the function before
  # the pool names it. An address written as text here would let an apply point the pool at a
  # function the account does not hold, and the pool refuses every sign in that reaches a trigger
  # it cannot invoke.
  lambda_config {
    define_auth_challenge          = aws_lambda_function.sign_in_challenge_define.arn
    create_auth_challenge          = aws_lambda_function.sign_in_challenge_create.arn
    verify_auth_challenge_response = aws_lambda_function.sign_in_challenge_verify.arn
  }

  # The pool is made in the same apply that grants the role the right to make it, and the two are
  # otherwise unrelated, so the order is said here. The identity is named for the same reason the
  # other way round: the pool may not carry a sender that does not exist yet.
  #
  # Existing is not the same as verified. The service refuses to send from an identity whose
  # records have not answered, and no Terraform wait can watch the Domain Name System spread. So
  # an account built from nothing sets this in a second apply, which the readme says.
  depends_on = [aws_iam_role_policy.apply, aws_sesv2_email_identity.sender]
}

# ── The three triggers the pool invokes ──────────────────────────────────────
#
# A function refuses a caller that no policy on it names, so the pool cannot run a trigger until
# each one carries this. The principal is the service, and the source address is this pool, so no
# other pool of this account and no pool of another account may invoke a function of Emi.

resource "aws_lambda_permission" "sign_in_challenge_define" {
  statement_id  = "AllowInvokeFromThePool"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sign_in_challenge_define.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.accounts.arn
}

resource "aws_lambda_permission" "sign_in_challenge_create" {
  statement_id  = "AllowInvokeFromThePool"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sign_in_challenge_create.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.accounts.arn
}

resource "aws_lambda_permission" "sign_in_challenge_verify" {
  statement_id  = "AllowInvokeFromThePool"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sign_in_challenge_verify.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.accounts.arn
}

# The application on her phone. A public client, because an application on a phone keeps no secret.
resource "aws_cognito_user_pool_client" "iphone" {
  name         = "${var.project_name}-iphone"
  user_pool_id = aws_cognito_user_pool.accounts.id

  generate_secret = false

  # Choice based sign in is the only flow a one time code travels in. The custom flow is the one
  # Sign in with Telegram starts, and the three triggers above carry it. The refresh keeps her
  # signed in. No password flow is listed, so a client cannot present a password even if one
  # existed.
  explicit_auth_flows = ["ALLOW_USER_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_CUSTOM_AUTH"]

  # An email takes minutes to arrive, so the session that carries a code lasts the longest the
  # service allows.
  auth_session_validity = 15

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # A sign out ends the session it was issued for.
  enable_token_revocation = true

  # The pool answers the same way whether or not an address has an account. An answer that said
  # which would let anybody test who uses Emi.
  prevent_user_existence_errors = "ENABLED"

  # Her address and whether it is confirmed. The client reads no other attribute and writes only
  # the address, so a token carries nothing else.
  read_attributes  = ["email", "email_verified"]
  write_attributes = ["email"]
}

# The website on myemi.app, which signs her in so a payment outside the App Store can reach the
# same account.
resource "aws_cognito_user_pool_client" "website" {
  name         = "${var.project_name}-website"
  user_pool_id = aws_cognito_user_pool.accounts.id

  generate_secret = false

  # The code sent to her address travels in ALLOW_USER_AUTH, and the site signs a woman in that way
  # today. A client that lost this flow would lose that sign in, so it stays beside the two flows
  # the providers need. ALLOW_CUSTOM_AUTH is the flow Sign in with Telegram starts, and a client
  # without it cannot answer a challenge of the pool at all.
  explicit_auth_flows = ["ALLOW_USER_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_CUSTOM_AUTH"]

  # The three ways the site offers. COGNITO is the pool itself, which is the code sent to her
  # address, and the service reads this list as the whole set a client may use: a list without
  # COGNITO takes the code sign in away from the site.
  #
  # Each provider is named through the resource that makes it, so Terraform makes the provider
  # before it offers one. A name written as text here would let an apply offer a way in that the
  # pool does not hold yet, and the person who pressed it would read an error from the service.
  supported_identity_providers = [
    "COGNITO",
    aws_cognito_identity_provider.apple.provider_name,
    aws_cognito_identity_provider.google.provider_name,
  ]

  # The authorization code flow, and no other. The service hands the browser a code, and the
  # browser exchanges it for the tokens. The implicit flow would put a token in the address
  # itself, which keeps it in her history and in the referrer of the next request.
  #
  # The client keeps no secret, because a page of this site keeps nothing a reader cannot read. So
  # the exchange proves it started the sign in with a code challenge, which is the proof key for
  # code exchange.
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true

  # The subject and the address, which is all the account holds. The profile scope would hand over
  # her name, her picture and her language. The aws.cognito.signin.user.admin scope would let a
  # script in her browser write her attributes in the pool.
  allowed_oauth_scopes = ["openid", "email"]

  # Where a provider sends her back to, and where a sign out leaves her. One pair for each language
  # the site serves, because the page she returns to is written in the language she was reading.
  # The service matches a callback address as a whole string, so the slash at the end is part of
  # it: every address of this site carries one.
  callback_urls = [
    "https://${var.domain_name}/en/sign-in/returning/",
    "https://${var.domain_name}/ru/sign-in/returning/",
    "https://${var.domain_name}/es/sign-in/returning/",
  ]

  logout_urls = [
    "https://${var.domain_name}/en/sign-in/",
    "https://${var.domain_name}/ru/sign-in/",
    "https://${var.domain_name}/es/sign-in/",
  ]

  auth_session_validity = 15

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  enable_token_revocation = true

  prevent_user_existence_errors = "ENABLED"

  read_attributes  = ["email", "email_verified"]
  write_attributes = ["email"]
}

output "user_pool_id" {
  description = "Pool the application and the site sign her in to"
  value       = aws_cognito_user_pool.accounts.id
}

output "user_pool_issuer" {
  description = "Address a token of this pool is issued by, and the one its key set hangs under"
  value       = "https://${aws_cognito_user_pool.accounts.endpoint}"
}

output "iphone_client_id" {
  description = "Client identifier the application on her phone signs in with"
  value       = aws_cognito_user_pool_client.iphone.id
}

output "website_client_id" {
  description = "Client identifier myemi.app signs her in with"
  value       = aws_cognito_user_pool_client.website.id
}

# ── The address the pool answers on ──────────────────────────────────────────

locals {
  # Apple and Google were both set up by hand against this one address, and each of them returns
  # to https://auth.myemi.app/oauth2/idpresponse. A pool domain of any other name answers nothing.
  sign_in_domain = "auth.${var.domain_name}"
}

# The certificate the distribution of the pool domain serves. It is asked for in us-east-1 because
# that is the only region CloudFront reads one from, and the module waits for the proof records to
# be read, so nothing can attach a certificate that is still pending.
module "sign_in_certificate" {
  source = "../infrastructure/modules/certificate"

  providers = {
    aws = aws.us_east_1
  }

  domain_name = local.sign_in_domain
  zone_id     = data.aws_route53_zone.sender.zone_id
}

# Amazon Cognito refuses a custom domain whose parent domain resolves to nothing, which it treats
# as a domain being taken over. So myemi.app has to answer an A record before this is made. The
# website writes that record, in the other root, and infra/README.md says so.
resource "aws_cognito_user_pool_domain" "sign_in" {
  domain          = local.sign_in_domain
  user_pool_id    = aws_cognito_user_pool.accounts.id
  certificate_arn = module.sign_in_certificate.certificate_arn
}

# Where auth.myemi.app points. The target is the distribution Amazon Cognito made, in an account of
# its own, so the name and the zone are read back from the domain rather than written here.
resource "aws_route53_record" "sign_in" {
  zone_id = data.aws_route53_zone.sender.zone_id
  name    = local.sign_in_domain
  type    = "A"

  alias {
    name                   = aws_cognito_user_pool_domain.sign_in.cloudfront_distribution
    zone_id                = aws_cognito_user_pool_domain.sign_in.cloudfront_distribution_zone_id
    evaluate_target_health = false
  }
}

# ── The two ways in that Apple and Google hold the keys to ───────────────────

# Each credential is read from the parameter store of this account. Nothing here holds a value, and
# nothing prints one: the provider marks the value of a parameter sensitive, so a plan writes
# (sensitive value) in its place. That matters more than usual, because this repository is public
# and so is every line its pipeline prints.
data "aws_ssm_parameter" "apple_services_id" {
  name = "/${var.project_name}/accounts/apple/services-id"
}

data "aws_ssm_parameter" "apple_team_id" {
  name = "/${var.project_name}/accounts/apple/team-id"
}

data "aws_ssm_parameter" "apple_key_id" {
  name = "/${var.project_name}/accounts/apple/key-id"
}

data "aws_ssm_parameter" "apple_private_key" {
  name = "/${var.project_name}/accounts/apple/private-key"
}

data "aws_ssm_parameter" "google_client_id" {
  name = "/${var.project_name}/accounts/google/client-id"
}

data "aws_ssm_parameter" "google_client_secret" {
  name = "/${var.project_name}/accounts/google/client-secret"
}

# Sign in with Apple. The provider name is the one the service fixes, and it is the name the
# address identity_provider=SignInWithApple carries.
resource "aws_cognito_identity_provider" "apple" {
  user_pool_id  = aws_cognito_user_pool.accounts.id
  provider_name = "SignInWithApple"
  provider_type = "SignInWithApple"

  # The email address and nothing else. Apple also offers a name scope, and Emi does not ask for
  # it: the account holds an address so Emi can write to her, and her name belongs on her phone.
  provider_details = {
    authorize_scopes = "email"
    client_id        = data.aws_ssm_parameter.apple_services_id.value
    team_id          = data.aws_ssm_parameter.apple_team_id.value
    key_id           = data.aws_ssm_parameter.apple_key_id.value
    private_key      = data.aws_ssm_parameter.apple_private_key.value

    # The service fills these in for a provider of this type. A file that leaves them out asks for
    # their removal on every plan, and the service writes them back on every apply, so the next
    # plan finds the same change again.
    authorize_url                 = "https://appleid.apple.com/auth/authorize"
    token_url                     = "https://appleid.apple.com/auth/token"
    oidc_issuer                   = "https://appleid.apple.com"
    token_request_method          = "POST"
    attributes_url_add_attributes = "false"
  }

  # The subject is the one thing Apple returns that stays the same when she hides her address, and
  # the address may be a relay address at privaterelay.appleid.com.
  attribute_mapping = {
    email    = "email"
    username = "sub"
  }

  # No read of the account returns a private key, and this resource holds the details as a plain
  # map with nothing computed in it, so the stored details and the configured details can never
  # agree on this one element. Without this, every later plan proposes the same change forever. A
  # rotation of the key therefore needs the provider replaced, which infra/README.md names.
  lifecycle {
    ignore_changes = [provider_details["private_key"]]
  }
}

# Google.
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.accounts.id
  provider_name = "Google"
  provider_type = "Google"

  # openid carries the subject and email carries the address. The profile scope would hand over her
  # name, her picture and her language, and the account holds none of those.
  provider_details = {
    authorize_scopes = "openid email"
    client_id        = data.aws_ssm_parameter.google_client_id.value
    client_secret    = data.aws_ssm_parameter.google_client_secret.value

    # Filled in by the service for this provider type, for the reason the Apple provider above
    # carries. The address of the attributes ends in an empty field list, and that is the value
    # the service holds.
    attributes_url                = "https://people.googleapis.com/v1/people/me?personFields="
    attributes_url_add_attributes = "true"
    authorize_url                 = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url                     = "https://www.googleapis.com/oauth2/v4/token"
    oidc_issuer                   = "https://accounts.google.com"
    token_request_method          = "POST"
  }

  # A mapped address arrives unverified unless the verification itself is mapped, and Google
  # returns it. The service maps the username onto the subject for this provider type, so the file
  # names it here for the reason the provider details above are named.
  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    username       = "sub"
  }

  # The secret is left out of the comparison for the same reason the Apple key is. A read of this
  # provider returns whatever the service holds for the secret, and a plan that compared the two
  # would print that side of the difference into a public log.
  lifecycle {
    ignore_changes = [provider_details["client_secret"]]
  }
}

output "sign_in_domain" {
  description = "Address the sign in pages answer on, and the address Apple and Google return to"
  value       = aws_cognito_user_pool_domain.sign_in.domain
}
