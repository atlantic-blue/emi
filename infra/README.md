# The Emi infrastructure

Everything here is applied by the pipeline, on a merge into `main`. Nobody applies it from a
machine. See `.github/workflows/deploy.yml`.

There is one exception, and it is the first apply. It is below.

## What this builds

One DynamoDB table, `emi-vault`. It holds ciphertext, a revision and a write time. It holds no
key, no date, no symptom, no flow and no note.

One HTTP api, `emi-vault`, with four routes.

Two functions, `emi-vault` and `emi-authorizer`, on Node 22 and arm64. Both ship a placeholder
today. Feature 6 steps 2 and 3 replace them.

Three log groups, each with a retention of 30 days.

Two roles. `emi-github-actions-plan` is assumed by a pull request. It can read the account and it
can change nothing. `emi-github-actions` is assumed by a merge into `main`. It is the only thing
that can apply.

## What it costs when nobody uses it

Almost nothing. The table bills per request, so an idle table pays for storage only. The api and
the functions bill per call. No resource here bills by the hour.

## The bootstrap, which only the operator can run

The two roles do not exist yet, so the pipeline cannot assume either one. Somebody must create
them once, with a credential that can write to this account. Until that happens, both cloud jobs
skip every step and report success, and their logs say they are waiting for this.

Run this once, from the repository root:

```
terraform -chdir=infra init && terraform -chdir=infra apply
```

It writes its state to `s3://abs-terraform/emi/terraform.tfstate`.

Then read the two addresses it printed, and set them as repository variables:

```
gh variable set AWS_PLAN_ROLE_ARN --repo atlantic-blue/emi \
  --body "$(terraform -chdir=infra output -raw plan_role_arn)"
gh variable set AWS_APPLY_ROLE_ARN --repo atlantic-blue/emi \
  --body "$(terraform -chdir=infra output -raw apply_role_arn)"
```

The next pull request that touches `infra/` then gets a plan, and the next merge applies.

## Check the first pipeline run, do not assume it

The role is trusted for one subject only, and GitHub can be configured to write a different
subject into its token. The plain form is what `sava-mix` uses and its merge run assumes
successfully, which is why this configuration uses it. If the first pipeline run reports that it
cannot assume the role, read the subject the token actually carried:

```
aws cloudtrail lookup-events --lookup-attributes \
  AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity --max-results 5
```

Then correct `local.main_subject` and `local.pull_request_subject` in `github-oidc.tf` to what the
token says, in a pull request.
