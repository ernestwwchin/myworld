output "cloudfront_url" {
  description = "Game URL"
  value       = "https://${aws_cloudfront_distribution.game.domain_name}/"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (needed for cache invalidation)"
  value       = aws_cloudfront_distribution.game.id
}

output "s3_upload_path" {
  description = "S3 path to upload game files to"
  value       = "s3://${aws_s3_bucket.game.bucket}/"
}

output "deploy_role_arn" {
  description = "IAM role ARN to assume for deployments"
  value       = aws_iam_role.deploy.arn
}

output "acm_validation_records" {
  description = "Add these CNAME records in GoDaddy to validate the certificate"
  value = {
    for dvo in aws_acm_certificate.game.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}
