variable "domain_name" {
  description = "Name the certificate is issued for, which is the address a person types"
  type        = string
}

variable "other_names" {
  description = "Every other name the same certificate must answer for"
  type        = list(string)
  default     = []
}

variable "zone_id" {
  description = "Zone the records proving ownership are written into. The registration owns it, so this module reads it and never creates it"
  type        = string
}
