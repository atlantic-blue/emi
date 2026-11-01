output "certificate_arn" {
  description = "Address of the certificate the distribution of step 4 attaches, readable once it is issued"
  value       = module.certificate.certificate_arn
}

output "zone_id" {
  description = "Zone the records for the site are written into"
  value       = data.aws_route53_zone.site.zone_id
}

output "bucket_name" {
  description = "Bucket the deploy uploads the static assets of the build into"
  value       = module.site.bucket_name
}

output "function_name" {
  description = "Server function the deploy updates the code of"
  value       = module.site.function_name
}

output "distribution_id" {
  description = "Distribution the deploy clears the cache of"
  value       = module.site.distribution_id
}
