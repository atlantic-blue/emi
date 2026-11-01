# The Emi website infrastructure

This directory holds the Terraform for myemi.app. The vault infrastructure is next door in
`infra/`, with a state of its own, so a change to the site can never move the table her days are
stored in.

The pipeline applies everything here, on a merge into `main`. Nobody applies it from a machine.
See `.github/workflows/deploy.yml`.

## What is here

- `website/` is the root. Its state is at `s3://abs-terraform/emi/website/terraform.tfstate`.
- `modules/certificate` asks for one certificate and waits until it is issued.

## What `website/` builds today

One certificate from Amazon Web Services Certificate Manager, for myemi.app and www.myemi.app.
Ownership is proven through the Domain Name System, so the root writes one record for each name
into the myemi.app zone and then waits for the issue to finish.

The certificate is asked for in us-east-1. CloudFront reads a certificate from that region and from
nowhere else, so a site served out of eu-central-1 still keeps its certificate there.

The bucket, the distribution and the records that point myemi.app at it arrive with step 4 of
feature 26.

## The zone

`Z06550332F4OHMRD78K`, in account 230345688874. The registration made it and the registrar's name
servers point at it. Terraform reads it with a data source and never declares it as a resource.

Account 230345688874 holds the zones of other Atlantic Blue products too, so the role the pipeline
assumes may change a record in that one zone and in no other.

## What it costs when nobody uses it

Nothing. A certificate from Certificate Manager is free, and so are the records that prove
ownership. No resource here bills by the hour.
