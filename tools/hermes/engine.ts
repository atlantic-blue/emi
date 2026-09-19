import { join } from 'node:path';

/**
 * Which Hermes binary to run, by platform.
 *
 * `hermes-engine-cli` ships a virtual machine for macOS, for 64 bit Linux and for Windows. The
 * macOS build is a fat binary with an arm64 slice, so an Apple silicon machine runs it directly,
 * and the Linux build covers the runner the pipeline uses.
 *
 * Windows is left out rather than guessed at. Nobody here has run the tier on it, and a path
 * written from a manifest and never executed is worth less than a refusal that says so.
 */
export const enginePackage = 'hermes-engine-cli';

/** The engine this package ships. The application ships 0.17, which is a different build. */
export const engineVersion = '0.12.0';

const binaryByPlatform: Readonly<Record<string, string>> = {
  darwin: join('osx-bin', 'hermes'),
  linux: join('linux64-bin', 'hermes'),
};

/** Every platform this tier can run on, for a message that names them. */
export const runnablePlatforms: readonly string[] = Object.keys(binaryByPlatform);

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

/**
 * Refuses rather than falling back to Node. A tier that quietly ran on Node would report the
 * green it was built to refuse, so an unknown platform is a failure and never a skip.
 */
export function engineBinaryFor(platform: string, root: string): string {
  const relative = binaryByPlatform[platform];

  if (relative === undefined) {
    throw new EngineError(
      `this tier runs Hermes, and ${enginePackage} ships one for ${runnablePlatforms.join(' and ')} only, not for ${platform}. Run it on one of those rather than falling back to Node, because Node is the engine this tier exists to stop trusting.`,
    );
  }

  return join(root, 'node_modules', enginePackage, relative);
}
