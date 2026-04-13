output "oidc_provider_arn" {
  description = "GitHub OIDC provider ARN"
  value       = aws_iam_openid_connect_provider.github.arn
}

output "acm_cert_arn" {
  description = "Wildcard ACM certificate ARN"
  value       = aws_acm_certificate.wildcard.arn
}

output "infra_role_arn" {
  description = "Shared infra IAM role ARN"
  value       = aws_iam_role.infra.arn
}

output "acm_validation_records" {
  description = "Add these CNAME records to validate the certificate"
  value = {
    for dvo in aws_acm_certificate.wildcard.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}
