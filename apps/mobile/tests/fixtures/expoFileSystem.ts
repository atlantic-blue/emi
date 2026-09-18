import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The application writes its export through expo-file-system, which has no implementation off a
 * phone. This stands in for it with a real directory on this machine, so the bytes a test reads
 * back are bytes that were written rather than a value a double remembered.
 *
 * It refuses what the module refuses: creating a file that is already there, creating one in a
 * directory that does not exist, and reading or writing one that was never created. A double that
 * took more than the phone takes would make the suite green over a product that fails.
 */

let root: string | undefined;

function storage(): string {
  root ??= mkdtempSync(join(tmpdir(), 'emi-phone-'));

  return root;
}

/** A fresh install: every file the phone held is gone. */
export function resetExpoFileSystem(): void {
  if (root !== undefined) {
    rmSync(root, { force: true, recursive: true });
  }
  root = undefined;
}

/** What the phone holds, so a test reads a file by the name the application gave it. */
export function fileOnThePhone(name: string): string {
  return readFileSync(join(directoryOf('cache'), name), 'utf8');
}

export class Directory {
  readonly uri: string;

  constructor(uri: string) {
    this.uri = uri;
  }
}

export class Paths {
  static get cache(): Directory {
    return new Directory(pathToFileURL(directoryOf('cache')).href);
  }

  static get document(): Directory {
    return new Directory(pathToFileURL(directoryOf('document')).href);
  }
}

export interface FileCreateOptions {
  readonly overwrite?: boolean;
}

export class File {
  readonly uri: string;

  constructor(parent: Directory | File | string, ...parts: readonly string[]) {
    const base = typeof parent === 'string' ? parent : parent.uri;

    this.uri = [base.replace(/\/$/, ''), ...parts].join('/');
  }

  get exists(): boolean {
    return existsSync(this.path);
  }

  get size(): number {
    return this.exists ? statSync(this.path).size : 0;
  }

  create(options: FileCreateOptions = {}): void {
    if (this.exists && options.overwrite !== true) {
      throw new Error(`Unable to create file '${this.uri}', the destination already exists.`);
    }

    const holding = this.path.slice(0, this.path.lastIndexOf('/'));

    if (!existsSync(holding)) {
      throw new Error(`Unable to create file '${this.uri}', the containing directory is missing.`);
    }

    writeFileSync(this.path, '');
  }

  write(content: string): void {
    if (!this.exists) {
      throw new Error(`Unable to write to file '${this.uri}', it does not exist.`);
    }

    writeFileSync(this.path, content);
  }

  text(): string {
    if (!this.exists) {
      throw new Error(`Unable to read file '${this.uri}', it does not exist.`);
    }

    return readFileSync(this.path, 'utf8');
  }

  delete(): void {
    if (!this.exists) {
      throw new Error(`Unable to delete file '${this.uri}', it does not exist.`);
    }

    rmSync(this.path);
  }

  private get path(): string {
    return this.uri.replace('file://', '');
  }
}

/** The one directory the export writes into, and the one beside it the module also offers. */
function directoryOf(name: 'cache' | 'document'): string {
  const path = join(storage(), name);

  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }

  return path;
}
