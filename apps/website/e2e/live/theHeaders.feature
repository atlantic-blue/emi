Feature: What every answer from myemi.app carries

  A page of Emi promises that nobody is counting her visit. The words of the page say so. The
  headers are what make it true: they tell her browser to keep the connection over https, to let
  the page reach this site and no other, to put the page in no frame, to pass her address to
  nobody, and to hand out neither the camera nor the microphone nor her location.

  None of them come from the application. They are added at the edge, after the origin has
  answered, so nothing a page renders can take them off and nothing a local run can show. A site
  started on this machine sends none of them, which is why these sentences are read against the
  real host and nowhere else.

  Scenario: every answer she gets carries the headers that keep the promise
    When she asks the live site for "/en/", and follows nothing
    Then the answer tells her browser to come back over https for two years, on every name of the site
    And it lets the page reach this site and nothing else, and puts the page in no frame
    And it refuses a guessed type, and keeps her address off another site
    And it hands out neither the camera, nor the microphone, nor her location
