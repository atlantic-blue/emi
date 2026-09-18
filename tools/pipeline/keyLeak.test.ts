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
