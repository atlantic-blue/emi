Feature: The addresses a search engine reads

  A woman looking for a private period tracker has never heard of Emi. She types what she wants
  into a search engine, and the one page that has to earn her trust either comes up or it does not.

  The site serves each page at three addresses, one for each language. A search engine that is not
  told they are one page keeps them as three, so the page competes with itself. It can also hand a
  Russian reader the English page.

  A page that names the home page as its own address is the same fault wearing the other hat: the
  two pages are then one page in the record, and the one a search engine drops is whichever it read
  second. So each page names its own path and not the path of the page above it.

  So every page names two things in its head. Its own address, whole, on the one host, with the
  language and the slash at the end. And the address of the same page in each language, with one
  more for a reader of none of the three, who is offered the English page.

  The page behind an address the site does not have names neither. A page that names an address the
  site does not hold gives a search engine an address to keep for nothing.

  Scenario Outline: the page names its own address and the languages it is written in
    Given a woman opens the page at "<address>"
    Then the page names "<address>" as its own address, whole
    And it names the same page in each language, and the English page for a reader of none

    Examples:
      | address      |
      | /en/         |
      | /ru/         |
      | /es/         |
      | /en/privacy/ |
      | /ru/privacy/ |
      | /es/privacy/ |

  Scenario: the page she reached by accident names no address
    Given a woman opens the page at "/en/nothing/"
    Then the page names no address of its own, and no other language
