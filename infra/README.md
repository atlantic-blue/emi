# The Emi infrastructure

Everything here is applied by the pipeline, on a merge into `main`. Nobody applies it from a
machine. See `.github/workflows/deploy.yml`.

There was one exception, and it was the first apply. It ran on 2026-09-18. The record is below.

One apply can add a resource and the right to add it at the same time. The apply role grants
itself what it needs, and the account reads a policy per request, so the order matters: the user
pool carries a `depends_on` on the role policy for that reason. If a merge still refuses a create
because the grant had not landed yet, run the deploy workflow again on `main`. The second run
reads the policy the first one wrote.

A permission and the resource that needs it can fail together in one apply, because the policy has
not spread yet. So a grant ships alone and first, and the resources follow in a second merge. A
change that adds a resource of a service the roles have never touched is two merges, in that
order.

## What this builds

One DynamoDB table, `emi-vault`, in eu-central-1. It holds ciphertext, a revision and a write
time. It holds no key, no date, no symptom, no flow and no note.

One HTTP api, `emi-vault`, with six routes. It answers at
`https://2pumohtm7l.execute-api.eu-central-1.amazonaws.com`, in eu-central-1.

`https://myemi.app` is the only origin that may call this api from a browser. It is the one
address the site serves from: `https://www.myemi.app` answers a redirect to it. The api allows the
method POST and the header `content-type`, which is the one call the site makes, and it allows no
cookie. It names no star, so a page on any other host reads no answer.

A browser sends a preflight before that call, and the api answers the preflight itself. It answers
before it matches a route, so no authorizer runs for a preflight and no route gives up its
authorizer. The last step of the `functions` job sends that preflight and fails the deploy when the
answer does not allow the site, the method and the header.

Seven functions, on Node 22 and arm64. Three answer the vault: `emi-vault`, `emi-authorizer`
and `emi-articles`. Four carry the sign in with Telegram: `emi-sign-in-telegram` answers a code,
and `emi-sign-in-challenge-define`, `emi-sign-in-challenge-create` and
`emi-sign-in-challenge-verify` are the three triggers of the custom sign in.

Terraform creates each one from a placeholder it holds inline, and then leaves the code alone. The
deployed code is the bundle: the `functions` job of `.github/workflows/deploy.yml` builds one
bundle for each function out of `services/vault/src` and uploads it on a merge into `main`. Each
function carries `ignore_changes` on its file name and its code hash, so an apply never puts a
placeholder back.

The upload order is the authorizer, the articles, the three triggers, the sign in and then the
vault. The triggers go before the function that issues the answer they spend.

A function answers from its placeholder until the first merge reaches it. The vault placeholder and
the article placeholder answer 501. The authorizer placeholder refuses every request. The last step
of that job reads the live api and requires a refusal on every route the authorizer stands in front
of, so a merge that leaves a bundle unloadable fails.

Seven log groups, each with a retention of 30 days.

Two roles of the sign in with Telegram, `emi-sign-in-telegram` and `emi-sign-in-challenge`. The
sign in function runs as the first one. The three triggers share the second. The section on sign in
with Telegram below says what each one reads and what each one deliberately cannot.

One Amazon Cognito user pool, `emi-accounts`, with two app clients: `emi-iphone` and
`emi-website`. The pool names the three triggers of the custom sign in, and both clients allow the
custom flow. The pool is on the Essentials tier, which is the cheapest one that carries the email
one time code. It holds an email address, a subject and the way she signed in. It holds no
vault key, no day and no account identifier.

The pool bills by monthly active user. Ten thousand of those are free each month, and the next one
costs 0.015 United States dollars, so a month in which nobody signs in costs nothing. Read live on
5 November 2026 at https://aws.amazon.com/cognito/pricing/.

Two ways into that pool: `SignInWithApple` and `Google`. Apple is asked for the email address
alone, and Google for the subject and the email address alone. Apple hands over a subject and an
address, which may be a relay address at `privaterelay.appleid.com`. Google hands over a subject,
an address and whether the address is verified. Neither one is asked for a name, a picture or a
profile. Each credential is read from the parameter store and no value is in this repository.

The website client lists both providers, beside `COGNITO`, which is the code sent to her address.
It allows the authorization code flow with the scopes `openid` and `email`, and it keeps no
client secret, so a browser proves the exchange with a code challenge instead. It comes back to
`https://myemi.app/<language>/sign-in/returning/` and signs out to
`https://myemi.app/<language>/sign-in/`, one pair for each language the site serves. A fourth
language on the site needs a fourth pair here, and the infrastructure test refuses the pair that is
missing.

The client on her phone lists no provider. It signs in with the code alone, and the screen that
offers Apple and Google on a phone is work of its own.

One domain on the pool, `auth.myemi.app`, with one certificate for that name in us-east-1 and one
record pointing at it. Apple and Google were both set up by hand against that one address, and
each returns to `https://auth.myemi.app/oauth2/idpresponse`, so no other name works. Amazon
Cognito serves the address from a distribution it makes and manages itself, in an account of its
own, and it carries no charge of ours. The certificate is free.

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

### The credentials Apple, Google and Telegram sign in with

Apple and Google are in this pool. Telegram is not, because it needs a function of its own. Each
one needs a credential that only a person can make, and an apply that reads a parameter nobody
created refuses the whole merge. So each one is read from the parameter store of this account, in
eu-central-1, under these names:

- `/emi/accounts/apple/services-id`, the Services identifier of the Emi application. A string.
- `/emi/accounts/apple/team-id`, the Apple developer team identifier. A string.
- `/emi/accounts/apple/key-id`, the identifier of the sign in key. A string.
- `/emi/accounts/apple/private-key`, the sign in key itself. A secure string.
- `/emi/accounts/google/client-id`, the OAuth client identifier of the Emi web client. A string.
- `/emi/accounts/google/client-secret`, the secret of that client. A secure string.
- `/emi/accounts/telegram/bot-id`, the numeric identifier of the Emi bot. A string.
- `/emi/accounts/telegram/bot-token`, the token BotFather gave for that bot. A secure string.
- `/emi/accounts/telegram/client-secret`, the secret of the Telegram login. A secure string.

A person made all nine by hand. `aws ssm describe-parameters --region eu-central-1` listed the
first eight on 7 November 2026, and the operator wrote the client secret on 8 November 2026. The
Apple private key, the Google secret, the bot token and the client secret are secure strings, held
under `alias/aws/ssm`, which is the key the parameter store makes for this account.

One more name sits under the same prefix: `/emi/accounts/telegram/salt`. Nobody made it, and
nothing in this repository makes it either. The section below says what it is for.

Nothing in this repository holds any of those values, and no log line prints one.

Both pipeline roles now read the six under `/emi/accounts/apple/` and `/emi/accounts/google/`, and
decrypt a secure string only through a parameter store call. Neither role may write a parameter.
The grant reaches the whole `/emi/accounts/` prefix, and the configuration reads no Telegram value
through it. The sign in function reads those three at run time instead.

Two roles. `emi-github-actions-plan` is assumed by a pull request. It can read the account and it
can change nothing. `emi-github-actions` is assumed by a merge into `main`. It is the only thing
that can apply.

### Sign in with Telegram, which is a function and not a provider of the pool

Amazon Cognito calls the userinfo endpoint of an OpenID Connect provider, and Telegram publishes
none. So Telegram cannot be a provider of this pool. A function of Emi answers the code instead,
and the pool turns that answer into tokens through its custom sign in.

The operator did three things by hand, on 8 November 2026. Nothing in this repository can do any
of them.

1. In BotFather, under `@EmiAppBot` and then Login Widget, they switched the bot to the OpenID
   Connect login. The client identifier is the bot identifier, `9068004348`.
2. On the same screen, they registered the return address
   `https://myemi.app/en/sign-in/telegram/` and the trusted origin `https://myemi.app`. Telegram
   processes a login only for an address it holds in advance. One return address serves the site
   and the application, so a new language of the site costs nothing here.
3. They copied the client secret from that screen into
   `/emi/accounts/telegram/client-secret`, as a secure string.

The bot token stays where it is. Nothing in this sign in reads it, and the grants below say so:
the sign in role names its three parameters one by one rather than by prefix.

#### The salt is permanent

The user name of the pool is `tg_` and a keyed hash of the Telegram subject, keyed by a salt of 32
bytes at `/emi/accounts/telegram/salt`. A reader who holds the pool, and who knows which Telegram
account to test for, learns nothing from that name without the salt.

The sign in function makes the salt, on the first sign in that finds it absent. It writes 32 bytes
from the random source of the platform. The write names no overwrite. A function that loses that
race reads the parameter again, and it uses the value that won.

Terraform never creates it, never holds it and never reads it. No data source names it, so the
state at `s3://abs-terraform/emi/terraform.tfstate` does not carry it. The operator never types
it, so it is in no message and no password manager. Reading it takes a deliberate call with the
decryption key, which the role of the sign in function holds and nothing else does.

**The salt is permanent, and that is the whole risk in it.** A salt that changes gives every
Telegram user a new pool user name. Every Telegram account then becomes a new pool user, and the
identity link in the vault names an account she can no longer reach. So no role here carries
`ssm:DeleteParameter`. To read the salt, run the command below under a credential a person holds.
Never replace it.

```
aws ssm get-parameter --name /emi/accounts/telegram/salt --with-decryption --region eu-central-1
```

#### Two roles, and the four functions that assume them

`emi-sign-in-telegram` is the role of the function that answers a Telegram code. It reads the bot
identifier, the client secret and the salt, each named in full. It writes the salt. It writes one
item to `emi-vault`: the digest of a one time answer, the pool user name it belongs to, and the
instant. It creates her user in the pool, and sets a permanent password on the second path the pool
may force, both on `emi-accounts` alone. It carries no delete on any parameter, no read of the bot
token, no read of the table, and no read of a pool user.

`emi-sign-in-challenge` is the role of the three triggers the pool calls: define, create and
verify. It deletes one item from `emi-vault`, which is how the verify trigger spends a one time
answer, and that call returns the item it removed. It holds no parameter at all, so nothing the
pool calls can read the salt or the client secret.

Both roles landed on their own and first, before the functions that assume them. The account reads
a policy per request, so a grant and the resource that needs it can fail together in one apply. The
grant that holds her pool user came with the functions, in one merge rather than two, because
nothing calls it during an apply: the first call is a woman signing in, so that merge costs at most
one refused sign in in the minute after it.

The apply role needed nothing new. `TheTwoFunctions` already makes a function and lets a principal
invoke one. `TheProjectRoles` already makes a role of Emi and hands it to a function.
`TheUserPool` already sets the triggers on the pool. The infrastructure test holds each of those
three as a rule, so a change that narrows one of them fails here rather than in an apply.

#### The pool calls three triggers, and both clients allow the custom flow

The pool names three triggers: `emi-sign-in-challenge-define`, `emi-sign-in-challenge-create` and
`emi-sign-in-challenge-verify`. The define trigger is the state machine. The create trigger issues a
challenge and asks her nothing, because she holds the answer already. The verify trigger spends that
answer once. Each one is named through the resource that makes it, so an apply cannot point the pool
at a function the account does not hold.

Each function carries a policy that lets this pool invoke it, and nothing else. The principal is
`cognito-idp.amazonaws.com`, and the source address is the address of `emi-accounts`. So no other
pool of this account, and no pool of another account, may call a function of Emi.

Both clients list `ALLOW_CUSTOM_AUTH` beside `ALLOW_USER_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`. A
client without the custom flow cannot answer a challenge of the pool at all. Neither client lost a
flow, so the code sent to her address still signs her in.

`sign_in_policy` did not change. A custom challenge is not a first factor of choice based sign in,
so the two factors stay `PASSWORD` and `EMAIL_OTP`.

Sign in with Apple and Sign in with Google are untouched. Amazon Cognito says that federated sign in
invokes no custom authentication trigger, so these three cannot change what a federated sign in
does.

Every grant this needs was already there. The apply role sets the triggers through
`cognito-idp:UpdateUserPool`, and it adds a policy to a function through `lambda:AddPermission`, in
the functions of Emi alone. So no grant landed with this piece.

### One grant is wider than the rule of this repository

Several grants here stand on every resource. Each of the others is a read, or an action the
account evaluates against no resource at all. This one writes, and what it writes on is not in
this account.

Amazon Cognito serves a user pool domain from an Amazon CloudFront distribution that it makes and
manages in an account of its own. It configures that distribution with the permissions of whoever
creates the domain. So the distribution is not in account 230345688874, and a pattern that names
that account can never match it. The documentation gives the statement to copy, with one action
and a resource of `*`. Read on 7 November 2026 at
https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html

The statement is `ConfigureTheDomainDistribution` in `github-oidc.tf`, and it carries
`cloudfront:UpdateDistribution` and nothing else. The cost: this account holds the distributions
of the other Atlantic Blue products and of the Emi website, and a merge of Emi may now change the
configuration of any of them. Nothing in this repository does that. A condition on the calling
service would narrow the grant, the service documents no such key, and nothing here guesses at
one.

### Rotating the Apple key, or the Google secret, needs the provider replaced

Amazon Cognito never returns a private key, and the identity provider holds its details as a plain
map with nothing computed in it. So the stored details and the configured details can never agree
on the key, and every plan would propose the same change forever. The same reasoning covers the
Google secret, and there it also keeps a secret out of a public plan log.

Both elements are therefore left out of the comparison, with `ignore_changes`. Everything else
stays under Terraform: the scopes, the client, the team, the key name and the attribute mapping all
reach the account on a merge.

The cost is that a new key in the parameter store does not reach the account by itself. A rotation
is one command, run through the pipeline by a merge that changes nothing else:

```
terraform -chdir=infra apply -replace=aws_cognito_identity_provider.apple
```

### What the first sign in has to show

No test here can sign a woman in, so three things are only knowable from the first real sign in.

Whether her address arrives verified. Google returns `email_verified` and the mapping carries it.
Each client writes `email` alone, so if the address arrives unverified, the write list of the
client is the first place to look.

Whether Apple delivers to a private relay address. That needs the sender registered in the Apple
developer account, which the section above describes and no test can see.

Whether the sign in pages answer on `auth.myemi.app`. The domain takes its time to spread after the
apply, so a first read can fail on a name that is correct.

### The address the pool answers on needs a record on the parent domain

Amazon Cognito refuses a custom domain whose parent domain resolves to nothing. It reads that as
a hijacked domain. So `myemi.app` must answer an A record before `auth.myemi.app` can be made.

It does. `aws route53 list-resource-record-sets --hosted-zone-id Z06550332F4OHMRD78K` answered an
A record for `myemi.app` aliased to the website distribution on 7 November 2026. The website put
it there, so the sign in address depends on the website staying up.

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
