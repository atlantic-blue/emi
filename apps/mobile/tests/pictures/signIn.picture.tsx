import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { Account } from '../../src/features/account/Account';
import { AccountEmailCode } from '../../src/features/account/AccountEmailCode';
import { AccountGate } from '../../src/features/account/AccountGate';
import { accountEmailCodeCopy, theProblemSaid } from '../../src/features/account/copy';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen';
import { reminderChoiceSaid } from '../../src/features/settings/RemindersScreen';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The sign in by email code, drawn for somebody to look at beside the boards it follows:
 * settingsAccount, accountGate, accountEmailCode and account.
 *
 * It is not part of the suite. The file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:sign-in-picture`.
 */

const theCaveat = [
  'Rendered from the tree each screen produced under the test runner, at 390 by 844 points, and',
  'not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Figtree. The room kept at the top and the bottom of each screen is the room',
  'an iPhone with a dynamic island keeps for itself, which is 59 points and 34 points. The address',
  'and the day are made up. Reproduce with: npm run generate:sign-in-picture.',
].join(' ');

const nothing = (): void => undefined;

const herAddress = 'julia@example.com';

interface State {
  readonly title: string;
  readonly note: string;
  readonly screen: () => ReactElement;
}

const theStates: readonly State[] = [
  {
    title: 'Privacy, signed in',
    note: 'The row over the rows of Privacy carries her address as its second line once she is signed in, and none before.',
    screen: () => (
      <SettingsScreen
        onAccount={nothing}
        onAnswers={nothing}
        onBack={nothing}
        onDelete={nothing}
        onExport={nothing}
        onReminders={nothing}
        onWhoCanSee={nothing}
        reminder={reminderChoiceSaid('twoDaysBefore')}
        signedInAs={herAddress}
      />
    ),
  },
  {
    title: 'Sign in to Emi',
    note: 'Sign in with Apple opens Apple. Sign in with Google opens Google. Log in with Telegram opens Telegram. Send code asks for the code.',
    screen: () => (
      <AccountGate
        address={herAddress}
        onAddress={nothing}
        onApple={nothing}
        onGoogle={nothing}
        onSendCode={nothing}
        onTelegram={nothing}
        problem={null}
      />
    ),
  },
  {
    title: 'The code',
    note: 'The one line under the box says how long the code lasts.',
    screen: () => (
      <AccountEmailCode
        address={herAddress}
        code="482913"
        digits={6}
        line={{ words: accountEmailCodeCopy.lasts, isAProblem: false }}
        onBack={nothing}
        onCode={nothing}
        onSendANewCode={nothing}
        onSignIn={nothing}
        onUseAnotherAddress={nothing}
      />
    ),
  },
  {
    title: 'A wrong code',
    note: 'What went wrong takes the place of the one line, and no second line is added.',
    screen: () => (
      <AccountEmailCode
        address={herAddress}
        code="111111"
        digits={6}
        line={{ words: theProblemSaid('theCodeIsWrong'), isAProblem: true }}
        onBack={nothing}
        onCode={nothing}
        onSendANewCode={nothing}
        onSignIn={nothing}
        onUseAnotherAddress={nothing}
      />
    ),
  },
  {
    title: 'Emi on another phone',
    note: 'How she signed in, her address and the day, and nothing she can change here.',
    screen: () => (
      <Account
        onBack={nothing}
        signIn={{ way: 'email', address: herAddress, since: '2026-11-13' }}
      />
    ),
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(<OnAPhone>{state.screen()}</OnAPhone>);
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the sign in by email code, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'sign-in',
      screens,
      caveat: theCaveat,
      script: 'generate:sign-in-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
