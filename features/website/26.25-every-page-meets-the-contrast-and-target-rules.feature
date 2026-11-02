Feature: What she can read, what she can press, and what she is asked to pay

  A woman arrives on myemi.app with a phone in her hand. She has never heard of Emi. In the next
  minute she has to read what it is, work out what each press does, hit the one she wants, and
  decide whether 29.99 pounds a month is worth it. Four plain things, and the page can fail every
  one of them while every word on it is correct.

  A word too close in colour to the ground behind it is a word she skips. A button that carries a
  drawing and no name is a press her screen reader announces as "button" and nothing else, so a
  woman who cannot see the drawing is offered a choice she is told nothing about. A press narrower
  than her thumb is a press she aims at and misses, and on this page the miss lands on the language
  she does not speak. None of the three is visible to the person who drew the board on a desktop
  with a mouse and good light.

  The price is the fourth. Emi asks to be paid because it sells no data, so the figure is the whole
  argument, and a page that names one amount beside a store that charges another is a page that
  loses her at the moment she decides to pay. The period is part of the figure: a month and a year
  are two products, and only one of them exists. The address is the same promise in one word, so
  the words name the host the site is served from and no other.

  So a browser reads every page of the site, in all three languages and on the address nobody has,
  the way her own software reads it. It measures each word against its ground, asks every button and
  every link what it is called, and measures every press. Separately, the words of the three
  languages are read for money and for hosts, and anything that is not the one price or the one
  address is named and refused.

  Scenario: every page meets the contrast and target rules
    Given the pages myemi.app serves, in the three languages and on the address nobody has
    Then she can read every word, because a browser holds each one to the contrast her eyes need
    And she can tell what every button and every link does, because each one says what it is
    And every press in the two bands every page carries is big enough for her thumb on a phone
    And the pages ask her for one price, 29.99 pounds a month, in each of the three languages
    And words that named another amount, another period or another address are refused
