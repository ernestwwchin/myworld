resource "aws_cloudfront_origin_access_control" "game" {
  name                              = "myworld-${var.env}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "pr_routing" {
  count   = var.enable_pr_previews ? 1 : 0
  name    = "myworld-${var.env}-pr-routing"
  runtime = "cloudfront-js-2.0"
  code    = file("${path.module}/cf-function-pr-routing.js")
}

resource "aws_cloudfront_distribution" "game" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "myworld ${var.env}"

  origin {
    domain_name              = aws_s3_bucket.game.bucket_regional_domain_name
    origin_id                = "s3-myworld"
    origin_path              = ""
    origin_access_control_id = aws_cloudfront_origin_access_control.game.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-myworld"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = var.cache_ttl
    max_ttl     = var.cache_ttl

    dynamic "function_association" {
      for_each = var.enable_pr_previews ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.pr_routing[0].arn
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  aliases = var.enable_pr_previews && var.pr_wildcard_domain != "" ? [var.domain, var.pr_wildcard_domain] : [var.domain]

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.wildcard.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Project     = "myworld"
    Environment = var.env
  }
}
