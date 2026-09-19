import type { PhaseName } from '@emi/tokens';
import { phaseNames } from '@emi/tokens';

/**
 * What a reader is handed about the phase she is in, and the one shape every source of it answers.
 *
 * The prototype draws this card under a label naming a clinical feed and a named reviewer. Emi has
 * neither, so the label is not written into a screen and not written here. What a card says about
 * where the words came from is the `attribution` the endpoint supplies with the words.
 */

/** A link is opened in a browser, so a scheme a browser refuses is not a link. */
const HTTPS = 'https://';

/**
 * One article. Every field is drawn, so an absent field is an article a screen cannot draw and is
 * refused before it reaches one.
 */
export interface Article {
  /** Stable across a rewording, so a reader who dismissed this one is not shown it again. */
  readonly id: string;
  /** The phase it was asked for. An article answering about another phase is refused. */
  readonly phase: PhaseName;
  readonly title: string;
  readonly body: string;
  /** Who wrote it and who, if anybody, read it after them. Drawn under the body. */
  readonly attribution: string;
  /**
   * Where the whole piece is, or nothing where there is no page to send her to. A piece with
   * nothing here is drawn without the control that opens one.
   */
  readonly link: string | null;
}

/** Where an article comes from. A screen calls this and never knows what answered it. */
export type ArticleSource = (phase: PhaseName) => Promise<Article | null>;

function readable(given: unknown): given is string {
  return typeof given === 'string' && given.trim().length > 0;
}

function linkable(given: unknown): given is string | null {
  return given === null || (readable(given) && given.startsWith(HTTPS));
}

/**
 * The shape check every answer passes, whatever answered. It returns nothing rather than throwing.
 * A server can change a field at any time. That is never a reason for a screen to fail.
 *
 * The phase is checked against the phase that was asked for. A source that answers about the wrong
 * phase is worse than a source that answers nothing, because the words would be drawn under the
 * wrong heading and read as true.
 */
export function articleFrom(given: unknown, asked: PhaseName): Article | null {
  if (given === null || typeof given !== 'object' || Array.isArray(given)) {
    return null;
  }

  const held = given as Record<string, unknown>;

  if (!readable(held.id) || !readable(held.title) || !readable(held.body)) {
    return null;
  }

  if (!readable(held.attribution) || !linkable(held.link)) {
    return null;
  }

  const phase = phaseNames.find((name) => name === held.phase);

  if (phase === undefined || phase !== asked) {
    return null;
  }

  return {
    id: held.id,
    phase,
    title: held.title,
    body: held.body,
    attribution: held.attribution,
    link: held.link,
  };
}
