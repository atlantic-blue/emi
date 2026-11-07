# Two roles, and the split is the point of this step. A pull request can read the account and say
# what would change. Only a merge into main can change anything. No long lived key exists on either
# path, because the pipeline assumes a role through OpenID Connect and the token lasts minutes.
#
# The provider is account wide and already exists, so it is looked up rather than created.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  # The subject a GitHub token carries. This account shows two spellings of it.
  #
  # On 2026-09-18 the plan job could not assume its role. CloudTrail in eu-central-1 recorded the
  # subject of that token: repo:atlantic-blue@140661232/emi@1374431048:pull_request. GitHub writes a
  # numeric identifier after the organisation and after the repository.
  #
  # An older role in the same account accepted a token on 2026-08-22. That token carried the plain
  # form repo:atlantic-blue/website:ref:refs/heads/main. Both spellings are real here, so each
  # condition accepts the two. A list under StringEquals means any one value. Each value stays an
  # exact match, so a branch with the name main-something assumes nothing.
  main_subject_by_name = "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main"
  main_subject_by_id   = "repo:${var.github_org}@${var.github_org_id}/${var.github_repo}@${var.github_repo_id}:ref:refs/heads/main"

  pull_request_subject_by_name = "repo:${var.github_org}/${var.github_repo}:pull_request"
  pull_request_subject_by_id   = "repo:${var.github_org}@${var.github_org_id}/${var.github_repo}@${var.github_repo_id}:pull_request"

  state_bucket_arn = "arn:aws:s3:::abs-terraform"
  state_key_arn    = "arn:aws:s3:::abs-terraform/${var.project_name}/*"
}

# ── The role a pull request assumes, which can read and cannot write ──────────

data "aws_iam_policy_document" "plan_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.pull_request_subject_by_name, local.pull_request_subject_by_id]
    }
  }
}

resource "aws_iam_role" "plan" {
  name               = "${var.project_name}-github-actions-plan"
  description        = "Assumed by a pull request to read the account and produce a plan"
  assume_role_policy = data.aws_iam_policy_document.plan_trust.json
}

data "aws_iam_policy_document" "plan" {
  # The plan reads the state and never takes the lock, so it holds nothing an apply needs.
  statement {
    sid       = "ReadTheState"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [local.state_bucket_arn]
  }

  statement {
    sid       = "ReadTheStateObject"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = [local.state_key_arn]
  }

  statement {
    sid    = "DescribeWhatExists"
    effect = "Allow"
    actions = [
      "acm:ListCertificates",
      "apigateway:GET",
      "cloudfront:ListCachePolicies",
      "cloudfront:ListDistributions",
      "cloudfront:ListFunctions",
      "cloudfront:ListOriginAccessControls",
      "cloudfront:ListResponseHeadersPolicies",
      "dynamodb:DescribeContinuousBackups",
      "dynamodb:DescribeTable",
      "dynamodb:DescribeTimeToLive",
      "dynamodb:ListTagsOfResource",
      "iam:GetOpenIDConnectProvider",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListOpenIDConnectProviders",
      "iam:ListRolePolicies",
      "lambda:GetFunction",
      "lambda:GetFunctionCodeSigningConfig",
      "lambda:GetFunctionUrlConfig",
      "lambda:GetPolicy",
      "lambda:ListVersionsByFunction",
      "logs:DescribeLogGroups",
      "logs:ListTagsForResource",
      "route53:GetChange",
      "route53:ListHostedZones",
      "route53:ListHostedZonesByName",
    ]
    resources = ["*"]
  }

  # The website of feature 26. Each statement below is the read of a statement the apply role holds,
  # at the same scope, so a plan sees what a merge would change and can alter none of it.
  statement {
    sid    = "ReadTheWebsiteCertificate"
    effect = "Allow"
    actions = [
      "acm:DescribeCertificate",
      "acm:GetCertificate",
      "acm:ListTagsForCertificate",
    ]
    resources = ["arn:aws:acm:us-east-1:${var.account_id}:certificate/*"]
  }

  statement {
    sid    = "ReadTheDistribution"
    effect = "Allow"
    actions = [
      "cloudfront:DescribeFunction",
      "cloudfront:GetCachePolicy",
      "cloudfront:GetCachePolicyConfig",
      "cloudfront:GetDistribution",
      "cloudfront:GetDistributionConfig",
      "cloudfront:GetFunction",
      "cloudfront:GetOriginAccessControl",
      "cloudfront:GetOriginAccessControlConfig",
      "cloudfront:GetResponseHeadersPolicy",
      "cloudfront:GetResponseHeadersPolicyConfig",
      "cloudfront:ListTagsForResource",
    ]
    resources = [
      "arn:aws:cloudfront::${var.account_id}:distribution/*",
      "arn:aws:cloudfront::${var.account_id}:origin-access-control/*",
      "arn:aws:cloudfront::${var.account_id}:function/*",
      "arn:aws:cloudfront::${var.account_id}:response-headers-policy/*",
      "arn:aws:cloudfront::${var.account_id}:cache-policy/*",
    ]
  }

  # A plan refreshes the bucket by reading every part of it, one call for each part, so a part the
  # list below misses refuses the plan rather than reporting a difference. The ownership control,
  # the acceleration and the notification are the three the site bucket of step 26.4 adds.
  statement {
    sid    = "ReadTheWebsiteBucket"
    effect = "Allow"
    actions = [
      "s3:GetAccelerateConfiguration",
      "s3:GetBucketAcl",
      "s3:GetBucketCors",
      "s3:GetBucketLogging",
      "s3:GetBucketNotification",
      "s3:GetBucketObjectLockConfiguration",
      "s3:GetBucketOwnershipControls",
      "s3:GetBucketPolicy",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetBucketRequestPayment",
      "s3:GetBucketTagging",
      "s3:GetBucketVersioning",
      "s3:GetBucketWebsite",
      "s3:GetEncryptionConfiguration",
      "s3:GetLifecycleConfiguration",
      "s3:GetReplicationConfiguration",
      "s3:ListBucket",
    ]
    resources = ["arn:aws:s3:::emi-website-*"]
  }

  # The tag read belongs to the lookup and not to the records. data "aws_route53_zone" carries a
  # tags attribute, so the provider calls ListTagsForResource on the zone, and a plan without this
  # action is refused before it reads a single record.
  statement {
    sid    = "ReadTheMyemiZone"
    effect = "Allow"
    actions = [
      "route53:GetHostedZone",
      "route53:ListResourceRecordSets",
      "route53:ListTagsForResource",
    ]
    resources = ["arn:aws:route53:::hostedzone/Z06550332F4OHMRD78K"]
  }

  # The pool she signs in to, which is step 28.2. A pool address carries an identifier the service
  # generates, so a pattern cannot say which pool belongs to Emi. This is the read of the apply
  # statement below, at the same scope.
  statement {
    sid    = "ReadTheUserPool"
    effect = "Allow"
    actions = [
      "cognito-idp:DescribeUserPool",
      "cognito-idp:DescribeUserPoolClient",
      "cognito-idp:GetUserPoolMfaConfig",
      "cognito-idp:ListTagsForResource",
    ]
    resources = ["arn:aws:cognito-idp:*:${var.account_id}:userpool/*"]
  }

  # ── The two ways in that carry a key, read at the apply role's scope ───────

  # A provider of the pool is read by the pool it belongs to, so this is the read of the apply
  # statement below, at the same scope.
  statement {
    sid       = "ReadTheIdentityProviders"
    effect    = "Allow"
    actions   = ["cognito-idp:DescribeIdentityProvider"]
    resources = ["arn:aws:cognito-idp:*:${var.account_id}:userpool/*"]
  }

  # A pool domain is read by the address it answers on and never by the pool it belongs to, so this
  # action acts on no resource. A statement that named the pool is refused by the account: on
  # 7 November 2026 `aws iam simulate-custom-policy` answered allowed on every resource and
  # implicitDeny on the pool, for this one action.
  statement {
    sid       = "ReadTheUserPoolDomain"
    effect    = "Allow"
    actions   = ["cognito-idp:DescribeUserPoolDomain"]
    resources = ["*"]
  }

  # Apple and Google each need a credential a person makes by hand, and this repository is public,
  # so the configuration reads all six from the parameter store. A plan reads the same six a merge
  # does: a parameter it cannot read refuses the plan rather than reporting a difference.
  statement {
    sid       = "ReadTheProviderKeys"
    effect    = "Allow"
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/accounts/*"]
  }

  # Two of the six are secure strings under aws/ssm, the key the parameter store makes for this
  # account, whose identifier the service generates. The condition is what narrows this grant: the
  # role may decrypt only through a parameter store call, so it opens nothing the statement above
  # does not already open.
  statement {
    sid       = "DecryptAProviderKey"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["arn:aws:kms:${var.region}:${var.account_id}:key/*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }

  # ── The sender of step 28.8, read at the scope the apply role writes at ────

  # The identity Emi sends from and the configuration set its rates are counted on.
  statement {
    sid    = "ReadTheSender"
    effect = "Allow"
    actions = [
      "ses:GetConfigurationSet",
      "ses:GetConfigurationSetEventDestinations",
      "ses:GetEmailIdentity",
      "ses:ListTagsForResource",
    ]
    resources = [
      "arn:aws:ses:${var.region}:${var.account_id}:identity/${var.domain_name}",
      "arn:aws:ses:${var.region}:${var.account_id}:configuration-set/${var.project_name}",
    ]
  }

  statement {
    sid    = "ReadTheEmailEventTopic"
    effect = "Allow"
    actions = [
      "sns:GetTopicAttributes",
      "sns:ListTagsForResource",
    ]
    resources = ["arn:aws:sns:${var.region}:${var.account_id}:${var.project_name}-*"]
  }

  # A plan reads the tags of an alarm by its address, and reads the alarm itself through the
  # statement below.
  statement {
    sid       = "ReadTheEmailAlarmTags"
    effect    = "Allow"
    actions   = ["cloudwatch:ListTagsForResource"]
    resources = ["arn:aws:cloudwatch:${var.region}:${var.account_id}:alarm:${var.project_name}-*"]
  }

  # The reference for DescribeAlarms says the permission has to stand on every resource, and that
  # a narrower scope returns nothing. This reads the name and the state of every alarm in the
  # account, and it is a read.
  statement {
    sid       = "ReadEveryAlarm"
    effect    = "Allow"
    actions   = ["cloudwatch:DescribeAlarms"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "plan" {
  name   = "${var.project_name}-plan"
  role   = aws_iam_role.plan.id
  policy = data.aws_iam_policy_document.plan.json
}

# ── The role a merge assumes, which is the only thing that can apply ──────────

data "aws_iam_policy_document" "apply_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Equals, not like. A branch whose name begins with main cannot assume this.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.main_subject_by_name, local.main_subject_by_id]
    }
  }
}

resource "aws_iam_role" "apply" {
  name               = "${var.project_name}-github-actions"
  description        = "Assumed by a merge into main to apply the infrastructure"
  assume_role_policy = data.aws_iam_policy_document.apply_trust.json
}

data "aws_iam_policy_document" "apply" {
  statement {
    sid       = "ListTheStateBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [local.state_bucket_arn]
  }

  statement {
    sid    = "ReadAndWriteTheState"
    effect = "Allow"
    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = [local.state_key_arn]
  }

  statement {
    sid       = "TheVaultTable"
    effect    = "Allow"
    actions   = ["dynamodb:*"]
    resources = ["arn:aws:dynamodb:*:${var.account_id}:table/${var.project_name}-*"]
  }

  statement {
    sid       = "TheTwoFunctions"
    effect    = "Allow"
    actions   = ["lambda:*"]
    resources = ["arn:aws:lambda:*:${var.account_id}:function:${var.project_name}-*"]
  }

  # The api gateway actions carry no account or name in the resource, so this is the tightest
  # form the service offers.
  statement {
    sid       = "TheApi"
    effect    = "Allow"
    actions   = ["apigateway:*"]
    resources = ["arn:aws:apigateway:*::/*"]
  }

  statement {
    sid       = "TheLogGroups"
    effect    = "Allow"
    actions   = ["logs:*"]
    resources = ["arn:aws:logs:*:${var.account_id}:log-group:/aws/*/${var.project_name}-*"]
  }

  # Listing the groups takes no resource. The account evaluates logs:DescribeLogGroups against a
  # log group with no name in it, which the denial writes as log-group::log-stream:, so the pattern
  # above can never match and every apply is refused while it reads. The statement above stays
  # scoped, because a write that changes one group still names one.
  statement {
    sid       = "ListTheLogGroups"
    effect    = "Allow"
    actions   = ["logs:DescribeLogGroups"]
    resources = ["*"]
  }

  statement {
    sid    = "TheProjectRoles"
    effect = "Allow"
    actions = [
      "iam:AttachRolePolicy",
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:DetachRolePolicy",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListRolePolicies",
      "iam:PassRole",
      "iam:PutRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:UpdateAssumeRolePolicy",
      "iam:UpdateRoleDescription",
    ]
    resources = ["arn:aws:iam::${var.account_id}:role/${var.project_name}-*"]
  }

  statement {
    sid       = "ReadTheOidcProvider"
    effect    = "Allow"
    actions   = ["iam:GetOpenIDConnectProvider"]
    resources = [data.aws_iam_openid_connect_provider.github.arn]
  }

  # Looking the provider up by address lists first, and listing takes no resource.
  statement {
    sid       = "ListTheOidcProviders"
    effect    = "Allow"
    actions   = ["iam:ListOpenIDConnectProviders"]
    resources = ["*"]
  }

  # ── The website on myemi.app, which the pipeline builds from feature 26 ─────

  # CloudFront reads a certificate from us-east-1 and from nowhere else, so the certificate of a
  # site in eu-central-1 lives there. A certificate address carries a generated identifier, so
  # every certificate of the region is the tightest pattern the service offers.
  statement {
    sid       = "TheWebsiteCertificate"
    effect    = "Allow"
    actions   = ["acm:*"]
    resources = ["arn:aws:acm:us-east-1:${var.account_id}:certificate/*"]
  }

  # Asking for a certificate acts on no certificate, and neither does listing them.
  statement {
    sid    = "AskForACertificate"
    effect = "Allow"
    actions = [
      "acm:ListCertificates",
      "acm:RequestCertificate",
    ]
    resources = ["*"]
  }

  # A CloudFront address carries a generated identifier, so each resource type is named as every
  # one of its kind in this account. Account 230345688874 also holds the distributions of other
  # Atlantic Blue products, which is why the actions are named one by one instead of as
  # cloudfront:*. A distribution asked for with tags is created by CreateDistributionWithTags and
  # never by CreateDistribution, and the website root tags everything it makes, so the role needs
  # both names for the one call.
  statement {
    sid    = "TheDistribution"
    effect = "Allow"
    actions = [
      "cloudfront:CreateDistribution",
      "cloudfront:CreateDistributionWithTags",
      "cloudfront:CreateInvalidation",
      "cloudfront:DeleteCachePolicy",
      "cloudfront:DeleteDistribution",
      "cloudfront:DeleteFunction",
      "cloudfront:DeleteOriginAccessControl",
      "cloudfront:DeleteResponseHeadersPolicy",
      "cloudfront:DescribeFunction",
      "cloudfront:GetCachePolicy",
      "cloudfront:GetCachePolicyConfig",
      "cloudfront:GetDistribution",
      "cloudfront:GetDistributionConfig",
      "cloudfront:GetFunction",
      "cloudfront:GetInvalidation",
      "cloudfront:GetOriginAccessControl",
      "cloudfront:GetOriginAccessControlConfig",
      "cloudfront:GetResponseHeadersPolicy",
      "cloudfront:GetResponseHeadersPolicyConfig",
      "cloudfront:ListTagsForResource",
      "cloudfront:PublishFunction",
      "cloudfront:TagResource",
      "cloudfront:UntagResource",
      "cloudfront:UpdateCachePolicy",
      "cloudfront:UpdateDistribution",
      "cloudfront:UpdateFunction",
      "cloudfront:UpdateOriginAccessControl",
      "cloudfront:UpdateResponseHeadersPolicy",
    ]
    resources = [
      "arn:aws:cloudfront::${var.account_id}:distribution/*",
      "arn:aws:cloudfront::${var.account_id}:origin-access-control/*",
      "arn:aws:cloudfront::${var.account_id}:function/*",
      "arn:aws:cloudfront::${var.account_id}:response-headers-policy/*",
      "arn:aws:cloudfront::${var.account_id}:cache-policy/*",
    ]
  }

  # Making an origin access control, a function or a policy acts on no resource, and neither does
  # listing any of them. The service authorization reference says so for each action here, and the
  # apply of 2026-09-19 died on exactly this shape for the log groups.
  statement {
    sid    = "MakeADistributionPart"
    effect = "Allow"
    actions = [
      "cloudfront:CreateCachePolicy",
      "cloudfront:CreateFunction",
      "cloudfront:CreateOriginAccessControl",
      "cloudfront:CreateResponseHeadersPolicy",
      "cloudfront:ListCachePolicies",
      "cloudfront:ListDistributions",
      "cloudfront:ListFunctions",
      "cloudfront:ListOriginAccessControls",
      "cloudfront:ListResponseHeadersPolicies",
    ]
    resources = ["*"]
  }

  # The bucket the site is served from, and the pages in it. Step 26.4 names it
  # emi-website-<account identifier>.
  statement {
    sid     = "TheWebsiteBucket"
    effect  = "Allow"
    actions = ["s3:*"]
    resources = [
      "arn:aws:s3:::emi-website-*",
      "arn:aws:s3:::emi-website-*/*",
    ]
  }

  # One zone, written out rather than built from a variable, so widening it is one visible token.
  # The registration owns the myemi.app zone and Terraform never creates or destroys it. This
  # account holds the zones of other Atlantic Blue products too, so a pattern here that reached
  # every zone would let a plan of the website delete a record of another site.
  statement {
    sid    = "TheMyemiZone"
    effect = "Allow"
    actions = [
      "route53:ChangeResourceRecordSets",
      "route53:GetHostedZone",
      "route53:ListResourceRecordSets",
      "route53:ListTagsForResource",
    ]
    resources = ["arn:aws:route53:::hostedzone/Z06550332F4OHMRD78K"]
  }

  # Waiting for a record change to spread acts on no zone, and neither does finding one by name.
  statement {
    sid    = "ReadARecordChange"
    effect = "Allow"
    actions = [
      "route53:GetChange",
      "route53:ListHostedZones",
      "route53:ListHostedZonesByName",
    ]
    resources = ["*"]
  }

  # ── The sign in, which is step 28.2 ────────────────────────────────────────

  # A pool address carries an identifier the service generates and never the name, so every pool
  # of this account is the tightest pattern the service offers. The pool itself refuses a delete
  # while its deletion protection is on.
  statement {
    sid    = "TheUserPool"
    effect = "Allow"
    actions = [
      "cognito-idp:CreateUserPoolClient",
      "cognito-idp:DeleteUserPool",
      "cognito-idp:DeleteUserPoolClient",
      "cognito-idp:DescribeUserPool",
      "cognito-idp:DescribeUserPoolClient",
      "cognito-idp:GetUserPoolMfaConfig",
      "cognito-idp:ListTagsForResource",
      "cognito-idp:SetUserPoolMfaConfig",
      "cognito-idp:TagResource",
      "cognito-idp:UntagResource",
      "cognito-idp:UpdateUserPool",
      "cognito-idp:UpdateUserPoolClient",
    ]
    resources = ["arn:aws:cognito-idp:*:${var.account_id}:userpool/*"]
  }

  # Making a pool acts on no pool, so the account reads it against a resource that carries no
  # identifier and the pattern above can never match it.
  statement {
    sid       = "MakeAUserPool"
    effect    = "Allow"
    actions   = ["cognito-idp:CreateUserPool"]
    resources = ["*"]
  }

  # Step 28.10 points the pool at the myemi.app sender, with an email_configuration whose sending
  # account is DEVELOPER. The first time that setting is saved, Amazon Cognito makes a service
  # linked role in this account, and it makes it with the credentials of whoever saved the
  # setting. So the role that applies needs this one action, and the documentation names no other:
  # "The IAM permissions of this session must include the iam:CreateServiceLinkedRole action."
  # Read on 7 November 2026 at
  # https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html
  #
  # The role is AWSServiceRoleForAmazonCognitoIdpEmailService. It carries ses:SendEmail and
  # ses:SendRawEmail, it refuses every ses:List call, and only email.cognito-idp.amazonaws.com may
  # assume it. So the sending permission lives on a role Emi cannot assume and cannot edit, and
  # neither pipeline role is given a send of its own.
  #
  # Two guards, because this action makes a role. The resource names the path of that one service,
  # so no other service linked role can be made through it, and the condition names the service
  # again, which is the form the documentation writes.
  statement {
    sid       = "MakeTheEmailServiceRole"
    effect    = "Allow"
    actions   = ["iam:CreateServiceLinkedRole"]
    resources = ["arn:aws:iam::${var.account_id}:role/aws-service-role/email.cognito-idp.amazonaws.com/*"]

    condition {
      test     = "StringEquals"
      variable = "iam:AWSServiceName"
      values   = ["email.cognito-idp.amazonaws.com"]
    }
  }

  # ── Apple and Google as ways in, and the address the pool answers on ───────

  # A provider belongs to one pool, and a pool address carries an identifier the service generates
  # rather than the name, so every pool of this account is the tightest pattern the service offers.
  # That is the scope the pool grant above already stands at. The cost is the same one: on
  # 7 November 2026 this account held five other pools, of the other Atlantic Blue products, and a
  # merge of Emi may add a provider to any of them.
  statement {
    sid    = "TheIdentityProviders"
    effect = "Allow"
    actions = [
      "cognito-idp:CreateIdentityProvider",
      "cognito-idp:DeleteIdentityProvider",
      "cognito-idp:DescribeIdentityProvider",
      "cognito-idp:UpdateIdentityProvider",
    ]
    resources = ["arn:aws:cognito-idp:*:${var.account_id}:userpool/*"]
  }

  statement {
    sid    = "TheUserPoolDomain"
    effect = "Allow"
    actions = [
      "cognito-idp:CreateUserPoolDomain",
      "cognito-idp:DeleteUserPoolDomain",
      "cognito-idp:UpdateUserPoolDomain",
    ]
    resources = ["arn:aws:cognito-idp:*:${var.account_id}:userpool/*"]
  }

  # Reading a domain names no resource, which the plan policy says more about.
  statement {
    sid       = "ReadTheUserPoolDomain"
    effect    = "Allow"
    actions   = ["cognito-idp:DescribeUserPoolDomain"]
    resources = ["*"]
  }

  # The one grant here that is wider than the rule of this repository, and it is wider because the
  # service asks for it in those words. A pool domain is served by a CloudFront distribution that
  # Amazon Cognito makes and manages in an account of its own, and Amazon Cognito configures that
  # distribution with the permissions of whoever creates the domain. So the distribution this
  # action is used on is not in account 230345688874, and a pattern naming that account can never
  # match it.
  #
  # The documentation gives the statement to copy, with a resource of "*" and this one action.
  # Read on 7 November 2026 at
  # https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html
  #
  # The cost: account 230345688874 holds the distributions of the other Atlantic Blue products and
  # of the Emi website, and a merge of Emi may now change the configuration of any of them. Nothing
  # in this repository does that, and nothing narrows it either. A condition on the calling service
  # would narrow it, and the service documents no such key, so it is not guessed at here.
  statement {
    sid       = "ConfigureTheDomainDistribution"
    effect    = "Allow"
    actions   = ["cloudfront:UpdateDistribution"]
    resources = ["*"]
  }

  # The six credentials, read at the scope the plan role reads them at and with the same condition
  # on the key. A merge reads them and writes none of them: no statement here carries
  # ssm:PutParameter.
  statement {
    sid       = "ReadTheProviderKeys"
    effect    = "Allow"
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${var.region}:${var.account_id}:parameter/${var.project_name}/accounts/*"]
  }

  statement {
    sid       = "DecryptAProviderKey"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["arn:aws:kms:${var.region}:${var.account_id}:key/*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }

  # ── The sender, which is step 28.8 ─────────────────────────────────────────

  # The identity Emi sends from, its signing, its envelope sender domain, and the configuration
  # set its bounce and complaint rates are counted on. Both resources carry a name Emi chose
  # rather than a generated identifier, so each one is named in full and no pattern here reaches
  # the identity of another product in this account.
  #
  # The records this step writes into the myemi.app zone need no new grant of their own. The
  # TheMyemiZone statement above already allows route53:ChangeResourceRecordSets on that one zone
  # and on nothing else.
  statement {
    sid    = "TheSender"
    effect = "Allow"
    actions = [
      "ses:CreateConfigurationSet",
      "ses:CreateConfigurationSetEventDestination",
      "ses:CreateEmailIdentity",
      "ses:DeleteConfigurationSet",
      "ses:DeleteConfigurationSetEventDestination",
      "ses:DeleteEmailIdentity",
      "ses:GetConfigurationSet",
      "ses:GetConfigurationSetEventDestinations",
      "ses:GetEmailIdentity",
      "ses:ListTagsForResource",
      "ses:PutConfigurationSetReputationOptions",
      "ses:PutEmailIdentityConfigurationSetAttributes",
      "ses:PutEmailIdentityDkimSigningAttributes",
      "ses:PutEmailIdentityMailFromAttributes",
      "ses:TagResource",
      "ses:UntagResource",
      "ses:UpdateConfigurationSetEventDestination",
    ]
    resources = [
      "arn:aws:ses:${var.region}:${var.account_id}:identity/${var.domain_name}",
      "arn:aws:ses:${var.region}:${var.account_id}:configuration-set/${var.project_name}",
    ]
  }

  # The topic the bounce and the complaint arrive on. A topic address is its name, so the prefix
  # reaches the topics of Emi and no other product. The policy that lets the mail service publish
  # to it is written with sns:SetTopicAttributes.
  statement {
    sid    = "TheEmailEventTopic"
    effect = "Allow"
    actions = [
      "sns:CreateTopic",
      "sns:DeleteTopic",
      "sns:GetTopicAttributes",
      "sns:ListTagsForResource",
      "sns:SetTopicAttributes",
      "sns:TagResource",
      "sns:UntagResource",
    ]
    resources = ["arn:aws:sns:${var.region}:${var.account_id}:${var.project_name}-*"]
  }

  # The two reputation alarms. An alarm address carries its name, so the prefix names the alarms
  # of Emi alone.
  statement {
    sid    = "TheEmailAlarms"
    effect = "Allow"
    actions = [
      "cloudwatch:DeleteAlarms",
      "cloudwatch:ListTagsForResource",
      "cloudwatch:PutMetricAlarm",
      "cloudwatch:TagResource",
      "cloudwatch:UntagResource",
    ]
    resources = ["arn:aws:cloudwatch:${var.region}:${var.account_id}:alarm:${var.project_name}-*"]
  }

  # Reading an alarm is the one read here that names no resource. The reference for DescribeAlarms
  # says the permission has to stand on every resource, and that a narrower scope returns nothing,
  # so this grant reads the name and the state of every alarm in the account. It writes nothing,
  # and the write above stays scoped to the alarms of Emi.
  statement {
    sid       = "ReadEveryAlarm"
    effect    = "Allow"
    actions   = ["cloudwatch:DescribeAlarms"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "apply" {
  name   = "${var.project_name}-terraform"
  role   = aws_iam_role.apply.id
  policy = data.aws_iam_policy_document.apply.json
}

output "plan_role_arn" {
  description = "Set this as the repository variable AWS_PLAN_ROLE_ARN"
  value       = aws_iam_role.plan.arn
}

output "apply_role_arn" {
  description = "Set this as the repository variable AWS_APPLY_ROLE_ARN"
  value       = aws_iam_role.apply.arn
}
