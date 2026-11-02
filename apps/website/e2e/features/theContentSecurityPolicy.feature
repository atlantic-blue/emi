Feature: The page runs under the policy her browser is given

  The words of a page are only half of it. A page of Emi draws itself with a script written into
  the markup, and the policy the site sends decides whether that script may run. Get the policy
  wrong and she gets a white page: the right words, in the right place, and a browser that refused
  to draw them.

  Nothing in the repository can see that. The markup is right, the build passes, and the policy is
  added to the answer. Only a browser puts the two together, so this is read with one.

  Scenario: a woman reads the page she reached by accident, and her browser refuses nothing
    Given a woman opens an address this site does not have
    Then the answer carries a policy naming a secret, and allows no inline script of its own
    And she reads that the page does not exist
    And her browser refused nothing on the page
