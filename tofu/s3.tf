# Dedicated bucket for the game
resource "aws_s3_bucket" "game" {
  bucket = var.bucket_name

  tags = {
    Project = "myworld"
  }
}

# Block all public access — CloudFront OAC handles access
resource "aws_s3_bucket_public_access_block" "game" {
  bucket = aws_s3_bucket.game.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

# Allow CloudFront OAC to read from the bucket
resource "aws_s3_bucket_policy" "game" {
  bucket     = aws_s3_bucket.game.id
  depends_on = [aws_s3_bucket_public_access_block.game]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.game.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.game.arn
          }
        }
      }
    ]
  })
}
