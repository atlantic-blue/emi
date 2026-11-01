# The serving shape of a Next.js application on myemi.app.
#
# OpenNext turns a Next.js build into two things: a server function, and a folder of static assets.
# So the site has two origins. Pages come from a Lambda function behind a function url, and the
# files under /_next/static and the public files come from a bucket. Both are private, and
# CloudFront signs every request to each with an origin access control, so neither answers anybody
# who finds its own address.
#
# Nothing here bills while nobody uses Emi. A distribution, a function, a function url, a bucket
# and a log group all cost by use.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

locals {
  bucket_name   = "${var.project_name}-website-${var.account_id}"
  function_name = "${var.project_name}-website-server"

  # Managed-AllViewerExceptHostHeader. It forwards every viewer header to the origin except Host,
  # which a function url refuses to answer a foreign Host for. The identifier is written out
  # because reading the policy by name costs both pipeline roles a grant, for a value AWS
  # publishes and never changes.
  all_viewer_except_host = "b689b0a8-53d0-40ab-baf2-68738e2966ac"

  # Managed-CachingOptimized. OpenNext writes the asset files under a hashed name and asks for a
  # year of cache, so the edge keeps them and the bucket is read once.
  caching_optimized = "658327ea-f89d-4fab-a63d-7e88639e58f6"

  # The paths OpenNext writes into the bucket. Everything else is a page, and a page is rendered.
  asset_paths = ["/_next/static/*", "/favicon.ico", "/robots.txt", "/sitemap.xml"]
}

# ── The assets, in a bucket only the distribution reads ──────────────────────

resource "aws_s3_bucket" "assets" {
  bucket = local.bucket_name
}

# Four flags, because any one of them left off is a bucket somebody can read around the
# distribution, and a door the headers of SITE-6 do not reach.
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# No access control list can be written at all, so the only thing that says who reads this bucket
# is the policy below.
resource "aws_s3_bucket_ownership_controls" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# One reader, named by the distribution it is. The condition is what makes it one distribution
# rather than every distribution in every account that asks.
data "aws_iam_policy_document" "assets" {
  statement {
    sid       = "ReadFromThisDistributionAlone"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.assets.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id
  policy = data.aws_iam_policy_document.assets.json

  # The policy names the distribution, and the public access block refuses a policy that would
  # open the bucket, so the block goes on first.
  depends_on = [aws_s3_bucket_public_access_block.assets]
}

# ── The server function, reachable only through the distribution ─────────────

data "aws_iam_policy_document" "server_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "server" {
  name               = local.function_name
  assume_role_policy = data.aws_iam_policy_document.server_trust.json
}

# The function renders pages and reads nothing of hers. It writes its own log lines and holds no
# other permission, so a fault in the site cannot reach the vault her days are kept in.
data "aws_iam_policy_document" "server" {
  statement {
    sid    = "WriteItsOwnLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.server.arn}:*"]
  }
}

resource "aws_iam_role_policy" "server" {
  name   = local.function_name
  role   = aws_iam_role.server.id
  policy = data.aws_iam_policy_document.server.json
}

# Declared rather than left to the runtime, because a group the runtime makes keeps every line for
# ever and nothing about a page view needs keeping that long.
resource "aws_cloudwatch_log_group" "server" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 14
}

data "archive_file" "placeholder" {
  type        = "zip"
  source_file = "${path.module}/code/index.mjs"
  output_path = "${path.module}/code/placeholder.zip"
}

resource "aws_lambda_function" "server" {
  function_name = local.function_name
  role          = aws_iam_role.server.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  memory_size   = 1024
  timeout       = 10

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  depends_on = [
    aws_cloudwatch_log_group.server,
    aws_iam_role_policy.server,
  ]

  # The deploy of step 26.14 replaces the code on a merge. Terraform would read the real build as
  # drift and put the placeholder back on the next apply, which would take the site down.
  lifecycle {
    ignore_changes = [filename, source_code_hash, layers, publish]
  }
}

# AWS_IAM, so the address of the function url is not enough to call it. The distribution signs
# each request with the origin access control below, and nothing else holds a signature.
resource "aws_lambda_function_url" "server" {
  function_name      = aws_lambda_function.server.function_name
  authorization_type = "AWS_IAM"
  invoke_mode        = "BUFFERED"
}

resource "aws_lambda_permission" "server" {
  statement_id           = "ReadFromThisDistributionAlone"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.server.function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = aws_cloudfront_distribution.site.arn
  function_url_auth_type = "AWS_IAM"
}

# A function url behind an origin access control is authorised twice: once for the url, and once
# for the function underneath it. With only the url name granted, every signed request from the
# distribution answered 403 and named function url authorization, so the site served nothing. The
# condition is the same on both, so neither name reaches further than this one distribution.
resource "aws_lambda_permission" "server_invoke" {
  statement_id  = "InvokeFromThisDistributionAlone"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.server.function_name
  principal     = "cloudfront.amazonaws.com"
  source_arn    = aws_cloudfront_distribution.site.arn
}

# ── The distribution, which is the only way in ───────────────────────────────

resource "aws_cloudfront_origin_access_control" "assets" {
  name                              = "${local.bucket_name}-assets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "server" {
  name                              = "${local.function_name}-url"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# The cache key of a page. The time to live is left at zero so the response decides how long the
# edge keeps it, which is how a Next.js page says what it is. The four headers are the ones the
# App Router varies a response on, so a page cached for one of them is never served for another.
resource "aws_cloudfront_cache_policy" "pages" {
  name        = "${var.project_name}-website-pages"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"

      headers {
        items = [
          "next-router-prefetch",
          "next-router-state-tree",
          "next-url",
          "rsc",
        ]
      }
    }

    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# The headers of SITE-6, on every response of both origins. Nothing a page renders can take them
# off, because the policy is applied at the edge after the origin has answered.
resource "aws_cloudfront_response_headers_policy" "site" {
  name = "${var.project_name}-website-headers"

  security_headers_config {
    # Two years, and every name under myemi.app, so a reader who once arrived over https can never
    # be talked back down to http.
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }

    # The origin of the site and nothing else. No third party host can be reached from a page, so
    # nothing on the site can report that she read it.
    content_security_policy {
      content_security_policy = "default-src 'self'; frame-ancestors 'none'"
      override                = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  # The sixth header. CloudFront offers five named slots above, and a page of Emi needs none of
  # the camera, the microphone or her location, so the site refuses all three rather than leaving
  # the question to the browser.
  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "camera=(), microphone=(), geolocation=()"
      override = true
    }
  }
}

resource "aws_cloudfront_function" "redirect" {
  name    = "${var.project_name}-website-redirect"
  runtime = "cloudfront-js-2.0"
  publish = true
  comment = "One address for the site, a language under the root, and the viewer host for the origin"
  code    = file("${path.module}/code/redirect.js")
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = var.domain_name
  aliases             = concat([var.domain_name], var.other_names)
  default_root_object = ""
  http_version        = "http2and3"

  # Europe and North America. Emi is served from Frankfurt and her readers are here, so the cheaper
  # class is the whole price list this product needs.
  price_class = "PriceClass_100"

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  origin {
    origin_id                = "server"
    domain_name              = replace(replace(aws_lambda_function_url.server.function_url, "https://", ""), "/", "")
    origin_access_control_id = aws_cloudfront_origin_access_control.server.id

    custom_origin_config {
      origin_protocol_policy = "https-only"
      http_port              = 80
      https_port             = 443
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    origin_id                = "assets"
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  default_cache_behavior {
    target_origin_id           = "server"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.pages.id
    origin_request_policy_id   = local.all_viewer_except_host
    response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.redirect.arn
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = local.asset_paths

    content {
      path_pattern               = ordered_cache_behavior.value
      target_origin_id           = "assets"
      viewer_protocol_policy     = "redirect-to-https"
      allowed_methods            = ["GET", "HEAD"]
      cached_methods             = ["GET", "HEAD"]
      compress                   = true
      cache_policy_id            = local.caching_optimized
      response_headers_policy_id = aws_cloudfront_response_headers_policy.site.id
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# ── The addresses that reach it ──────────────────────────────────────────────

# The zone identifier below is CloudFront's own, the same for every distribution, and Terraform
# has no data source that returns it.
resource "aws_route53_record" "site" {
  for_each = {
    for pair in setproduct(concat([var.domain_name], var.other_names), ["A", "AAAA"]) :
    "${pair[0]}-${pair[1]}" => { name = pair[0], type = pair[1] }
  }

  zone_id = var.zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}
