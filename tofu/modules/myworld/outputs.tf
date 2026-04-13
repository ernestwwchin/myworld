output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.game.domain_name}/"
}

output "game_url" {
  value = "https://${var.domain}/"
}

output "s3_bucket" {
  value = aws_s3_bucket.game.bucket
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}
