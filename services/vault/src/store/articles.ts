/**
 * What the service asks of its storage for an article. The catalogue is public writing about a
 * cycle phase, so nothing here names a reader and nothing here can be written to.
 */

/** An article item of the data model, as the service holds it. */
export interface StoredArticle {
  /** The slug, which is the sort key of the item and the only identifier an article has. */
  readonly slug: string;
  readonly title: string;
  /** Text. An article carries no url and no image, so reading one is one request and not two. */
  readonly body: string;
  /** A language tag, for example `en-GB`. */
  readonly language: string;
  readonly publishedAt: string;
  readonly revision: number;
  /** Where the wording came from, where anybody said. */
  readonly attribution: string | null;
}

/**
 * The one thing an article needs from storage. It takes a phase and never an account, because the
 * request it serves carries no account either, and a port that could take one would be a place to
 * start passing one.
 */
export interface ArticleStore {
  /** Every article written for a phase, in slug order. An unstocked phase answers with none. */
  readArticlesFor(phase: string): Promise<readonly StoredArticle[]>;
}
