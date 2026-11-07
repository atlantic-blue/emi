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

  # The pool is made in the same apply that grants the role the right to make it, and the two are
  # otherwise unrelated, so the order is said here. The identity is named for the same reason the
  # other way round: the pool may not carry a sender that does not exist yet.
  #
  # Existing is not the same as verified. The service refuses to send from an identity whose
  # records have not answered, and no Terraform wait can watch the Domain Name System spread. So
  # an account built from nothing sets this in a second apply, which the readme says.
  depends_on = [aws_iam_role_policy.apply, aws_sesv2_email_identity.sender]
}

# The application on her phone. A public client, because an application on a phone keeps no secret.
resource "aws_cognito_user_pool_client" "iphone" {
  name         = "${var.project_name}-iphone"
  user_pool_id = aws_cognito_user_pool.accounts.id

  generate_secret = false

  # Choice based sign in is the only flow a one time code travels in. The refresh keeps her signed
  # in. No password flow is listed, so a client cannot present a password even if one existed.
  explicit_auth_flows = ["ALLOW_USER_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

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

  explicit_auth_flows = ["ALLOW_USER_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

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
