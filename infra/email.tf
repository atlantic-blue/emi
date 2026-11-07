# The sender. Emi writes four transactional messages in version 1 and no more, and this is the
# identity they leave from.
#
# The service is Amazon Simple Email Service in eu-central-1, because that is where this account
# already holds production access: sending is enabled and the quota is 50,000 messages a day. A
# new region would put Emi back in the sandbox, which takes days and can fail. It carries no
# monthly fee, and mail costs 0.10 United States dollars for each 1,000 messages.
#
# Sender reputation belongs to the account and the region rather than to a product, and this
# account sends for another product too. So Emi gets a configuration set of its own, its bounce
# and complaint rates are counted on that set alone, and each alarm below names Emi. A complaint
# rate earned anywhere else in the account can still pause Emi, and the answer to that would be an
# account of its own.
#
# The grants this needs merged on their own, in step 28.7, so nothing here waits on a policy. An
# apply reads a policy per request, and a resource made one second after the grant that allows it
# is refused.

locals {
  # The one address Emi writes from, and the name a woman reads in her inbox. The domain identity
  # covers every address under it, so this address needs no identity of its own.
  #
  # Nothing receives mail here, so a reply is lost. The name of the address says that, and each
  # message carries the account screen as the way to answer. Receiving mail is a step of its own.
  #
  # Apple holds each sending address separately from the domain, so this exact address is the one
  # the readme asks a person to register. An address Apple does not hold bounces for every woman
  # who hides her address.
  sender_address = "no-reply@${var.domain_name}"
  sender_name    = "Emi"
  sender_from    = "${local.sender_name} <${local.sender_address}>"

  # The envelope sender lives on a subdomain of the visible sender, so a reader who opens the
  # headers sees Emi in both places.
  envelope_sender_domain = "mail.${var.domain_name}"

  # Easy DomainKeys Identified Mail returns three names to publish, always three. A loop needs its
  # keys before the plan runs and these values exist only after the identity does, so the records
  # below are counted rather than walked.
  signing_record_count = 3

  mail_record_ttl = 3600
}

# The registration owns this zone and the registrar's name servers point at it, so Terraform reads
# it. A zone declared here would be a second zone nothing points at, and every address under
# myemi.app would stop answering. The website root reads the same zone the same way, and the two
# roots write different records in it.
data "aws_route53_zone" "sender" {
  zone_id = var.zone_id

  # The pipeline may change a record in this one zone, named by its identifier in the role policy.
  # A lookup that read some other zone would be refused by the account with no explanation, so the
  # mismatch is named here instead.
  lifecycle {
    postcondition {
      condition     = self.name == var.domain_name
      error_message = "the zone read is not the zone for ${var.domain_name}"
    }
  }
}

# ── The identity, and the records that prove it ──────────────────────────────

resource "aws_sesv2_email_identity" "sender" {
  email_identity = var.domain_name

  # The service holds the signing key and rotates it. A key Emi held would be a key in a public
  # repository.
  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }

  # Every message Emi sends is counted on this set, whether or not the sender names it.
  configuration_set_name = aws_sesv2_configuration_set.sender.configuration_set_name
}

# The envelope sender. Without it a message leaves from amazonses.com, so the address a bounce
# returns to is not Emi, and the Sender Policy Framework check reads a domain that is not Emi
# either. On a failure to read the mail exchange record below, the service falls back to its own
# subdomain rather than refusing to send, so a record that goes missing costs the alignment and
# never the message.
resource "aws_sesv2_email_identity_mail_from_attributes" "sender" {
  email_identity         = aws_sesv2_email_identity.sender.email_identity
  mail_from_domain       = local.envelope_sender_domain
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

# The three names that carry the signature. The identity stays unverified, and sends nothing, until
# these answer.
resource "aws_route53_record" "signing" {
  count = local.signing_record_count

  zone_id = data.aws_route53_zone.sender.zone_id
  name    = "${aws_sesv2_email_identity.sender.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = local.mail_record_ttl
  records = [
    "${aws_sesv2_email_identity.sender.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com",
  ]

  # A record left behind by an earlier identity is replaced rather than turned into an error
  # nobody can clear without reaching the console.
  allow_overwrite = true
}

# Where a bounce goes back to. The address is the regional one, so a message sent from another
# region would not match it.
resource "aws_route53_record" "envelope_sender" {
  zone_id = data.aws_route53_zone.sender.zone_id
  name    = local.envelope_sender_domain
  type    = "MX"
  ttl     = local.mail_record_ttl
  records = ["10 feedback-smtp.${var.region}.amazonses.com"]

  allow_overwrite = true
}

# The Sender Policy Framework record of the envelope sender, and of the visible sender below. Both
# are needed: a receiving server reads the first when it checks the envelope, and Apple reads the
# second when it decides whether to deliver to a private relay address.
#
# Each one ends in a soft refusal rather than a hard one, so mail from a source this record does
# not name is marked and not thrown away. A hard refusal here would be Emi deciding what another
# server does with a message Emi did not send.
resource "aws_route53_record" "envelope_sender_policy" {
  zone_id = data.aws_route53_zone.sender.zone_id
  name    = local.envelope_sender_domain
  type    = "TXT"
  ttl     = local.mail_record_ttl
  records = ["v=spf1 include:amazonses.com ~all"]

  allow_overwrite = true
}

# A domain holds one of these and no more, so this record is the whole policy for myemi.app. The
# website answers on the same domain and sends nothing, so the service named here is the only one
# that may write as Emi.
resource "aws_route53_record" "sender_policy" {
  zone_id = data.aws_route53_zone.sender.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = local.mail_record_ttl
  records = ["v=spf1 include:amazonses.com ~all"]

  allow_overwrite = true
}

# What a receiving server does with a message that fails both checks. The policy is none, which
# asks for nothing: myemi.app receives no mail yet, so there is no inbox a report could arrive in,
# and a policy that asked a server to reject would do it before anybody could read whether the
# records were right. Raising it to quarantine, and then to reject, belongs to a later step that
# can read what is being signed.
resource "aws_route53_record" "message_authentication" {
  zone_id = data.aws_route53_zone.sender.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = local.mail_record_ttl
  records = ["v=DMARC1; p=none;"]

  allow_overwrite = true
}

# ── The set the rates of Emi are counted on, and what it reports ─────────────

resource "aws_sesv2_configuration_set" "sender" {
  configuration_set_name = var.project_name

  # Without this the bounce and complaint rates of Emi are only visible mixed with the other
  # product of this account, and an alarm on the account rate cannot say which product earned it.
  reputation_options {
    reputation_metrics_enabled = true
  }
}

# The bounce and the complaint, and nothing else. A delivery, an open and a click are not asked
# for: an open is a pixel in her inbox and a click is a redirect through a server, and Emi reads
# neither.
resource "aws_sesv2_configuration_set_event_destination" "outcomes" {
  configuration_set_name = aws_sesv2_configuration_set.sender.configuration_set_name
  event_destination_name = "${var.project_name}-bounces-and-complaints"

  event_destination {
    enabled              = true
    matching_event_types = ["BOUNCE", "COMPLAINT"]

    sns_destination {
      topic_arn = aws_sns_topic.email_outcomes.arn
    }
  }

  # The service refuses the destination if it cannot publish to the topic, so the policy goes first.
  depends_on = [aws_sns_topic_policy.email_outcomes]
}

# Nothing subscribes to this topic yet. Step 28.10 adds the function that reads an event and writes
# the outcome onto the account item, so until then an event arrives and is dropped.
#
# The topic carries no encryption key. A key managed by the account bills every month, and the key
# the service manages cannot be read by the mail service, so a message would never arrive. An event
# here carries an email address and a reason, and nothing of her days.
resource "aws_sns_topic" "email_outcomes" {
  name = "${var.project_name}-email-outcomes"
}

# The mail service publishes as itself, so the topic has to name it. Both conditions are the
# documented ones: the account that owns the configuration set, and the set itself, so another
# account cannot publish into this topic by naming the service.
data "aws_iam_policy_document" "email_outcomes" {
  statement {
    sid       = "TheSenderMayPublish"
    effect    = "Allow"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.email_outcomes.arn]

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [var.account_id]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_sesv2_configuration_set.sender.arn]
    }
  }
}

resource "aws_sns_topic_policy" "email_outcomes" {
  arn    = aws_sns_topic.email_outcomes.arn
  policy = data.aws_iam_policy_document.email_outcomes.json
}

# ── The two rates, watched on the set of Emi alone ───────────────────────────

# The service recommends staying under 5 percent and 0.1 percent, and may pause an account above
# 10 percent and 0.5 percent. So each alarm sits at half the rate that hurts rather than at the
# rate itself.
#
# Neither alarm carries an action, because there is nothing to send one to yet: no topic a person
# reads, and no address to raise. The alarm state is the whole signal until a step adds one, and
# the readme says so.
resource "aws_cloudwatch_metric_alarm" "bounce_rate" {
  alarm_name        = "${var.project_name}-email-bounce-rate"
  alarm_description = "The bounce rate of Emi reached 5 percent. The service pauses an account at 10 percent."

  namespace   = "AWS/SES"
  metric_name = "Reputation.BounceRate"
  dimensions = {
    "ses:configuration-set" = aws_sesv2_configuration_set.sender.configuration_set_name
  }

  statistic           = "Average"
  period              = 3600
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 0.05
  comparison_operator = "GreaterThanOrEqualToThreshold"

  # A month in which Emi sends nothing publishes no measurement, and no measurement is not a
  # failure.
  treat_missing_data = "notBreaching"

  alarm_actions = []
  ok_actions    = []
}

resource "aws_cloudwatch_metric_alarm" "complaint_rate" {
  alarm_name        = "${var.project_name}-email-complaint-rate"
  alarm_description = "The complaint rate of Emi reached 0.1 percent. The service pauses an account at 0.5 percent."

  namespace   = "AWS/SES"
  metric_name = "Reputation.ComplaintRate"
  dimensions = {
    "ses:configuration-set" = aws_sesv2_configuration_set.sender.configuration_set_name
  }

  statistic           = "Average"
  period              = 3600
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 0.001
  comparison_operator = "GreaterThanOrEqualToThreshold"

  treat_missing_data = "notBreaching"

  alarm_actions = []
  ok_actions    = []
}

output "sender_domain" {
  description = "Domain Emi sends from, once the records below it answer"
  value       = aws_sesv2_email_identity.sender.email_identity
}

output "sender_address" {
  description = "Address the four messages are sent from, which the sender of step 28.9 reads"
  value       = local.sender_address
}

output "sender_from" {
  description = "What a woman reads in the from line of a message, name and address together"
  value       = local.sender_from
}

output "sender_configuration_set" {
  description = "Set every message is counted on, which the sender of step 28.9 names on each send"
  value       = aws_sesv2_configuration_set.sender.configuration_set_name
}

output "email_outcome_topic_arn" {
  description = "Topic a bounce and a complaint arrive on, which step 28.10 subscribes a function to"
  value       = aws_sns_topic.email_outcomes.arn
}
