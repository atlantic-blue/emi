variable "project_name" {
  description = "Name every Emi resource is prefixed with, and the tag every one carries"
  type        = string
  default     = "emi"
}

variable "region" {
  description = "Region the site is served from. European hosting is part of the promise, so this is not a free choice"
  type        = string
  default     = "eu-central-1"
}

variable "domain_name" {
  description = "Address a person types to reach Emi"
  type        = string
  default     = "myemi.app"
}

variable "zone_id" {
  description = "Zone the registration made for the domain. Terraform reads it and never creates it, and the pipeline may change a record in this zone and no other"
  type        = string
  default     = "Z06550332F4OHMRD78K"
}
