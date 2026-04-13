# GitHub OIDC provider — shared across all environments
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Wildcard cert covers *.ernestwwchin.com — shared across all environments
resource "aws_acm_certificate" "wildcard" {
  provider                  = aws.us_east_1
  domain_name               = "*.ernestwwchin.com"
  subject_alternative_names = ["ernestwwchin.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Project = "myworld"
  }
}

resource "aws_acm_certificate_validation" "wildcard" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.wildcard.arn
}

data "aws_caller_identity" "current" {}

# Single infra role for all tofu operations (shared + nonprod + prod)
resource "aws_iam_role" "infra" {
  name = "myworld-infra"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GitHubActionsOIDC"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:ernestwwchin/myworld:*"
          }
        }
      }
    ]
  })

  tags = {
    Project = "myworld"
  }
}

resource "aws_iam_role_policy" "infra" {
  name = "myworld-infra-policy"
  role = aws_iam_role.infra.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TofuStateAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::myworld-tfstate-${var.account_id}",
          "arn:aws:s3:::myworld-tfstate-${var.account_id}/*"
        ]
      },
      {
        Sid    = "S3Management"
        Effect = "Allow"
        Action = [
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:Get*",
          "s3:Put*",
          "s3:List*"
        ]
        Resource = [
          "arn:aws:s3:::myworld-*-game-${var.account_id}",
          "arn:aws:s3:::myworld-*-game-${var.account_id}/*"
        ]
      },
      {
        Sid    = "CloudFrontManagement"
        Effect = "Allow"
        Action = ["cloudfront:*"]
        Resource = "*"
      },
      {
        Sid    = "ACMManagement"
        Effect = "Allow"
        Action = ["acm:*"]
        Resource = "*"
      },
      {
        Sid    = "IAMManagement"
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:GetOpenIDConnectProvider",
          "iam:CreateOpenIDConnectProvider",
          "iam:DeleteOpenIDConnectProvider",
          "iam:TagOpenIDConnectProvider"
        ]
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/myworld-*",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
        ]
      },
      {
        Sid      = "STSGetCallerIdentity"
        Effect   = "Allow"
        Action   = "sts:GetCallerIdentity"
        Resource = "*"
      }
    ]
  })
}
