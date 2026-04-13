variable "account_id" {
  description = "AWS account ID"
  type        = string
}

variable "domain" {
  description = "Custom domain for CloudFront"
  type        = string
}

variable "cache_ttl" {
  description = "Default cache TTL in seconds"
  type        = number
  default     = 0
}
