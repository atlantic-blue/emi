Feature: One order for the words a page is built from

  A page of myemi.app is built from words. Each word names a colour, a size, a gap or a corner,
  and the token package measured each one. A word nobody measured can put text in front of her
  that she cannot read on the paper behind it. So people read these lists of words closely.

  A list that changes its order defeats that reading. Two people write the same card a month
  apart. One of them starts with the colour. The other starts with the shape. The two lists draw
  one card, and they read as two. A reviewer then compares the order instead of the change, and a
  new word hides in the middle of it.

  This site has one order, and the order is not a taste. It is the order the stylesheet writes the
  rules in. A reader follows a word from the page to the rule the browser obeys. The formatter
  puts the words in that order on every save, so nobody holds the order in their head.

  The words Emi chose get the same placing as the words Tailwind ships. A formatter that cannot
  read the Emi theme puts every Emi word first, in the order somebody typed it. That is a second
  order, and this site has one.

  Scenario: prettier sorts the classes of a website component
    Given a component of the site whose classes are in the order somebody typed them
    When the formatter this repository runs reads that component
    Then the classes come back in the order the stylesheet writes their rules
    And a list of only the words Emi chose comes back in that order too
    And every word the component was given is still there
    And every component the site ships is already in that order
