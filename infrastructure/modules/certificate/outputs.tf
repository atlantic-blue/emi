# The address comes from the wait and not from the certificate itself, so a caller that reads this
# output cannot attach a certificate that is still pending.
output "certificate_arn" {
  description = "Address of the certificate, readable once it is issued"
  value       = aws_acm_certificate_validation.site.certificate_arn
}

output "domain_name" {
  description = "Name the certificate was issued for"
  value       = aws_acm_certificate.site.domain_name
}
