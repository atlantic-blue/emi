Feature: The contracts for the website

  Emi gets a website on myemi.app. It carries the privacy policy and the support page the App Store
  review asks for. None of it is built, so the six contracts are the only written statement of what
  the site must do.

  Two documents carry that statement together. `docs/contracts.md` says what each part must do, and
  `docs/features.md` says which feature builds it. A reader starts at the map and arrives at the
  contract, and a contract that sits in one document alone breaks the walk: a line in the map that
  points at nothing, or a promise about myemi.app that belongs to no feature and that nobody builds.

  Scenario: every website contract is mapped to a feature
    Given the two documents that carry the contracts of Emi
    When the contracts of the website are read
    Then the six contracts of the website are declared
    And each one says how it is verified, what it outputs and every error it produces
    And the map gives each one to one feature, once
    And the two checks the pipeline runs over the documents report no problem
    And a contract of the website that the map gives to two features is refused
    And a contract of the website that the map gives to no feature is refused
