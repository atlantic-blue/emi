Feature: The user pool signs her in with a code, and holds nothing of her

  One pool holds every way into the account: Sign in with Apple, Google, Telegram and a code sent
  to her email address. Cognito issues the token every time. This step builds the pool, its two
  clients and the email code. Apple, Google and Telegram arrive in the next step, because each one
  needs a credential only a person can make.

  Two mistakes are easy here and neither one fails an apply.

  The first is a password. Cognito refuses a list of first factors that leaves PASSWORD out, so the
  word has to be in the configuration. A pool that then kept a recovery path, or a client that
  allowed a password flow, would hold a password Emi never asked for and never meant to carry.

  The second is the pool holding her. An attribute for the account identifier, or for a count of
  her days, would put part of her record beside her email address, where the server can read it.
  Her days stay sealed under the recovery code, and the pool holds an address and a subject.

  Scenario: a code signs her in and no password can
    Given the user pool she signs in to
    When the ways a sign in may start are read
    Then the email one time code is one of them
    And the password the service insists on has nothing to accept
    And neither client allows a password flow
    And no one can ask for a password by saying they lost theirs

  Scenario: the pool holds an address and a subject, and nothing else of hers
    Given the user pool she signs in to
    When what the pool may hold is read
    Then it declares no attribute of its own
    And each client reads her address and no other attribute
    And the pool holds no secret and no key
    And it cannot be deleted by a configuration change alone
