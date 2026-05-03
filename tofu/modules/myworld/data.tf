# Look up shared resources managed by infra-global

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_acm_certificate" "wildcard" {
  provider    = aws.us_east_1
  domain      = "*.ernestwwchin.com"
  statuses    = ["ISSUED"]
  most_recent = true
}
