Feature: Emi sends from myemi.app, signed, and counts its own bounces

  The four transactional messages of version 1 leave from one identity, and this step builds it.
  A verified myemi.app identity in eu-central-1, signed by a key the service holds and rotates,
  with an envelope sender on mail.myemi.app so a bounce returns to Emi. Seven records in the zone
  carry all of that.

  One address writes them: no-reply@myemi.app, read in her inbox as Emi. The domain identity
  covers every address under it, so the address declares nothing of its own. Apple holds each
  sending address separately, which is why this exact address is in the readme as a step for a
  person.

  Beside it, one configuration set named for Emi. Reputation belongs to the account and the
  region, and this account sends for another product, so without a set of its own the bounce rate
  of Emi is only visible mixed with that product. The set carries an event destination for the
  bounce and the complaint, and two alarms, each at half the rate that pauses an account.

  Three mistakes are easy here and none of them fails an apply.

  The first is a silent bounce to every Apple user. A private relay address takes mail only from a
  sender Apple holds, and no test can read the Apple developer account, so the readme carries that
  step for a person.

  The second is a message that says too much. This step sends nothing, and it is the place where
  that starts: the identity holds an address, and the topic carries an address and a reason. No day
  of hers reaches either.

  The third is a policy that refuses before anybody can read it. The authentication record asks a
  receiving server for nothing yet, because myemi.app receives no mail and no report could arrive.

  Scenario: mail from Emi is signed, and it comes back to Emi
    Given the sender of myemi.app
    When the way a message is signed is read
    Then the service holds the signing key, and no key is written here
    And three names in the zone carry the signature
    And it is sent from no-reply@myemi.app, and read in her inbox as Emi
    And the envelope sender is a subdomain of myemi.app
    And a server that cannot read the mail exchange record still gets the message

  Scenario: the bounces of Emi are counted apart, and watched at half the rate that hurts
    Given the sender of myemi.app
    When what counts a bounce is read
    Then every message is counted on a configuration set named for Emi
    And a bounce and a complaint reach a topic of Emi
    And the bounce rate is watched at 5 percent and the complaint rate at 0.1 percent
    And neither alarm sends anywhere, because there is nowhere to send to yet

  Scenario: the sender holds an address and nothing of her days
    Given the sender of myemi.app
    When what the sender holds is read
    Then it declares no key and no password
    And it asks for no open and no click
    And the records ask a receiving server for nothing yet
    And the pool reads the sender, and the sender names no pool
