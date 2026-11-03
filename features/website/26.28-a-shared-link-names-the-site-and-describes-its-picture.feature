Feature: What the card says it is, and what its picture shows

  A woman sends her sister the address of myemi.app. The chat draws a card, and that card is the
  whole of what her sister reads before she decides whether to tap it.

  The card already carries the title, the sentence and the picture. Two things are missing from it.

  Nothing tells the chat what it has been handed, or whose site it is. So it writes the host name
  where the name of the product belongs, and it files the card beside a video and a profile,
  because nothing said this is a page of a site.

  And nobody describes the picture. Her sister may read the card with software that speaks a page
  aloud, and a picture nothing describes is a picture she is told nothing about. A chat with no
  room for a picture writes the description instead, and with no description it writes nothing at
  all. So each page says what its picture shows, in the language the address asked for: the Emi
  icon, the headline, and the ring at day 8 of the cycle.

  The description is one sentence for each language, beside the other words of that language. The
  picture is one file for all three languages, and its own words are English, so the description
  says what the picture shows rather than quoting it.

  Scenario: a shared link names the site and describes its picture
    Given a woman sends the address of each Emi page to her sister
    Then the card says it is a page of a site, and that the site is Emi
    And the card describes the picture her sister may not be able to see
    And it describes it in the language of the page she was sent
    And a chat that reads the other set of tags gets the same description
    And a browser opens each page and reads the same four answers off it
