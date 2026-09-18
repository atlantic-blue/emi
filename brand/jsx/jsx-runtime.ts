/**
 * Markup for a page that is drawn once and looked at, which is why it is a string and not a tree:
 * the brand generators write a document, take a picture of it and exit.
 */
export interface Html {
  readonly html: string;
}

export type HtmlChild = Html | string | number | boolean | null | undefined | readonly HtmlChild[];

export interface HtmlProps {
  readonly children?: HtmlChild;
  readonly [attribute: string]: unknown;
}

export type Component = (props: HtmlProps) => Html;

const voidElements = new Set(['br', 'hr', 'img', 'link', 'meta']);

/** Written as it stands, because the specimen holds a style sheet and escaping would break it. */
export function raw(markup: string): Html {
  return { html: markup };
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isList(child: HtmlChild): child is readonly HtmlChild[] {
  return Array.isArray(child);
}

// A child that is already an element carries markup, so it goes through untouched. Anything else is
// text somebody typed, so it is escaped. Keeping the two apart is the reason Html is an object.
function render(child: HtmlChild): string {
  if (child === null || child === undefined || typeof child === 'boolean') {
    return '';
  }
  if (isList(child)) {
    return child.map(render).join('');
  }
  if (typeof child === 'object') {
    return child.html;
  }
  return escape(String(child));
}

export function jsx(type: string | Component, props: HtmlProps): Html {
  if (typeof type === 'function') {
    return type(props);
  }

  const { children, ...attributes } = props;
  const written = Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== false && value !== null)
    .map(([name, value]) => ` ${name}="${escape(String(value))}"`)
    .join('');

  if (voidElements.has(type)) {
    return raw(`<${type}${written}>`);
  }

  return raw(`<${type}${written}>${render(children)}</${type}>`);
}

export const jsxs = jsx;

export function Fragment(props: HtmlProps): Html {
  return raw(render(props.children));
}

export declare namespace JSX {
  type Element = Html;

  interface ElementChildrenAttribute {
    children: object;
  }

  interface IntrinsicElements {
    [tag: string]: HtmlProps;
  }
}
