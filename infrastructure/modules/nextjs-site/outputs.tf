output "bucket_name" {
  description = "Bucket the deploy uploads the static assets of the build into"
  value       = aws_s3_bucket.assets.bucket
}

output "function_name" {
  description = "Server function the deploy updates the code of"
  value       = aws_lambda_function.server.function_name
}

output "distribution_id" {
  description = "Distribution the deploy clears the cache of"
  value       = aws_cloudfront_distribution.site.id
}
