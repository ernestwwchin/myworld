resource "aws_s3_bucket" "game" {
  bucket = "myworld-${var.env}-game-${var.account_id}"

  tags = {
    Project     = "myworld"
    Environment = var.env
  }
}

resource "aws_s3_bucket_public_access_block" "game" {
  bucket = aws_s3_bucket.game.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

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
