# IAM role for deploying game files from GitHub Actions (per-env)
resource "aws_iam_role" "deploy" {
  name = "myworld-${var.env}-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GitHubActionsOIDC"
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:ernestwwchin/myworld:environment:${var.env}"
          }
        }
      }
    ]
  })

  tags = {
    Project     = "myworld"
    Environment = var.env
  }
}

resource "aws_iam_role_policy" "deploy" {
  name = "myworld-${var.env}-deploy-policy"
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
        Sid    = "CloudFrontDeploy"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:ListDistributions"
        ]
        Resource = "*"
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
