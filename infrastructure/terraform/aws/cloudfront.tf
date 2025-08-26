# S3 Bucket for Frontend Static Files
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = var.frontend_bucket_name

  tags = {
    Name = "chordme-${var.environment}-frontend"
  }
}

resource "aws_s3_bucket_versioning" "frontend_bucket_versioning" {
  bucket = aws_s3_bucket.frontend_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend_bucket_encryption" {
  bucket = aws_s3_bucket.frontend_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "frontend_bucket_pab" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "frontend_oac" {
  name                              = "chordme-${var.environment}-oac"
  description                       = "Origin Access Control for ChordMe Frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend_distribution" {
  origin {
    domain_name              = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend_oac.id
    origin_id                = "S3-${aws_s3_bucket.frontend_bucket.bucket}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = var.cloudfront_distribution_comment
  default_root_object = "index.html"

  # Aliases (if domain is configured)
  aliases = var.domain_name != "" ? [var.domain_name] : []

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend_bucket.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # Separate cache behavior for API calls (proxy to backend)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "ALB-${aws_lb.chordme_alb.dns_name}"
    compress               = true
    viewer_protocol_policy = "https-only"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Custom error page for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  price_class = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL Certificate
  viewer_certificate {
    cloudfront_default_certificate = var.certificate_arn == ""
    acm_certificate_arn            = var.certificate_arn != "" ? var.certificate_arn : null
    ssl_support_method             = var.certificate_arn != "" ? "sni-only" : null
  }

  tags = {
    Name = "chordme-${var.environment}-frontend-distribution"
  }
}

# Backend ALB as CloudFront Origin for API calls
resource "aws_cloudfront_origin_request_policy" "api_origin_request_policy" {
  name    = "chordme-${var.environment}-api-policy"
  comment = "Policy for API requests to backend"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Authorization", "Content-Type", "Accept", "Origin", "Referer"]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# Additional origin for backend API
resource "aws_cloudfront_distribution" "frontend_distribution_with_api" {
  count = var.domain_name != "" ? 1 : 0

  origin {
    domain_name              = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend_oac.id
    origin_id                = "S3-${aws_s3_bucket.frontend_bucket.bucket}"
  }

  origin {
    domain_name = aws_lb.chordme_alb.dns_name
    origin_id   = "ALB-${aws_lb.chordme_alb.dns_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = var.certificate_arn != "" ? "https-only" : "http-only"
      origin_ssl_protocols   = var.certificate_arn != "" ? ["TLSv1.2"] : []
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.cloudfront_distribution_comment} with API"
  default_root_object = "index.html"
  aliases             = [var.domain_name]

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend_bucket.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "ALB-${aws_lb.chordme_alb.dns_name}"

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_origin_request_policy.id
    viewer_protocol_policy   = "https-only"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  price_class = var.environment == "production" ? "PriceClass_All" : "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = var.certificate_arn
    ssl_support_method  = "sni-only"
  }

  tags = {
    Name = "chordme-${var.environment}-full-distribution"
  }
}

# Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "PolicyForCloudFrontPrivateContent"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend_distribution.arn
          }
        }
      }
    ]
  })
}