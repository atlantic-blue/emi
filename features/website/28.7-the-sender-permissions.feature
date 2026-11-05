Feature: The pipeline may build the sender, and a pull request may only read it

  Step 28.8 makes the sender: a verified myemi.app identity, the records that sign its mail, a
  configuration set that counts its bounces apart, a topic, and two alarms. The two pipeline roles
  hold none of that today, so this step grants it and builds nothing.

  The split is the whole point of this step. An apply reads a policy per request. Pull request 515
  changed the apply role and made the user pool in one apply, the create ran one second after the
  policy change, and the account refused it because the new permission was not active yet. A
  second run passed. So the permissions merge on their own, and the resources follow after.

  Two mistakes are easy here and neither one fails an apply.

  The first is a grant that stands on every resource. This account sends for another product, so a
  grant on every identity would let a merge of Emi delete that product's sender, and a grant on
  every zone would let it delete a record of another site.

  The second is the opposite mistake. One read of this account names no resource at all, and a
  grant that scopes it reads nothing and refuses the plan. That read is named here, on its own,
  with the reason beside it.

  Scenario: a merge may make the sender, and only in the resources of Emi
    Given the two roles the pipeline assumes
    When the grants the sender needs are read
    Then a merge may make the identity, the configuration set, the topic and the alarms
    And each of those grants names a resource of Emi and never every resource
    And a record change still names the myemi.app zone and no other zone

  Scenario: a pull request reads the sender and writes none of it
    Given the two roles the pipeline assumes
    When the grants the sender needs are read
    Then a pull request reads the identity, the configuration set and the topic
    And it holds no write of any of them
    And neither role may send a message or read a suppressed address
