variable "project_name" {
  description = "Name every Emi resource is prefixed with"
  type        = string
  default     = "emi"
}

variable "domain_name" {
  description = "Address a person types to reach Emi, which is the apex the site answers on"
  type        = string
}

variable "other_names" {
  description = "Every other name the distribution answers for. Each one redirects to domain_name"
  type        = list(string)
  default     = []
}

variable "certificate_arn" {
  description = "Address of the issued certificate. CloudFront reads one from us-east-1 and from nowhere else, so the caller asks for it there"
  type        = string
}

variable "zone_id" {
  description = "Zone the records for the site are written into. The registration owns it, so this module reads it and never creates it"
  type        = string
}

variable "account_id" {
  description = "Account the site is served from, which the bucket name carries because a bucket name is global"
  type        = string
}
