/**
 * The squares the site keeps beside its pages, and how to read one back.
 *
 * A browser asks for a different size depending on where it is about to draw the mark: a tab, a
 * bookmark, a home screen, a splash. The list of sizes is data here, so a size arriving or leaving
 * is one edit in one file, and neither the program that draws them nor the document that names
 * them carries a number of its own.
 */

/**
 * The two containers. A png is the file a tag names. The ico is the one address a browser asks for
 * on its own account, before any page has told it anything.
 */
export type Container = 'png' | 'ico';

/** Which link a document carries for a file: the icon of a tab, or the square a phone saves. */
export type Declaration = 'icon' | 'apple';

export interface IconFile {
  readonly name: string;
  readonly pixels: number;
  readonly container: Container;
  readonly declaration: Declaration;
  /** What asks for this size, one entry for each use. */
  readonly asks: readonly string[];
}

/** The drawing every file here is made from, the one the phone shows on her home screen. */
export const APPROVED_ICON = 'apps/mobile/assets/icon/emi-icon.svg';

/** Where the files go. Next.js copies this folder into the assets of the build under these names. */
export const ICON_FOLDER = 'apps/website/public';

export const iconFiles: readonly IconFile[] = [
  {
    name: 'favicon.ico',
    pixels: 32,
    container: 'ico',
    declaration: 'icon',
    asks: ['the address a browser asks for whether a page names it or not'],
  },
  {
    name: 'icon-16.png',
    pixels: 16,
    container: 'png',
    declaration: 'icon',
    asks: ['the tab of a desktop browser, at one device pixel for each pixel'],
  },
  {
    name: 'icon-32.png',
    pixels: 32,
    container: 'png',
    declaration: 'icon',
    asks: [
      'the tab of a desktop browser, at two device pixels for each pixel',
      'the list of bookmarks',
    ],
  },
  {
    name: 'icon-192.png',
    pixels: 192,
    container: 'png',
    declaration: 'icon',
    asks: ['the home screen of an Android phone'],
  },
  {
    name: 'icon-512.png',
    pixels: 512,
    container: 'png',
    declaration: 'icon',
    asks: ['the screen an Android phone draws while the page opens'],
  },
  {
    name: 'apple-touch-icon.png',
    pixels: 180,
    container: 'png',
    declaration: 'apple',
    asks: ['the home screen of an iPhone, which asks for this name and no other'],
  },
];

/** The address a browser asks the site for one of these files at. */
export function addressOf(file: IconFile): string {
  return `/${file.name}`;
}

export function mediaTypeOf(file: IconFile): string {
  return file.container === 'ico' ? 'image/x-icon' : 'image/png';
}

/** What the `sizes` attribute of a link tag says, which is the size the file really is. */
export function sizesOf(file: IconFile): string {
  return `${String(file.pixels)}x${String(file.pixels)}`;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/**
 * The size a png declares in its own header, rather than the size whoever wrote it meant. A file
 * that is not a png is refused by name here, because a tag that names a size nothing holds is the
 * fault this reader exists to find.
 */
export function pngSize(bytes: Uint8Array): Size {
  for (const [at, expected] of PNG_SIGNATURE.entries()) {
    if (bytes[at] !== expected) {
      throw new Error('the file does not start with the png signature');
    }
  }

  const view = viewOf(bytes);

  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export interface IcoEntry {
  readonly width: number;
  readonly height: number;
  /** Where the image of this entry starts in the file, and how long it is. */
  readonly at: number;
  readonly length: number;
}

const ICO_HEADER_BYTES = 6;

const ICO_ENTRY_BYTES = 16;

/**
 * The directory of an ico, which is a header saying how many images the file carries and then one
 * sixteen byte entry for each. A width of zero in an entry means 256, because the field is one
 * byte and 256 does not fit in it.
 */
export function icoEntries(bytes: Uint8Array): IcoEntry[] {
  const view = viewOf(bytes);

  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) {
    throw new Error('the file does not open as an ico holding icons');
  }

  const held = view.getUint16(4, true);
  const entries: IcoEntry[] = [];

  for (let index = 0; index < held; index += 1) {
    const from = ICO_HEADER_BYTES + index * ICO_ENTRY_BYTES;

    entries.push({
      width: view.getUint8(from) === 0 ? 256 : view.getUint8(from),
      height: view.getUint8(from + 1) === 0 ? 256 : view.getUint8(from + 1),
      length: view.getUint32(from + 8, true),
      at: view.getUint32(from + 12, true),
    });
  }

  return entries;
}

/** One square as a document names it to a browser, in the shape Next.js writes a link tag from. */
export interface IconLink {
  readonly url: string;
  readonly sizes: string;
  readonly type: string;
}

/**
 * What the document tells a browser, for one kind of link. A browser reads the sizes off the page
 * it has just opened and then asks for the one it is about to draw, so this list and the folder
 * are the same list or she gets a hole.
 */
export function iconLinks(declaration: Declaration): IconLink[] {
  return iconFiles
    .filter((file) => file.declaration === declaration)
    .map((file) => ({ url: addressOf(file), sizes: sizesOf(file), type: mediaTypeOf(file) }));
}
