variable "project_name" {
  description = "Name every Emi resource is prefixed with, and the tag every one carries"
  type        = string
  default     = "emi"
}

variable "region" {
  description = "Region the vault runs in. European hosting is part of the promise, so this is not a free choice"
  type        = string
  default     = "eu-central-1"
}

variable "account_id" {
  description = "Amazon Web Services account the vault lives in"
  type        = string
  default     = "230345688874"
}

variable "github_org" {
  description = "Organisation that owns the repository the pipeline runs in"
  type        = string
  default     = "atlantic-blue"
}

variable "github_repo" {
  description = "Repository the pipeline runs in. Only this repository can assume either role"
  type        = string
  default     = "emi"
}

variable "log_retention_days" {
  description = "Days a log line is kept. Nothing about her reaches a log, and what does reach one is thrown away"
  type        = number
  default     = 30
}
