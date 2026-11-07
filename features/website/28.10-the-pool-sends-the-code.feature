Feature: The code she signs in with leaves from Emi

  The pool has allowed the email one time code as a first factor since step 28.2, and it could not
  deliver one. Amazon Cognito sends that code through Amazon Simple Email Service and through
  nothing else, and the pool named no sender. This step points it at the sender of step 28.8.

  The sending account is DEVELOPER, which means the pool calls the mail service in this account
  rather than borrowing an address of the service. So the code is signed as Emi, it is counted on
  the configuration set of Emi, and its daily limit is the limit of the account.

  Two mistakes are easy here and neither one fails an apply.

  The first is an order a rebuild cannot survive. A pool may not name a sender that does not exist,
  so the pool is made after the identity. Existing is not the same as verified, and no wait can
  watch the Domain Name System spread, so a rebuild from nothing takes a second apply. The readme
  says that.

  The second is a message that is not counted. A code sent outside the configuration set of Emi
  bounces without reaching either alarm, so the set is named here as well as on the identity.

  Scenario: the code is sent from Emi, through the account of Emi
    Given the user pool she signs in to
    When the way it sends is read
    Then it calls the mail service in this account
    And it sends from the myemi.app identity
    And she reads Emi <no-reply@myemi.app> in the from line
    And every message is counted on the configuration set of Emi

  Scenario: the pool is never given a sender that does not exist yet
    Given the user pool she signs in to
    When the order of the apply is read
    Then the pool is made after the identity it sends from
    And it names that identity as a resource and never as a written address
    And the readme says a rebuild from nothing takes a second apply
