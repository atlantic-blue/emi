/**
 * What the tier runs, in the order it runs. The prelude comes first and on its own line, because
 * everything after it reads globals that a bare engine does not have until it has run.
 *
 * Only code with no native module under it can be here. Nothing that imports `react-native`,
 * `expo-router`, `expo-sqlite`, `expo-secure-store` or `expo-crypto` can load on a bare engine,
 * so this tier is a floor under the other two and never a replacement for either.
 */
import './prelude';

import { collectBase64Cases } from './cases/base64';
import { collectCanonicalCases } from './cases/canonical';
import { collectDayCases } from './cases/days';
import { collectDayVaultCases } from './cases/dayVault';
import { collectEnvelopeCases } from './cases/envelope';
import { collectSignatureCases } from './cases/signature';
import { runEveryCase } from './harness';

collectBase64Cases();
collectCanonicalCases();
collectEnvelopeCases();
collectSignatureCases();
collectDayVaultCases();
collectDayCases();

runEveryCase();
