import type { ReactNode } from 'react';

import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy } from './copy';

/** Screen one of three. It asks nothing, because the first thing she is owed is what this is. */
export function WhatEmiIs({ onContinue }: { readonly onContinue: () => void }): ReactNode {
  return (
    <OnboardingScreen
      actionLabel={firstRunCopy.welcome.action}
      lines={firstRunCopy.welcome.lines}
      onAction={onContinue}
      screen="welcome"
      title={firstRunCopy.welcome.title}
    />
  );
}
