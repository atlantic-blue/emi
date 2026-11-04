import config from '../playwright.config.ts';
import type { WhatTheSuiteDeclares } from './theConfiguration.ts';

const server = [config.webServer].flat()[0];

const projects = config.projects ?? [];

const declared: WhatTheSuiteDeclares = {
  baseURL: config.use?.baseURL ?? null,
  startsAServer: server !== undefined,
  serverCommand: server?.command ?? null,
  serverPort: server?.port ?? null,
  refusesAServerItDidNotStart: server?.reuseExistingServer === false,
  widths: projects
    .map((project) => project.use?.viewport?.width ?? Number.NaN)
    .sort((one, other) => one - other),
  browsers: projects.map((project) => project.use?.browserName ?? 'none named'),
  gherkin: Object.values(
    JSON.parse(process.env.PLAYWRIGHT_BDD_CONFIGS ?? '{}') as Record<
      string,
      { features?: string | string[] }
    >,
  ).filter((entry) => entry.features !== undefined),
};

process.stdout.write(JSON.stringify(declared));
