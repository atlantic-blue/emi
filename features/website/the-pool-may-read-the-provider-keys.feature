Feature: The pipeline may read the Apple and Google keys, and a merge may use them

  The next step adds Apple and Google to the pool. It also gives the pool the address
  auth.myemi.app. The two pipeline roles hold none of that today. This step grants it and builds
  nothing.

  The split is the point of this step. An apply reads a policy for each request. Pull request 515
  changed the apply role and made the user pool in one apply. The create ran one second after the
  policy change, and the account refused it. A second run passed. So the permissions merge on
  their own, and the resources follow after.

  Apple and Google each need a credential that a person makes by hand. This repository is public,
  and its pipeline log is public. So the six credentials stay in the parameter store of the
  account. Both roles read them. Neither role writes one.

  Three mistakes are easy here. No one of them fails an apply.

  The first mistake is a grant that stands on every resource. This account holds the parameters of
  other products. A read of every parameter reads their secrets too.

  The second mistake is the opposite one. One read of this account names no resource at all. The
  account refuses a statement that names the pool for it, and the plan then reports nothing.

  The third mistake is a decrypt with no limit on it. A secure string is held under the key of the
  account. A decrypt grant with no condition opens every secure string in the account.

  One grant here is wider than the rule of this repository. Amazon Cognito serves a pool domain
  from a distribution that it makes in an account of its own. It configures that distribution with
  the permissions of whoever makes the domain. The service documents the statement to copy, and
  that statement stands on every resource. The last scenario holds it to one action, and says the
  cost out loud.

  Scenario: a merge may read the six credentials and make the two ways in
    Given the two roles the pipeline assumes
    When the grants the sign in needs are read
    Then a merge reads the parameters of Emi and no other parameter
    And it may make, change and remove an identity provider of the pool
    And it may make and remove the domain the pool answers on
    And it may ask for the certificate that address needs
    And it may write a record in the myemi.app zone and in no other zone

  Scenario: a pull request reads the sign in and writes none of it
    Given the two roles the pipeline assumes
    When the grants the sign in needs are read
    Then a pull request reads the parameters, the provider and the domain
    And it holds no write of a provider, of a domain or of a parameter
    And neither role may write a parameter or read one outside Emi

  Scenario: each role decrypts a secure string only through a parameter store call
    Given the two roles the pipeline assumes
    When the grant that decrypts is read
    Then each role names the key of this account and never every key
    And each grant carries the condition that names the parameter store
    And neither role holds a decrypt that any other service may use

  Scenario: the read of a domain stands on every resource, because it names no pool
    Given the two roles the pipeline assumes
    When the grant that reads a domain is read
    Then each role reads a domain through a statement that stands on every resource
    And the same grant written against the pool is no grant at all

  Scenario: the domain costs one grant that is wider than the rule of this repository
    Given the two roles the pipeline assumes
    When the grant the domain distribution needs is read
    Then a merge may change the configuration of a distribution of any account
    And that statement carries one action and no other
    And it is the only wide write this step adds
    And a pull request holds no part of it
