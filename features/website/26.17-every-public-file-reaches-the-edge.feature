Feature: The files the site keeps beside its pages

  A woman opens myemi.app. The band at the top of the page asks her browser for the drawing of the
  name, and the site answers 404. She reads a page about trust with a hole where the product name
  belongs. That is the first thing she sees, and she decides from it.

  The file is not lost. The deploy uploads it, and it sits in the bucket. The distribution never
  asks the bucket for it. Only a few addresses go to the bucket, and every other address goes to
  the function that draws pages. That function draws pages. It serves no file.

  So the fault is at the edge, one hop before the file. Nothing in the repository can see it. The
  page names the right address, the test of the page passes, the build passes, and the upload puts
  the file where it belongs. A reader is the first to find out.

  This scenario reads the folder and the edge as one thing. It takes each file the site keeps
  beside its pages, asks for it the way a browser asks, and reads which origin answers. A file the
  bucket does not answer for fails it. So it refuses the hole on the page today, and it refuses the
  same hole for the next file somebody puts in that folder.

  Scenario: every public file reaches the edge
    Given the site Emi is served from, and the files it keeps beside its pages
    When her browser asks for the drawing of the name that every page carries
    Then the bucket answers, so she reads the name of the product at the top of the page
    And the bucket answers for every other file the site keeps beside its pages
    And a file the edge was never told about does not reach her at all
    And the page she asked for still comes from the function that draws pages
