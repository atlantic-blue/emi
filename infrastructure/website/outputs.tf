output "certificate_arn" {
  description = "Address of the certificate the distribution of step 4 attaches, readable once it is issued"
  value       = module.certificate.certificate_arn
}

output "zone_id" {
  description = "Zone the records for the site are written into"
  value       = data.aws_route53_zone.site.zone_id
}
