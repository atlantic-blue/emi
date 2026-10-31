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

  statement {
    sid    = "ReadTheWebsiteBucket"
    effect = "Allow"
    actions = [
      "s3:GetBucketAcl",
      "s3:GetBucketCors",
      "s3:GetBucketLogging",
      "s3:GetBucketObjectLockConfiguration",
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

  statement {
    sid    = "ReadTheMyemiZone"
    effect = "Allow"
    actions = [
      "route53:GetHostedZone",
      "route53:ListResourceRecordSets",
    ]
    resources = ["arn:aws:route53:::hostedzone/Z06550332F4OHMRD78K"]
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
  # cloudfront:*.
  statement {
    sid    = "TheDistribution"
    effect = "Allow"
    actions = [
      "cloudfront:CreateDistribution",
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
