# The website on myemi.app. Its state and its plan sit apart from the vault in `infra/`, so a
# change to the site can never move the table her days are stored in.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # The state sits beside every other Atlantic Blue state, under a key of the website's own.
  # Native locking in Simple Storage Service keeps a lock table off the bill.
  backend "s3" {
    bucket       = "abs-terraform"
    key          = "emi/website/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

# No profile and no static credentials. The pipeline arrives holding a role it assumed through
# OpenID Connect, and the default chain finds it.
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}

# CloudFront reads a certificate from us-east-1 and from nowhere else, so the certificate of a
# site served out of eu-central-1 is asked for through this alias.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}

# The registration made this zone and the registrar's name servers point at it, so Terraform reads
# it. A zone declared here would be a second zone nothing points at, and every address under
# myemi.app would stop answering.
data "aws_route53_zone" "site" {
  zone_id = var.zone_id

  # The pipeline may change a record in this one zone, named by its identifier in the role policy.
  # A lookup that read some other zone would be refused by the account with no explanation, so the
  # mismatch is named here instead.
  lifecycle {
    postcondition {
      condition     = self.name == var.domain_name
      error_message = "the zone read is not the zone for ${var.domain_name}"
    }
  }
}

module "certificate" {
  source = "../modules/certificate"

  providers = {
    aws = aws.us_east_1
  }

  domain_name = var.domain_name
  other_names = ["www.${var.domain_name}"]
  zone_id     = data.aws_route53_zone.site.zone_id
}
