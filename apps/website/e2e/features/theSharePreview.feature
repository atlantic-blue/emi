Feature: What a chat draws when she sends somebody the address

  A woman reads myemi.app and tells her sister about it. She copies the address and pastes it into
  their chat. Her sister sees a card: a title, a sentence, and a picture. That card is the whole of
  what she has to go on before she decides whether to tap.

  A chat application never opens the page the way a reader does. It asks the server for the
  document, reads a handful of tags out of the head, and throws the rest away. So this reads the
  page the same way: open it, take the tags, and ask for the picture at the address they give.

  The address of the picture has to be whole. The chat reads the tag on its own server, where the
  site it came from is just a name, so a path beginning with a slash points at the chat company
  instead and the card arrives with an empty rectangle in it.

  Scenario Outline: a shared link shows the Emi preview
    Given a woman opens the page at "<address>"
    Then the card her sister would see is titled "<title>"
    And the card says what Emi is, in the words of that page
    And the card names the language and region "<locale>"
    And the card points at the picture with a whole address, on https://myemi.app
    And the picture is there, and it is the size the card promised
    And the card is the kind a chat draws large

    Examples:
      | address | title                             | locale |
      | /en/    | Emi: understand your body, safely | en_GB  |
      | /ru/    | Emi: понимайте своё тело бережно  | ru_RU  |
      | /es/    | Emi: entiende tu cuerpo, con calma | es_ES |
