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
      "apigateway:GET",
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
    ]
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
