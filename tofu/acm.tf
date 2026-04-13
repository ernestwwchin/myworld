# Wildcard cert covers *.ernestwwchin.com + ernestwwchin.com
resource "aws_acm_certificate" "game" {
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

# Wait for DNS validation to complete before CloudFront uses the cert
resource "aws_acm_certificate_validation" "game" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.game.arn
}
