Feature: The Telegram sign in may read its keys, and nothing else may

  Telegram cannot be a provider of this pool. Amazon Cognito calls the userinfo endpoint of an
  OpenID Connect provider, and Telegram publishes none. So a function of Emi answers the code, and
  the pool turns that answer into tokens through its custom sign in.

  That takes one function and three triggers. This step gives each of them a role, and it builds
  nothing that runs.

  The split is the point of the step. A permission and the resource that needs it can fail together
  in one apply, because the policy has not spread yet. So the grants merge on their own and first,
  and the functions follow after.

  The operator made two things by hand, and nothing in this repository can make either. They
  switched @EmiAppBot to the OpenID Connect login in BotFather, and registered the return address
  there. Then they wrote the client secret into the parameter store.

  Four mistakes are easy here. No one of them fails an apply.

  The first is a grant by prefix. The Telegram parameters sit beside the bot token, and the bot
  token is the one credential that can act as the bot. Payment with Telegram Stars goes through
  that same bot. A prefix puts the payment credential on the sign in path.

  The second is a delete on the salt. The user name of the pool is a keyed hash of the Telegram
  subject. A salt that changes gives every Telegram user a new pool user name, so the account she
  reached yesterday is unreachable. Nothing may remove it.

  The third is a parameter on the trigger role. The three triggers run inside the pool. A trigger
  that could read the salt would put a secret where the pool can reach it.

  The fourth is a secret written down. This repository is public, and its pipeline log is public.

  Scenario: the function reads three values by name, and writes the salt and one item
    Given the roles of the Telegram sign in
    When the grants of the function that answers a code are read
    Then it reads the bot identifier, the client secret and the salt, each named in full
    And it reads the bot token through no grant and no prefix
    And it writes the salt and no other parameter
    And it writes one item to the vault table and reads nothing from it
    And it decrypts a secure string only through a parameter store call

  Scenario: nothing may take the salt away, because the salt is permanent
    Given the roles of the Telegram sign in
    When the grants of the function that answers a code are read
    Then no role of this account may delete a parameter
    And Terraform reads the salt through no data source
    And Terraform creates the salt through no resource
    And the readme says the salt is permanent

  Scenario: the three triggers reach the table and hold no secret
    Given the roles of the Telegram sign in
    When the grants of the three triggers are read
    Then they spend a one time answer with a delete and nothing else
    And they hold no parameter and no decrypt at all
    And they reach the vault table and no other table

  Scenario: no secret is written as a value anywhere in the repository
    Given every tracked file a person reads as text
    When each file is read for the shape of a secret
    Then no file holds a private key, a Google secret or a Telegram bot token
    And a value pasted into any one of them fails this scenario
    And the sentence names the kind of secret and never the value
    And a rule that names the header of a key is left alone

  Scenario: the apply role already reaches the roles and the functions that assume them
    Given the roles of the Telegram sign in
    When the grants a merge needs for this sign in are read
    Then a merge makes a function of Emi and lets a principal invoke one
    And a merge makes a role of Emi and hands it to a function
    And a merge sets the triggers on the pool
    And a pull request reads a function and a role and makes neither
