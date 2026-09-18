terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # The state sits beside every other Atlantic Blue state, under a key of Emi's own. Native
  # locking in Simple Storage Service keeps a lock table off the bill.
  backend "s3" {
    bucket       = "abs-terraform"
    key          = "emi/terraform.tfstate"
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
