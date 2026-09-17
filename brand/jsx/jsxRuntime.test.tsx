/** @jsxImportSource . */
import { Fragment, Html, raw } from './jsx-runtime';

function markup(element: Html): string {
  return element.html;
}

describe('the markup a brand page is written in', () => {
  it('writes an element with its attributes and its children', () => {
    expect(markup(<p class="row">Day 14</p>)).toBe('<p class="row">Day 14</p>');
  });

  it('closes nothing that the language does not close', () => {
    expect(markup(<br />)).toBe('<br>');
    expect(markup(<meta charset="utf-8" />)).toBe('<meta charset="utf-8">');
  });

  it('escapes text, so a sentence with a bracket in it cannot open a tag', () => {
    expect(markup(<p>{'flow < light & <b>heavy</b>'}</p>)).toBe(
      '<p>flow &lt; light &amp; &lt;b&gt;heavy&lt;/b&gt;</p>',
    );
  });

  it('escapes an attribute, so a quotation mark cannot end it early', () => {
    expect(markup(<div title={'a "quoted" face'} />)).toBe(
      '<div title="a &quot;quoted&quot; face"></div>',
    );
  });

  it('leaves markup that is already an element alone, so nesting does not double escape', () => {
    expect(
      markup(
        <div>
          <span>{'a & b'}</span>
        </div>,
      ),
    ).toBe('<div><span>a &amp; b</span></div>');
  });

  it('writes a style sheet as it stands, because escaping one would break it', () => {
    expect(markup(<style>{raw('.row > div { content: "&"; }')}</style>)).toBe(
      '<style>.row > div { content: "&"; }</style>',
    );
  });

  it('drops a child that is nothing, so a condition needs no branch of its own', () => {
    expect(
      markup(
        <p>
          {false}
          {null}
          {undefined}
          Day 14
        </p>,
      ),
    ).toBe('<p>Day 14</p>');
  });

  it('drops an attribute that is nothing, and keeps one that is empty', () => {
    expect(markup(<div hidden={false} title={undefined} class="" />)).toBe('<div class=""></div>');
  });

  it('writes a list of children in the order they are given', () => {
    const digits = ['1111', '0000'];

    expect(
      markup(
        <div>
          {digits.map((line) => (
            <span>{line}</span>
          ))}
        </div>,
      ),
    ).toBe('<div><span>1111</span><span>0000</span></div>');
  });

  it('adds nothing of its own around a fragment', () => {
    expect(
      markup(
        <Fragment>
          <p>one</p>
          <p>two</p>
        </Fragment>,
      ),
    ).toBe('<p>one</p><p>two</p>');
  });
});
