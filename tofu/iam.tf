# GitHub OIDC provider — allows GitHub Actions to get AWS credentials without stored keys
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# IAM role for deploying game files from GitHub Actions
resource "aws_iam_role" "deploy" {
  name = "myworld-deploy"

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
            "token.actions.githubusercontent.com:sub" = "repo:ernestwwchin/myworld:ref:refs/heads/main"
          }
        }
      }
    ]
  })

  tags = {
    Project = "myworld"
  }
}

resource "aws_iam_role_policy" "deploy" {
  name = "myworld-deploy-policy"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Deploy"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.game.arn,
          "${aws_s3_bucket.game.arn}/*"
        ]
      },
      {
        Sid      = "CloudFrontInvalidate"
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = aws_cloudfront_distribution.game.arn
      }
    ]
  })
}

# Used to get current account ID
data "aws_caller_identity" "current" {}
