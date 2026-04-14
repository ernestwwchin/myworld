terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "myworld-tfstate-${var.account_id}"
    key     = "nonprod/terraform.tfstate"
    region  = "ap-southeast-1"
    encrypt = true
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "myworld-tfstate-${var.account_id}"
    key    = "shared/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

module "myworld" {
  source = "../modules/myworld"

  env                = "nonprod"
  account_id         = var.account_id
  domain             = var.domain
  cache_ttl          = var.cache_ttl
  acm_cert_arn       = data.terraform_remote_state.shared.outputs.acm_cert_arn
  oidc_provider_arn  = data.terraform_remote_state.shared.outputs.oidc_provider_arn
  enable_pr_previews = true
  pr_wildcard_domain = "*.ernestwwchin.com"
}
