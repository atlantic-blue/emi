Feature: The pipeline may let the pool send, and it may not send anything itself

  Step 28.10 points the user pool at the myemi.app sender. It sets an email configuration whose
  sending account is DEVELOPER, the identity as the source, "Emi <no-reply@myemi.app>" as the
  from address, and the configuration set of Emi. Until then the pool sends a code from an
  address of the service, and the email code cannot carry Emi.

  Saving that setting makes a service linked role, AWSServiceRoleForAmazonCognitoIdpEmailService,
  and Amazon Cognito makes it with the credentials of whoever saved the setting. So the role that
  applies needs the action that makes one. The documentation names that one action and no other:
  the permissions of this session must include iam:CreateServiceLinkedRole.

  This step grants it alone and changes no resource. An apply reads a policy per request, so a
  merge that granted the action and saved the setting together could be refused, which is what
  happened to pull request 515.

  Two mistakes are easy here and neither one fails an apply.

  The first is a send of its own. The service linked role carries ses:SendEmail, it refuses every
  ses:List call, and only the email service may assume it. So neither pipeline role needs a send,
  and a send granted here would be a way to write as Emi from outside the pool.

  The second is a grant that makes any role. This action makes a role, so the resource names the
  path of that one service and the condition names the service again.

  Scenario: a merge may make the role the email service sends through
    Given the two roles the pipeline assumes
    When the grant the pool needs is read
    Then a merge may make a service linked role for the email service
    And it may make one under the path of that service and under no other path
    And the condition names that service again
    And the roles of Emi stay in a statement of their own

  Scenario: neither role may send a message, and a pull request gains nothing
    Given the two roles the pipeline assumes
    When the grant the pool needs is read
    Then neither role may send a message
    And neither role may write a policy on a service linked role
    And a pull request may not make one at all
