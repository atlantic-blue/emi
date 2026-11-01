Feature: The certificate module and the website root

  A woman types myemi.app and her browser has to trust the page before she reads a word of it. The
  thing that earns that trust is one certificate, and three quiet failures stop it from arriving.

  A certificate nobody validates is never issued, and a distribution holding one serves nothing. A
  certificate in the wrong region is invisible to CloudFront, which reads one from us-east-1 and
  from nowhere else. A zone Terraform makes for itself replaces the zone the registrar points at,
  and then every address under myemi.app goes dark, the privacy page and the support page the store
  review asks for among them.

  Scenario: the certificate for myemi.app is issued
    Given the website Emi is served from
    When the certificate that makes it answer over https is read
    Then it covers myemi.app and www.myemi.app
    And ownership is proven in the myemi.app zone, so the issue can finish on its own
    And nothing may hold the certificate until it is issued
    And it is asked for where CloudFront can read it
    And the zone the registration owns is read and never created
