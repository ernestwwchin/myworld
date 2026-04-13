terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "ernestwwchin-bucket"
    key     = "myworld/terraform.tfstate"
    region  = "ap-southeast-1"
    encrypt = true
    # credentials come from AWS_PROFILE or AWS_ACCESS_KEY_ID env vars
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

# ACM certificates for CloudFront must be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
