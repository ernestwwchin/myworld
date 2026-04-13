output "game_url" {
  value = module.myworld.game_url
}

output "cloudfront_url" {
  value = module.myworld.cloudfront_url
}

output "s3_bucket" {
  value = module.myworld.s3_bucket
}

output "deploy_role_arn" {
  value = module.myworld.deploy_role_arn
}
