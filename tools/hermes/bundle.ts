import { join } from 'node:path';

/**
 * One script out of the entry file, built by the bundler the application already uses. Metro is
 * what puts the phone's bundle together, so the tier reads the same resolution and runs the same
 * transforms rather than a second opinion about them.
 *
 * The project root is the tier's own directory and not the repository root, because the babel
 * configuration a bare engine needs is not the one the rest of the repository needs. Babel reads
 * its root configuration beside the project root, and `babel.config.json` there is that file. The
 * repository is a watch folder, so a case still imports across the workspace.
 */

export interface BundleRequest {
  /** The tier's own directory, which holds the entry file and the babel configuration. */
  readonly bundleRoot: string;
  readonly repositoryRoot: string;
  /** Where to write the one script. It is thrown away after the run. */
  readonly out: string;
}

/**
 * The platform name handed to the bundler. Metro asks for one, and every name a phone uses
 * carries a React Native runtime this tier has none of, so it is told plainly what this is.
 */
export const bundlePlatform = 'hermes';

/** The one file the bundle starts at. */
export function bundleEntryIn(bundleRoot: string): string {
  return join(bundleRoot, 'entry.ts');
}

export async function buildBundle(request: BundleRequest): Promise<string> {
  const metro = await import('metro');
  const { getDefaultConfig, mergeConfig } = await import('metro-config');

  const base = await getDefaultConfig(request.bundleRoot);
  const config = mergeConfig(base, {
    projectRoot: request.bundleRoot,
    watchFolders: [request.repositoryRoot],
    resolver: {
      nodeModulesPaths: [join(request.repositoryRoot, 'node_modules')],
      disableHierarchicalLookup: true,
      sourceExts: ['ts', 'tsx', 'js', 'json'],
    },
    // The bundle is thrown away after the run, so a cache of it would only be a way for a stale
    // one to be read as this run's.
    cacheStores: [],
    reporter: { update: () => undefined },
  });

  // metro carries a second copy of metro-config inside itself, so the config one package builds
  // is not the config the other declares it takes, even though the two describe one shape. Same
  // trap as the two copies of React that apps/mobile/jest.config.js maps away.
  await metro.runBuild(config as unknown as Parameters<typeof metro.runBuild>[0], {
    entry: bundleEntryIn(request.bundleRoot),
    out: request.out,
    platform: bundlePlatform,
    dev: false,
    minify: false,
  });

  return request.out;
}
