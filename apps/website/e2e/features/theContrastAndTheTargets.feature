Feature: What she can read on the page, and what she can press

  A woman who has never heard of Emi opens myemi.app on the phone in her hand. Before she decides
  anything she has to do two plain things: read the words, and press the one that takes her on. If a
  line of text sits too close in colour to the ground behind it, she reads a grey smear. If a press
  is smaller than her thumb, she aims at Buy and lands on the language she does not speak.

  Nobody sees either fault by looking. The person who drew the board has good eyes and a mouse, the
  person who built the page reads it at the width of a desktop, and the page passes both of them.
  The reader it fails is the one with a phone in one hand, in the sun, on a bus.

  Her software has the same problem. A button that carries a picture and no word is a button her
  screen reader announces as "button", so a woman who cannot see the picture is offered a press and
  told nothing about what it does. The pictures on this page are drawn as outlines with no words in
  them at all, so the name has to be written beside each one or it does not exist.

  So a browser reads every page of the site, in all three languages and on the address nobody has,
  and it reads them the way her own software would: it measures each word against its ground, it
  asks every button and every link what it is called, and it measures every press. Each failure is
  named with the element and the amount it is out by, because a number is the thing somebody can
  fix.

  Scenario Outline: every page meets the contrast and target rules
    Given a woman opens the page at "<address>"
    When her software reads the page for what she cannot read and cannot press
    Then every word she reads carries the contrast her eyes need
    And every button and every link says what it is
    And every press is big enough for the thumb that has to hit it

    Examples:
      | address      |
      | /en/         |
      | /ru/         |
      | /es/         |
      | /en/nothing/ |
