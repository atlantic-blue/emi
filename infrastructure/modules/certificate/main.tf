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

# One record for each name on the certificate. Two names that prove ownership through the same
# record collapse into one entry, because the map is keyed by the record and not by the name.
resource "aws_route53_record" "validation" {
  for_each = {
    for option in aws_acm_certificate.site.domain_validation_options :
    option.resource_record_name => {
      type  = option.resource_record_type
      value = option.resource_record_value
    }
  }

  zone_id = var.zone_id
  name    = each.key
  type    = each.value.type
  records = [each.value.value]
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
