import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * The port the suite starts the site on. Not 3000, because a run that attached to a development
 * server somebody left open would report on a site other than the one this repository builds.
 */
const port = 3100;

const ownSite = `http://127.0.0.1:${port}`;

/**
 * Where to read. With nothing set, the suite starts the site this repository builds and reads
 * that. With BASE_URL set it reads that host and starts nothing, which is how the same sentences
 * are read against the live site.
 */
const liveHost = process.env.BASE_URL;

/**
 * Three widths of one browser. A desktop, a tablet, and the phone most of the reading of myemi.app
 * happens on. A suite that only ever ran at one width cannot see the others, and a press that sits
 * off the side of a phone is a press she cannot reach.
 *
 * The tablet is here because the board changes the shape of the row of reviews at 1024 px as well
 * as at 641 px, and a width between the two is the only width that reads the middle shape.
 */
const widths = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'phone', width: 390, height: 844 },
] as const;

/** The sentences every copy of the site can answer, whether it was started here or deployed. */
const everywhere = 'e2e/features/*.feature';

/**
 * The sentences only the real host can answer. The headers come from the distribution, after the
 * origin has answered, and the moves between addresses come from a function at the edge, before a
 * request reaches the origin at all. A site started here has neither, so a run that read these
 * against itself would fail every one of them for the wrong reason.
 */
const liveOnly = 'e2e/live/*.feature';

export default defineConfig({
  testDir: defineBddConfig({
    features: liveHost === undefined ? everywhere : [everywhere, liveOnly],
    steps: 'e2e/steps/*.ts',
  }),
  fullyParallel: true,
  // A pass that needed a second attempt is a pass nobody can read. The suite reports what
  // happened the first time.
  retries: 0,
  forbidOnly: process.env.CI !== undefined,
  reporter: [['list'], ['json', { outputFile: 'e2e/report/scenarios.json' }]],
  use: {
    baseURL: liveHost ?? ownSite,
    trace: 'retain-on-failure',
  },
  projects: widths.map(({ name, width, height }) => ({
    name,
    use: { browserName: 'chromium', viewport: { width, height } },
  })),
  webServer:
    liveHost === undefined
      ? {
          command: `npm run start -- --port ${port}`,
          // The port rather than an address. Playwright reads an address and waits for a status
          // it accepts, and every address of this site answers 404 until the home page lands, so
          // a suite that waited for a page would wait out its whole timeout on a site that is
          // already up.
          port,
          reuseExistingServer: false,
          timeout: 180_000,
        }
      : undefined,
});
