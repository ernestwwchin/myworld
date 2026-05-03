terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "myworld-tfstate-${var.account_id}"
    key     = "prod/terraform.tfstate"
    region  = "ap-southeast-1"
    encrypt = true
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "myworld" {
  source = "../modules/myworld"

  env        = "prod"
  account_id = var.account_id
  domain     = var.domain
  cache_ttl  = var.cache_ttl

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}
