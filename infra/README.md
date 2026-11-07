# The Emi infrastructure

Everything here is applied by the pipeline, on a merge into `main`. Nobody applies it from a
machine. See `.github/workflows/deploy.yml`.

There was one exception, and it was the first apply. It ran on 2026-09-18. The record is below.

One apply can add a resource and the right to add it at the same time. The apply role grants
itself what it needs, and the account reads a policy per request, so the order matters: the user
pool carries a `depends_on` on the role policy for that reason. If a merge still refuses a create
because the grant had not landed yet, run the deploy workflow again on `main`. The second run
reads the policy the first one wrote.

The sender does not rely on that. Pull request 515 changed the apply role and made the user pool
in one apply, the create ran one second after the policy change, and the account refused it. So
the grants the sender needs merged on their own first, in step 28.7, and this step adds the
resources on top of a grant that is already active. A step that adds a resource of a service the
roles have never touched is two merges, in that order.

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

One sender, `myemi.app`, verified in eu-central-1 as an email identity. The service holds the
signing key and rotates it, so no key of Emi is written anywhere. The envelope sender is
`mail.myemi.app`, so a bounce returns to Emi and the policy check reads a domain of Emi.

One address under it, `no-reply@myemi.app`, shown as Emi. A woman reads `Emi
<no-reply@myemi.app>` in the from line. The domain identity covers every address under it, so the
address needs no identity of its own. Nothing receives mail there: a reply is lost, and the
messages carry the account screen as the way to answer. Receiving mail for an address a person
writes to is a step of its own.

Seven records in the myemi.app zone carry it: three names that hold the signature, one mail
exchange record for the envelope sender, one Sender Policy Framework record for the envelope
sender, one more for the domain itself, and one Domain based Message Authentication record at
`_dmarc.myemi.app`. That last policy is `p=none` and it names no reporting address, because
myemi.app receives no mail yet. The identity stays unverified, and sends nothing, until the
records spread.

One configuration set, `emi`, which is the default of the identity. Every message is counted on
it, so the bounce and complaint rates of Emi are visible apart from the other product of this
account. Reputation belongs to the account and the region, so a complaint rate earned elsewhere in
this account can still pause Emi.

One topic, `emi-email-outcomes`. The configuration set publishes a bounce and a complaint to it,
and its policy lets the mail service publish for this configuration set alone. Nothing subscribes
to it yet. The function that writes the outcome onto the account item is a later step, so until
then an event arrives and is dropped.

Two alarms on that configuration set: `emi-email-bounce-rate` at 5 percent and
`emi-email-complaint-rate` at 0.1 percent. The service recommends staying under those rates and
may pause an account above 10 percent and 0.5 percent, so each alarm sits at half the rate that
hurts.

Neither alarm carries an action, and that is deliberate. There is no topic a person reads and no
address to raise, so the alarm state is the whole signal. Read it in the CloudWatch console, or
with `aws cloudwatch describe-alarms --alarm-name-prefix emi-email --region eu-central-1`. A later
step can give both alarms an action once there is somewhere to send one.

The mail carries no monthly fee and costs 0.10 United States dollars for each 1,000 messages, so a
month in which Emi sends nothing costs nothing for it. The zone already exists for the website, so
the records add nothing to that.

### The email code leaves from Emi

The pool allows the email one time code as a first factor. Amazon Cognito sends that code through
Amazon Simple Email Service and through nothing else. Read on 5 November 2026 at
https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html, where the row for
one time password authentication carries the footnote: requires the Essentials feature plan or
higher and an Amazon Simple Email Service email configuration.

The pool now carries that configuration. Its sending account is `DEVELOPER`, which means the pool
calls the mail service in this account rather than borrowing an address of the service. The source
is the `myemi.app` identity, the from address is `Emi <no-reply@myemi.app>`, and every message is
counted on the `emi` configuration set, so a bounced code reaches the same two alarms as any other
message. The daily limit is the limit of the account, not the 50 messages the service lends a pool.

Saving that setting makes a service linked role,
`AWSServiceRoleForAmazonCognitoIdpEmailService`, the first time it is saved. The role carries the
send, it refuses every `ses:List` call, and only `email.cognito-idp.amazonaws.com` may assume it,
so no role of Emi holds a way to write as Emi. The grant that lets a merge make it is in
`github-oidc.tf`, and it landed in a merge of its own.

The identity was ready before this landed. On 7 November 2026 `aws sesv2 get-email-identity
--email-identity myemi.app --region eu-central-1` answered `VerifiedForSendingStatus` true,
`DkimAttributes.Status` SUCCESS, signing enabled, `MailFromDomain` `mail.myemi.app` with a status
of SUCCESS, and a default configuration set of `emi`.

Existing is not the same as verified, and that matters for a rebuild. The pool is ordered after the
identity, so an apply never names a sender that does not exist. It cannot wait for the Domain Name
System to spread, and the service refuses to send from an identity whose records have not answered
yet. So an account built from nothing takes a second apply: run the deploy workflow again on `main`
once the records answer.

One identity in this region belongs to another product. `aws sesv2 list-email-identities --region
eu-central-1` answered `datexpats.com` on 5 November 2026, whose verification failed and whose
sending is off. Nothing here touches it.

### Register the sender with Apple, which no test can see

Apple delivers to a private relay address only mail from a sender it knows. A woman who signs in
with Apple and hides her address has an address at `privaterelay.appleid.com`, and Apple refuses
mail from a domain or an address it does not hold. A sender nobody registered bounces silently for
every Apple user.

So a person opens the Apple developer account and registers the sender by hand, under
Certificates, Identifiers and Profiles, then Sign in with Apple, then email sources:

1. Add the domain `myemi.app`, and let Apple verify it.
2. Add the address `no-reply@myemi.app`, which is the one address Emi sends from.

Apple then matches a message against those entries by the Sender Policy Framework record of the
visible sender and by the signature, and the records above carry both.

Nothing in this repository can read the Apple developer account, so no test says whether this is
done. The proof is one message sent to a relay address and seen to arrive, and the design asks for
that before the feature ships. This was read from secondary sources and not measured: Apple's own
page is drawn by a script and could not be read.

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
the functions bill per call. The user pool bills by monthly active user. The sender bills by
message, the topic bills by message, and an alarm costs nothing while it is one metric alarm. No
resource here bills by the hour.

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
