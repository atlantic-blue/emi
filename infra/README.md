# The Emi infrastructure

Everything here is applied by the pipeline, on a merge into `main`. Nobody applies it from a
machine. See `.github/workflows/deploy.yml`.

There was one exception, and it was the first apply. It ran on 2026-09-18. The record is below.

## What this builds

One DynamoDB table, `emi-vault`, in eu-central-1. It holds ciphertext, a revision and a write
time. It holds no key, no date, no symptom, no flow and no note.

One HTTP api, `emi-vault`, with four routes. It answers at
`https://2pumohtm7l.execute-api.eu-central-1.amazonaws.com`, in eu-central-1.

Two functions, `emi-vault` and `emi-authorizer`, on Node 22 and arm64. Both deployed functions
are the placeholders that `infra/lambda.tf` holds inline. The real handlers exist, in
`services/vault/src`, and they merged with feature 6 steps 2 and 3. No step in the path packages
`services/vault` into either function, so the placeholders are what runs.

Three log groups, each with a retention of 30 days.

Two roles. `emi-github-actions-plan` is assumed by a pull request. It can read the account and it
can change nothing. `emi-github-actions` is assumed by a merge into `main`. It is the only thing
that can apply.

## What it costs when nobody uses it

Almost nothing. The table bills per request, so an idle table pays for storage only. The api and
the functions bill per call. No resource here bills by the hour.

## The bootstrap, which ran on 2026-09-18

The bootstrap is done. It ran once, from a machine, with an account credential, because the
pipeline had no role to assume yet. It added 24 resources and it changed nothing. Nobody runs it
again.

The state is at `s3://abs-terraform/emi/terraform.tfstate`. Terraform 1.10.5 wrote it, which is
the version `.github/workflows/deploy.yml` pins.

The two repository variables hold the two role addresses:

```
AWS_PLAN_ROLE_ARN   arn:aws:iam::230345688874:role/emi-github-actions-plan
AWS_APPLY_ROLE_ARN  arn:aws:iam::230345688874:role/emi-github-actions
```

So a pull request that touches `infra/` gets a plan, and a merge applies.

The api answered on 2026-09-18. `POST /v1/accounts` carries no authorizer. It answered 501, which
is what the vault placeholder answers, so that route reaches its function. `GET /v1/records` and
`DELETE /v1/account` carry the authorizer. Both answered 401, so the authorizer runs and refuses.
It refuses every request, because the placeholder answers `isAuthorized: false` whatever the
request carries. Nothing measured here says anything about a signature.

### Building this account again from nothing

The commands below already ran, on the account above. Read them as a record of what was done. Run
them only against an account that holds none of this yet.

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
