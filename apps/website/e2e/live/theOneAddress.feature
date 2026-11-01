Feature: One address answers for Emi

  She can arrive at myemi.app four ways: over http, with www in front, with both, and at the bare
  root. Every one of them has to end at the same page. A site that answers the same words at two
  addresses is a site a search engine keeps twice, and the privacy page a store reviewer reads is
  then not the page on the record.

  Two moves do the work, and they happen in this order. The distribution turns http into https at
  the edge. Then a function at the edge takes www off the host, and sends the bare root to the
  default language, because every page of this site sits under a language.

  So an address that is wrong in two ways is moved twice. Each move is read on its own here, and
  then the whole walk is read from the furthest address, because what she cares about is where she
  lands.

  Scenario Outline: an older address is moved, once, and permanently
    When she asks the live site for "<asked>", and follows nothing
    Then the site moves her to "<moved to>"

    Examples:
      | asked                     | moved to               |
      | http://myemi.app/         | https://myemi.app/     |
      | http://www.myemi.app/     | https://www.myemi.app/ |
      | https://www.myemi.app/en/ | https://myemi.app/en/  |
      | https://myemi.app/        | https://myemi.app/en/  |

  Scenario Outline: she lands on the one address, whichever one she typed
    When she asks the live site for "<asked>", and follows every move it gives her
    Then she lands on "<landed on>"

    Examples:
      | asked                         | landed on                 |
      | http://www.myemi.app/         | https://myemi.app/en/     |
      | https://www.myemi.app/en/     | https://myemi.app/en/     |
      | https://www.myemi.app/privacy | https://myemi.app/privacy |
