Feature: The deploy roles may build the website

  The pipeline builds myemi.app with the role a merge assumes. That role writes records in Route 53.
  Account 230345688874 holds the myemi.app zone beside the zones of other Atlantic Blue products.

  A resource pattern that reaches every zone does not fail. It reads as correct until a plan of the
  website deletes a record of another site. So this scenario reads the grant that changes a record,
  and holds it to one zone.

  Scenario: the record grant reaches only the myemi.app zone
    Given the two roles the pipeline assumes
    When the grant that changes a record is read
    Then it names the myemi.app zone and no other resource
    And no grant that stands on every resource changes a record
    And the role a pull request assumes reads the zone and changes no record
