variable "env" {
  description = "Environment name (nonprod or prod)"
  type        = string
}

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

variable "acm_cert_arn" {
  description = "ARN of the shared ACM wildcard certificate"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider"
  type        = string
}

variable "enable_pr_previews" {
  description = "Enable PR preview subdomain routing (nonprod only)"
  type        = bool
  default     = false
}

variable "pr_wildcard_domain" {
  description = "Wildcard domain alias for catching PR preview subdomains (e.g. *.ernestwwchin.com)"
  type        = string
  default     = ""
}
