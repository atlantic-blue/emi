# The Emi website infrastructure

This directory holds the Terraform for myemi.app. The vault infrastructure is next door in
`infra/`, with a state of its own, so a change to the site can never move the table her days are
stored in.

The pipeline applies everything here, on a merge into `main`. Nobody applies it from a machine.
See `.github/workflows/deploy.yml`.

## What is here

- `website/` is the root. Its state is at `s3://abs-terraform/emi/website/terraform.tfstate`.
- `modules/certificate` asks for one certificate and waits until it is issued.
- `modules/nextjs-site` serves the site: a bucket, a server function, a distribution and the
  records that point the domain at it.

## What `website/` builds today

One certificate from Amazon Web Services Certificate Manager, for myemi.app and www.myemi.app.
Ownership is proven through the Domain Name System, so the root writes one record for each name
into the myemi.app zone and then waits for the issue to finish.

The certificate is asked for in us-east-1. CloudFront reads a certificate from that region and from
nowhere else, so a site served out of eu-central-1 still keeps its certificate there.

Then the site itself: a bucket for the built files, a server function for the pages, one
distribution in front of both, and the records that point myemi.app and www.myemi.app at it.

OpenNext turns the Next.js build in `apps/website` into those two halves, so the site has two
origins. Both are private. CloudFront signs every request to each with an origin access control,
and the bucket policy and the function policy each name this one distribution, so neither origin
answers the address it has of its own.

Terraform creates the server function with a placeholder that answers 503, and then ignores the
code. The deploy of step 14 of feature 26 puts the real build there, and an apply after that leaves
it alone rather than putting the placeholder back.

A function at the edge does three things on the way in. It sends www to the apex. It sends the root
to the default language. It passes the host she typed to the origin, because the origin request
policy removes the Host header. Its source is TypeScript in `modules/nextjs-site/src`, and the
artifact CloudFront reads is written from it. Write it again after changing the source:

```
node --disable-warning=ExperimentalWarning --experimental-strip-types \
  infrastructure/modules/nextjs-site/src/write.ts
```

A test fails when the artifact is not what the source says, so a stale artifact cannot reach the
account.

## The zone

`Z06550332F4OHMRD78K`, in account 230345688874. The registration made it and the registrar's name
servers point at it. Terraform reads it with a data source and never declares it as a resource.

Account 230345688874 holds the zones of other Atlantic Blue products too, so the role the pipeline
assumes may change a record in that one zone and in no other.

## What it costs when nobody uses it

Nothing. A certificate from Certificate Manager is free, and so are the records that prove
ownership. A distribution, a function, a function url, a bucket and a log group all cost by use, so
a day with no readers costs the price of the bytes already in the bucket and nothing else. No
resource here bills by the hour.
