# The Emi infrastructure

Everything here is applied by the pipeline, on a merge into `main`. Nobody applies it from a
machine. See `.github/workflows/deploy.yml`.

There was one exception, and it was the first apply. It ran on 2026-09-18. The record is below.

One apply can add a resource and the right to add it at the same time. The apply role grants
itself what it needs, and the account reads a policy per request, so the order matters: the user
pool carries a `depends_on` on the role policy for that reason. If a merge still refuses a create
because the grant had not landed yet, run the deploy workflow again on `main`. The second run
reads the policy the first one wrote.

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

One Amazon Cognito user pool, `emi-accounts`, with two app clients: `emi-iphone` and
`emi-website`. The pool is on the Essentials tier, which is the cheapest one that carries the
email one time code. It holds an email address, a subject and the way she signed in. It holds no
vault key, no day and no account identifier.

The pool bills by monthly active user. Ten thousand of those are free each month, and the next one
costs 0.015 United States dollars, so a month in which nobody signs in costs nothing. Read live on
5 November 2026 at https://aws.amazon.com/cognito/pricing/.

### The email code cannot be delivered yet

The pool allows the email one time code as a first factor. Amazon Cognito sends that code through
Amazon Simple Email Service and through nothing else, so a pool with no sender verified cannot
deliver one. Read on 5 November 2026 at
https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html, where the row for
one time password authentication carries the footnote: requires the Essentials feature plan or
higher and an Amazon Simple Email Service email configuration.

The account holds no sender today. `aws sesv2 list-email-identities --region eu-central-1`
answered one identity on 5 November 2026, `datexpats.com`, whose verification failed and whose
sending is off. So the sign in with a code is configured and it is not usable.

What closes it is step 18 of `docs/design/accounts.md`: a verified `myemi.app` identity in
eu-central-1 with its signing records, and then an `email_configuration` block on the pool that
names it. That is a step of its own, because it writes records into the myemi.app zone and it
carries its own alarms.

### What the next step needs from the operator

Apple, Google and Telegram are not in this pool yet. Each one needs a credential that only a
person can make, and an apply that reads a parameter nobody created refuses the whole merge. So
the next step reads each one from the parameter store of this account, in eu-central-1, under
these names:

- `/emi/accounts/apple/services-id`, the Services identifier of the Emi application. A string.
- `/emi/accounts/apple/team-id`, the Apple developer team identifier. A string.
- `/emi/accounts/apple/key-id`, the identifier of the sign in key. A string.
- `/emi/accounts/apple/private-key`, the sign in key itself. A secure string.
- `/emi/accounts/google/client-id`, the OAuth client identifier of the Emi web client. A string.
- `/emi/accounts/google/client-secret`, the secret of that client. A secure string.
- `/emi/accounts/telegram/bot-id`, the numeric identifier of the Emi bot. A string.
- `/emi/accounts/telegram/bot-token`, the token BotFather gave for that bot. A secure string.

Nothing in this repository holds any of those values, and no log line prints one.

Two roles. `emi-github-actions-plan` is assumed by a pull request. It can read the account and it
can change nothing. `emi-github-actions` is assumed by a merge into `main`. It is the only thing
that can apply.

## What it costs when nobody uses it

Almost nothing. The table bills per request, so an idle table pays for storage only. The api and
the functions bill per call. The user pool bills by monthly active user. No resource here bills by
the hour.

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
