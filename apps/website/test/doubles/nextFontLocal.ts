/**
 * `next/font/local` is a loader of the bundler: it copies the files, writes the rules that name
 * them and names the family itself, and a test runner does none of that. This double keeps what it
 * was asked for, so a test reads the files the site asks to serve, and it answers in the shape the
 * loader answers in. What the loader writes is read from the built stylesheet by
 * `test/builtSite.test.ts`, which reads a real build.
 */

export interface FontSource {
  readonly path: string;
  readonly weight?: string;
  readonly style?: string;
}

export interface LocalFontOptions {
  readonly src: readonly FontSource[];
  readonly display?: string;
  readonly variable?: string;
}

export interface LoadedFont {
  readonly className: string;
  readonly variable: string;
  readonly style: { readonly fontFamily: string };
}

/** Every call, in order, so a test reads the files and the variable the site asked for. */
export const fontLoaderCalls: LocalFontOptions[] = [];

/**
 * The loader answers with two class names and never with the name of the custom property: one
 * class that sets the face, and one that declares the property the theme reads. The names it
 * generates carry a hash of the files, so nothing may depend on these two strings.
 */
const servedFace = 'the-served-face';
const servedFaceVariable = 'the-served-face-variable';

export default function localFont(options: LocalFontOptions): LoadedFont {
  fontLoaderCalls.push(options);

  return {
    className: servedFace,
    variable: servedFaceVariable,
    style: { fontFamily: servedFace },
  };
}
