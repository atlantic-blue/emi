Feature: What a chat draws when she sends somebody the address

  A woman reads myemi.app, decides Emi is worth having, and tells her sister. She copies the
  address out of the bar and pastes it into their chat. What the chat draws is the whole of what
  her sister sees before she decides whether to tap it.

  Today the chat draws the word Emi and an empty rectangle. The page carries one title, the same
  five letters in every language, and no picture at all. So the strongest recommendation Emi gets,
  one woman telling another, arrives looking like a link to nothing, and the person most likely to
  install Emi is the person it fails in front of.

  So the page says who it is before anybody opens it. The title names Emi and then the sentence
  the page opens with, in the language the address asked for, because a Russian reader who is sent
  a Russian page reads a Russian line in her chat. The picture is the one the operator drew: the
  mark, the line the name stands for, the sentence, the address, and the ring at day 8.

  The picture address has to be the whole address. A chat application reads the tag on its own
  server, far from the page, so a path that starts with a slash means nothing to it and it draws
  the empty rectangle again. And the edge has to answer for that address, because a file the edge
  was never told about falls to the function that draws pages, and that function draws pages and
  serves no file.

  Scenario: a shared link shows the Emi preview
    Given a woman pastes the address of an Emi page into a chat with her sister
    Then her sister reads the name and the sentence that page opens with, in that page's language
    And she reads what Emi is, in the words of that page
    And the chat is told which language and region the page is written for
    And the chat is given the whole address of the picture, not a path it cannot follow
    And the picture is the board the operator drew, at the size a chat draws it
    And the chat is told to draw it large, beside the words
    And the edge answers for the picture, so it reaches her sister at all
    And a browser opens each page and reads the same answers off it
