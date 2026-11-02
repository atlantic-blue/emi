import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

interface Options {
  boards: string;
  out: string;
  board: string;
  holes: Record<string, string>;
  widths: number[];
}

const ASSET_TYPES: Record<string, string> = { '2f3b95d653826b5ca02acab62e8534de': '.svg', '797e3d46d2df35dd822032622f5dc2e5': '.png' };
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function partsOf(source: string): { styles: string; body: string } {
  const start = source.indexOf('<x-dc>') + '<x-dc>'.length;
  const end = source.indexOf('</x-dc>');
  const inner = source.slice(start, end);
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(inner);
  const styles = helmet ? helmet[1].replace(/<\/?style>/g, '') : '';
  return { styles, body: inner.replace(/<helmet>[\s\S]*?<\/helmet>/, '') };
}

function inlineImports(body: string, boards: string, styles: string[]): string {
  return body.replace(/<dc-import name="([A-Za-z0-9]+)"[^>]*><\/dc-import>/g, (_match, name: string) => {
    const child = partsOf(readFileSync(join(boards, `${name}.dc.html`), 'utf8'));
    styles.push(child.styles);
    return inlineImports(child.body, boards, styles);
  });
}

export function renderBoard(options: Options): string {
  const board = partsOf(readFileSync(join(options.boards, `${options.board}.dc.html`), 'utf8'));
  const styles = [board.styles];
  let body = inlineImports(board.body, options.boards, styles);
  body = body.replace(/\son[A-Z][A-Za-z]*="\{\{[^}]*\}\}"/g, '');
  body = body.replace(/\{\{\s*([A-Za-z0-9_.$]+)\s*\}\}/g, (_match, name: string) => {
    const value = options.holes[name];
    if (value === undefined) throw new Error(`no value for the hole ${name}`);
    return value;
  });
  const css = styles.join('\n').replace(/url\("ds\/emi\/fonts\//g, 'url("fonts/');
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${options.board}</title>\n<style>\n${css}\n</style>\n</head>\n<body>\n${body.replace(/\/_blob\/([0-9a-f]{32})/g, (_match, id: string) => `assets/${id}${ASSET_TYPES[id] ?? ''}`)}\n</body>\n</html>\n`;
}

async function shoot(options: Options, html: string): Promise<void> {
  const page = join(options.out, `${options.board}.html`);
  writeFileSync(page, html);
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    for (const width of options.widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const tab = await context.newPage();
      await tab.goto(`file://${page}`);
      await tab.evaluate(() => document.fonts.ready);
      const height = await tab.evaluate(() => document.documentElement.scrollHeight);
      await tab.setViewportSize({ width, height });
      await tab.waitForTimeout(300);
      await tab.screenshot({ path: join(options.out, `${options.board}-${width}.png`) });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

const [boards, out, board, ...widths] = process.argv.slice(2);
if (!boards || !out || !board) throw new Error('usage: render.ts <boards> <out> <board> <width>...');
mkdirSync(join(out, 'fonts'), { recursive: true });
mkdirSync(join(out, 'assets'), { recursive: true });
const options: Options = {
  boards,
  out,
  board,
  holes: {
    day: '8',
    phaseLabel: 'FOLLICULAR PHASE',
    ringLabel: 'Cycle ring at day 8 of about 31, follicular phase.',
    markerTransform: `rotate(${(((8 - 0.5) / 31) * 360 - 90).toFixed(1)} 160 160)`,
    true: 'true',
  },
  widths: widths.map(Number),
};
for (const font of ['Newsreader16pt-Regular', 'Newsreader16pt-Medium', 'PlusJakartaSans-Regular', 'PlusJakartaSans-SemiBold', 'JetBrainsMono-Medium']) {
  copyFileSync(join(boards, 'ds', 'emi', 'fonts', `${font}.ttf`), join(out, 'fonts', `${font}.ttf`));
}
await shoot(options, renderBoard(options));
