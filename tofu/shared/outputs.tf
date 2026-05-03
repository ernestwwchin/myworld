output "oidc_provider_arn" {
  description = "GitHub OIDC provider ARN"
  value       = aws_iam_openid_connect_provider.github.arn
}

output "acm_cert_arn" {
  description = "Wildcard ACM certificate ARN"
  value       = data.aws_acm_certificate.wildcard.arn
}

output "infra_role_arn" {
  description = "Shared infra IAM role ARN"
  value       = aws_iam_role.infra.arn
}
