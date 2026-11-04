import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

type Value = string | number | boolean | Value[] | { [key: string]: Value } | ((...args: unknown[]) => void);
type Values = Record<string, Value>;

const ASSET_TYPES: Record<string, string> = {
  '2f3b95d653826b5ca02acab62e8534de': '.svg',
  '797e3d46d2df35dd822032622f5dc2e5': '.png',
  '6e729d88dd383b7daefa60754399ad31': '.svg',
};
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const INTER = '@font-face{font-family:"Inter";src:url("fonts/Inter-400.woff2");font-weight:400}\n@font-face{font-family:"Inter";src:url("fonts/Inter-600.woff2");font-weight:600}';

interface Parts {
  styles: string;
  body: string;
  script: string;
}

function partsOf(source: string): Parts {
  const start = source.indexOf('<x-dc>') + '<x-dc>'.length;
  const inner = source.slice(start, source.indexOf('</x-dc>'));
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(inner);
  const styles = helmet ? helmet[1].replace(/<link[^>]*>/g, '').replace(/<\/?style>/g, '') : '';
  const script = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(source.slice(source.indexOf('</x-dc>')));
  return { styles, body: inner.replace(/<helmet>[\s\S]*?<\/helmet>/, ''), script: script ? script[1] : '' };
}

function valuesOf(script: string): Values {
  if (!script.includes('class Component')) return {};
  const make = new Function(
    `class DCLogic { constructor(props) { this.props = props; this.state = {}; } setState(next) { Object.assign(this.state, next); } }\n${script}\nreturn new Component({});`,
  ) as () => { renderVals(): Values };
  return make().renderVals();
}

function lookup(values: Values, path: string): Value | undefined {
  let current: Value | undefined = values;
  for (const key of path.split('.')) {
    if (current === undefined || typeof current !== 'object' || Array.isArray(current) || typeof current === 'function') return undefined;
    current = (current as Record<string, Value>)[key];
  }
  return current;
}

function fill(body: string, values: Values): string {
  let out = body.replace(/<sc-for list="\{\{\s*([A-Za-z0-9_.]+)\s*\}\}" as="([A-Za-z0-9_]+)"[^>]*>([\s\S]*?)<\/sc-for>/g, (_match, list: string, name: string, template: string) => {
    const items = lookup(values, list);
    if (!Array.isArray(items)) throw new Error(`the list ${list} is not an array`);
    return items.map((item) => fill(template, { ...values, [name]: item })).join('');
  });
  out = out.replace(/\son[A-Z][A-Za-z]*="\{\{[^}]*\}\}"/g, '');
  return out.replace(/\{\{\s*([A-Za-z0-9_.$]+)\s*\}\}/g, (_match, path: string) => {
    const value = lookup(values, path);
    if (value === undefined || typeof value === 'object' || typeof value === 'function') throw new Error(`no value for the hole ${path}`);
    return String(value);
  });
}

function inlineImports(body: string, boards: string, styles: string[]): string {
  return body.replace(/<dc-import name="([A-Za-z0-9]+)"[^>]*><\/dc-import>/g, (_match, name: string) => {
    const child = partsOf(readFileSync(join(boards, `${name}.dc.html`), 'utf8'));
    styles.push(child.styles);
    return fill(inlineImports(child.body, boards, styles), valuesOf(child.script));
  });
}

export function renderBoard(boards: string, board: string): string {
  const parts = partsOf(readFileSync(join(boards, `${board}.dc.html`), 'utf8'));
  const styles = [INTER, parts.styles];
  const body = fill(inlineImports(parts.body, boards, styles), valuesOf(parts.script));
  const css = styles.join('\n').replace(/url\("ds\/emi\/fonts\//g, 'url("fonts/');
  const page = body.replace(/\/_blob\/([0-9a-f]{32})/g, (_match, id: string) => `assets/${id}${ASSET_TYPES[id] ?? ''}`);
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${board}</title>\n<style>\n${css}\n</style>\n</head>\n<body>\n${page}\n</body>\n</html>\n`;
}

async function shoot(out: string, board: string, widths: number[]): Promise<void> {
  const page = join(out, `${board}.html`);
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const tab = await context.newPage();
      await tab.goto(`file://${page}`);
      await tab.evaluate(() => document.fonts.ready);
      const height = await tab.evaluate(() => document.documentElement.scrollHeight);
      await tab.setViewportSize({ width, height });
      await tab.waitForTimeout(300);
      await tab.screenshot({ path: join(out, `${board}-${width}.png`) });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

const [boards, out, board, ...widths] = process.argv.slice(2);
if (!boards || !out || !board) throw new Error('usage: render2.ts <boards> <out> <board> <width>...');
mkdirSync(join(out, 'fonts'), { recursive: true });
mkdirSync(join(out, 'assets'), { recursive: true });
for (const font of ['Newsreader16pt-Regular', 'Newsreader16pt-Medium', 'PlusJakartaSans-Regular', 'PlusJakartaSans-SemiBold', 'JetBrainsMono-Medium']) {
  copyFileSync(join(boards, 'ds', 'emi', 'fonts', `${font}.ttf`), join(out, 'fonts', `${font}.ttf`));
}
for (const weight of [400, 600]) copyFileSync(join(import.meta.dirname, 'inter', `Inter-${weight}.woff2`), join(out, 'fonts', `Inter-${weight}.woff2`));
writeFileSync(join(out, `${board}.html`), renderBoard(boards, board));
await shoot(out, board, widths.map(Number));
