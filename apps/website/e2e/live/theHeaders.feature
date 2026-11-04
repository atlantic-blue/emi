Feature: What every answer from myemi.app carries

  A page of Emi promises that nobody is counting her visit. The words of the page say so. The
  headers are what make it true: they tell her browser to keep the connection over https, to let
  the page reach this site and no other, to put the page in no frame, to pass her address to
  nobody, and to hand out neither the camera nor the microphone nor her location.

  Five of them are added at the edge, after the origin has answered, so nothing a page renders can
  take them off. The content policy is the one exception, and it has to be: a page is drawn with
  scripts written into its markup, and only the function that draws them can put a secret on them
  and name the same secret in the policy. So a page carries the policy of the function, and a file
  from the bucket, which draws nothing and carries no policy of its own, is covered by the edge.

  A site started on this machine has no edge at all, which is why these sentences are read against
  the real host and nowhere else.

  Scenario: every answer she gets carries the headers that keep the promise
    When she asks the live site for "/en/", and follows nothing
    Then the answer tells her browser to come back over https for two years, on every name of the site
    And it lets the page reach this site and nothing else, and puts the page in no frame
    And it refuses a guessed type, and keeps her address off another site
    And it hands out neither the camera, nor the microphone, nor her location

  Scenario: a file the page loads beside it is covered by the edge
    When she asks the live site for "/emi-icon.svg", and follows nothing
    Then a file it serves from the bucket is covered by the policy of the edge
