# One certificate for a site, proven through the Domain Name System.
#
# The caller passes the provider. CloudFront reads a certificate from us-east-1 and from nowhere
# else, so a site served out of eu-central-1 still keeps its certificate there.
#
# The zone is passed in and never declared here. The registration owns it, and a zone Terraform
# made would be a second zone the registrar does not point at.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_acm_certificate" "site" {
  domain_name               = var.domain_name
  subject_alternative_names = var.other_names
  validation_method         = "DNS"

  # A distribution holds the certificate it serves, so the replacement exists before the old one
  # goes and the site never answers without one.
  lifecycle {
    create_before_destroy = true
  }
}

# Certificate Manager returns one proof of ownership for each name, and which record carries a
# proof is not known until the certificate exists. A for_each key has to be known before the plan
# runs, so the loop walks the names the module was given and reads each name's proof out of the map
# below. Keying it on the records refused every first plan.
locals {
  proof = {
    for option in aws_acm_certificate.site.domain_validation_options :
    option.domain_name => option
  }
}

resource "aws_route53_record" "validation" {
  for_each = toset(concat([var.domain_name], var.other_names))

  zone_id = var.zone_id
  name    = local.proof[each.value].resource_record_name
  type    = local.proof[each.value].resource_record_type
  records = [local.proof[each.value].resource_record_value]
  ttl     = 60

  # The value is one Certificate Manager chose, so a record left behind by an earlier certificate
  # is replaced rather than turned into an error nobody can clear without reaching the console.
  allow_overwrite = true
}

# Certificate Manager issues the certificate once it reads the records. Nothing may hold a
# certificate before then, because a distribution given a pending one serves nothing, so the wait
# lives here and every caller gets it.
resource "aws_acm_certificate_validation" "site" {
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
