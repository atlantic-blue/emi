import { resolve } from 'node:path';

import {
  describeKeyLeak,
  interfaceFilesOf,
  interfaceRoot,
  keychainItemsNamedIn,
  keyholdingItems,
  keyLeaksIn,
  keyLeaksUnder,
  logCalls,
  logCallsIn,
  recoveryCodeNamedIn,
  serviceRoot,
} from './keyLeak';

const repositoryRoot = resolve(__dirname, '..', '..');

function theItemCalled(name: string): (typeof keyholdingItems)[number] {
  const found = keyholdingItems.find((held) => held.constant === name);

  if (found === undefined) {
    throw new Error(`no keychain item is read through ${name}`);
  }

  return found;
}

const theVaultKey = theItemCalled('vaultKeyItem');
const theDeviceKey = theItemCalled('deviceKeyItem');
const theConfirmation = theItemCalled('recoveryConfirmedItem');
const aScreen = `${interfaceRoot}/features/home/HomeScreen.tsx`;
const theVaultModule = `${theVaultKey.home}/vaultKey.ts`;

describe('the vault key reaching a log, an export or a crash report fails the pipeline', () => {
  const files = interfaceFilesOf(repositoryRoot);

  it('finds no leak in the application today, and says how much it read', () => {
    expect(keyLeaksUnder(repositoryRoot, files).map(describeKeyLeak)).toEqual([]);
    expect(files.length).toBeGreaterThan(20);
  });

  it('reads the screens and the modules behind them, and nothing outside the application', () => {
    expect(files).toContain(theVaultModule);
    expect(files).toContain(aScreen);
    expect(files.every((file) => file.startsWith(interfaceRoot))).toBe(true);
    expect(files.filter((file) => file.includes('apps/mobile/tests'))).toEqual([]);
  });

  describe('the application writes nothing to a log', () => {
    it('refuses a screen that logs, and names the file and the line', () => {
      const screen = 'console.log("the key is", await readVaultKey(keychain));\n';

      const [described] = logCallsIn(aScreen, screen).map(describeKeyLeak);

      expect(described).toContain(aScreen);
      expect(described).toContain('readVaultKey');
    });

    it('refuses every console call and not only the obvious one', () => {
      for (const call of logCalls) {
        expect(logCallsIn(aScreen, `${call}(key);\n`)).toHaveLength(1);
      }

      expect(logCalls).toContain('console.error');
    });

    it('accepts the same screen once it says nothing', () => {
      expect(logCallsIn(aScreen, 'return <Text>{herDay}</Text>;\n')).toEqual([]);
    });
  });

  describe('a keychain item is named in one directory and nowhere else', () => {
    it('lets the module that holds the item name it', () => {
      const source = `export const vaultKeyItem = '${theVaultKey.item}';\n`;

      expect(keychainItemsNamedIn(theVaultModule, source)).toEqual([]);
    });

    it('refuses an export that reads the item by its platform name', () => {
      const exporting = `const key = await getItemAsync('${theVaultKey.item}');\n`;

      const [described] = keychainItemsNamedIn(
        `${interfaceRoot}/features/export/writeFile.ts`,
        exporting,
      ).map(describeKeyLeak);

      expect(described).toContain('features/export/writeFile.ts');
      expect(described).toContain(theVaultKey.item);
    });

    it('refuses a screen that reads the item through the constant', () => {
      const screen = 'const held = await store.read(vaultKeyItem);\n';

      expect(keychainItemsNamedIn(aScreen, screen)).toHaveLength(1);
    });

    it('leaves a longer name that merely starts the same alone', () => {
      const screen = 'const label = vaultKeyItemLabel;\n';

      expect(keychainItemsNamedIn(aScreen, screen)).toEqual([]);
    });

    it('holds the device key to its own directory too', () => {
      expect(keychainItemsNamedIn(theVaultModule, `'${theDeviceKey.item}'\n`)).toHaveLength(1);
      expect(
        keychainItemsNamedIn(`${theDeviceKey.home}/deviceKey.ts`, `'${theDeviceKey.item}'\n`),
      ).toEqual([]);
    });
  });

  it('reports a log line and a named item from the same file separately', () => {
    const both = `console.warn('reading');\nconst held = await store.read(vaultKeyItem);\n`;

    expect(keyLeaksIn(aScreen, both).map((leak) => leak.reason)).toEqual([
      'logs',
      'names-a-keychain-item',
    ]);
  });
});

describe('the recovery code reaching a log or a server field fails the pipeline', () => {
  const theRecoveryScreens = `${interfaceRoot}/features/recovery/ShowRecoveryCode.tsx`;
  const theWrapModule = `${interfaceRoot}/services/vault/wrapKey.ts`;
  const aSyncModule = `${interfaceRoot}/services/sync/sync.ts`;

  describe('the service names it nowhere at all', () => {
    const serviceFiles = interfaceFilesOf(repositoryRoot, serviceRoot);

    it('finds no naming of it in the service today, and says how much it read', () => {
      // No homes, because the service has none. Every line that names a code is a leak here.
      expect(keyLeaksUnder(repositoryRoot, serviceFiles, []).map(describeKeyLeak)).toEqual([]);
      expect(serviceFiles.length).toBeGreaterThan(5);
      expect(serviceFiles).toContain(`${serviceRoot}/handlers/register.ts`);
    });

    it('refuses a registration body that grew a field for it', () => {
      const body = 'const { publicKey, recoveryCode } = JSON.parse(raw);\n';

      const [described] = recoveryCodeNamedIn(`${serviceRoot}/handlers/register.ts`, body, []).map(
        describeKeyLeak,
      );

      expect(described).toContain('handlers/register.ts');
      expect(described).toContain('recoveryCode');
    });

    it('refuses it written with a separator, which is how a column would spell it', () => {
      for (const spelling of ['recovery_code', 'recovery-code', 'Recovery Code', 'RECOVERYCODE']) {
        expect(
          recoveryCodeNamedIn(`${serviceRoot}/store/dynamo.ts`, `${spelling}\n`, []),
        ).toHaveLength(1);
      }
    });

    it('leaves the salt and the wrapped key alone, because the service holds both', () => {
      const stored =
        'recoverySalt: { B: account.recoverySalt },\nwrappedVaultKey: { B: wrapped },\n';

      expect(recoveryCodeNamedIn(`${serviceRoot}/store/dynamo.ts`, stored, [])).toEqual([]);
    });
  });

  describe('the application names it in two directories and nowhere else', () => {
    it('lets the screens that show it name it', () => {
      expect(recoveryCodeNamedIn(theRecoveryScreens, 'const recoveryCodeTestID = "x";\n')).toEqual(
        [],
      );
    });

    it('lets the module that wraps a key with it name it', () => {
      expect(recoveryCodeNamedIn(theWrapModule, 'drawRecoveryCode(random);\n')).toEqual([]);
    });

    it('refuses a sync module that carries it to the server', () => {
      const sending = 'await post("/v1/accounts", { recoveryCode: code });\n';

      const [described] = recoveryCodeNamedIn(aSyncModule, sending).map(describeKeyLeak);

      expect(described).toContain('services/sync/sync.ts');
      expect(described).toContain('her paper');
    });

    it('refuses a screen that puts it in an export', () => {
      const exporting = 'rows.push(["recovery code", code]);\n';

      expect(
        recoveryCodeNamedIn(`${interfaceRoot}/features/export/writeFile.ts`, exporting),
      ).toHaveLength(1);
    });

    it('is reported beside a log line from the same file, and not instead of it', () => {
      const both = 'console.warn("setting up");\nconst shown = recoveryCode;\n';

      expect(keyLeaksIn(aSyncModule, both).map((leak) => leak.reason)).toEqual([
        'logs',
        'names-the-recovery-code',
      ]);
    });
  });

  describe('the instant she confirmed is a keychain item like any other', () => {
    it('lets the module that holds it name it', () => {
      const source = `export const recoveryConfirmedItem = '${theConfirmation.item}';\n`;

      expect(keychainItemsNamedIn(`${theConfirmation.home}/recoveryConfirmed.ts`, source)).toEqual(
        [],
      );
    });

    it('refuses a screen that reads it directly', () => {
      expect(
        keychainItemsNamedIn(aScreen, `await getItemAsync('${theConfirmation.item}');\n`),
      ).toHaveLength(1);
    });
  });
});
