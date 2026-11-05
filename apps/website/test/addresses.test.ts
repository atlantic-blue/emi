import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as everyAddress from '../lib/addresses';
import {
  JULIANS_PHOTOGRAPH,
  NO_PAGE_YET,
  SHARE_PREVIEW,
  SITE_ORIGIN,
  THE_EMI_BETA,
  THE_EMI_CODE,
  THE_EMI_COMMUNITY,
  THE_PRIVACY_INBOX,
  THE_SUPPORT_INBOX,
  thePrivacyAddress,
  theSupportAddress,
} from '../lib/addresses';
import { hostsIn, theOneHost } from '../lib/theOnePrice';
import { websiteWorkspace } from './stylesheet';

/**
 * The invite the operator gave for the Emi Community, written out here rather than imported from
 * the module under test. A test that read the address from the file it is checking would agree
 * with that file whatever the file said, and the invite is the one part of it nobody can derive.
 */
const theInvite = 'https://t.me/+89GgSCh6Ff85YTZk';

/**
 * Where the code is, written out for the same reason. It is the second host outside this site a
 * page names, and the page that explains the encryption rests on it: every claim there is one a
 * reader can go and check.
 */
const theCode = 'https://github.com/atlantic-blue/emi';

/**
 * Where Apple hands out the beta, written out for the same reason. It is the third host outside
 * this site a page names, and the support page is the one page that names it.
 */
const theBeta = 'https://testflight.apple.com/join/xFSv5Gqa';

/**
 * Every address the module hands a page, by the name a reader of the code sees. The module also
 * exports one reader of an address, so the entries are read as unknown and the strings picked out,
 * rather than declared to be strings and then filtered.
 */
const theAddresses = Object.entries<unknown>(everyAddress).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

describe('the addresses a page gives a browser', () => {
  it('holds every address a page of this site uses, and nothing that is not one', () => {
    expect(theAddresses.map(([name]) => name).sort()).toEqual([
      'JULIANS_PHOTOGRAPH',
      'NO_PAGE_YET',
      'SHARE_PREVIEW',
      'SITE_ORIGIN',
      'THE_EMI_BETA',
      'THE_EMI_CODE',
      'THE_EMI_COMMUNITY',
      'THE_PRIVACY_INBOX',
      'THE_SUPPORT_INBOX',
    ]);
  });

  it('writes each one whole, so a browser can follow it as it stands', () => {
    for (const [name, address] of theAddresses) {
      expect({ name, address }).toEqual({ name, address: address.trim() });
      expect({ name, spaced: /\s/.test(address) }).toEqual({ name, spaced: false });
      // A path, a page on another host, or an address a mail application answers. Those are the
      // three forms a press on this site carries, and nothing else is followable as it stands.
      expect({
        name,
        follows:
          address.startsWith('/') ||
          address.startsWith('https://') ||
          address.startsWith('mailto:'),
      }).toEqual({
        name,
        follows: true,
      });
    }
  });

  it('sends her to the community she was invited to, on the one host that is not Emi', () => {
    expect(THE_EMI_COMMUNITY).toBe(theInvite);

    const invited = new URL(THE_EMI_COMMUNITY);

    expect(invited.protocol).toBe('https:');
    expect(invited.host).toBe('t.me');
    expect(invited.pathname).toBe('/+89GgSCh6Ff85YTZk');
  });

  it('sends her to the code the page about the encryption invites her to read', () => {
    expect(THE_EMI_CODE).toBe(theCode);

    const open = new URL(THE_EMI_CODE);

    expect(open.protocol).toBe('https:');
    expect(open.host).toBe('github.com');
  });

  it('sends her to the beta on the host Apple hands it out from', () => {
    expect(THE_EMI_BETA).toBe(theBeta);

    const invited = new URL(THE_EMI_BETA);

    expect(invited.protocol).toBe('https:');
    expect(invited.host).toBe('testflight.apple.com');
    expect(invited.pathname).toBe('/join/xFSv5Gqa');
  });

  it('takes a privacy question to this site rather than to a mail company', () => {
    expect(THE_PRIVACY_INBOX).toBe('mailto:privacy@myemi.app');
    expect(thePrivacyAddress()).toBe('privacy@myemi.app');
    expect(thePrivacyAddress().split('@')[1]).toBe(theOneHost);
  });

  it('takes a question about using Emi to the address the support board writes', () => {
    expect(THE_SUPPORT_INBOX).toBe('mailto:hello@myemi.app');
    expect(theSupportAddress()).toBe('hello@myemi.app');
    expect(theSupportAddress().split('@')[1]).toBe(theOneHost);
    expect(THE_SUPPORT_INBOX).not.toBe(THE_PRIVACY_INBOX);
  });

  it('is the one file an outside host is written in, so one edit moves every link that uses it', () => {
    const source = readFileSync(join(websiteWorkspace, 'lib', 'addresses.ts'), 'utf8');
    const theThreeOutside = [theInvite, theCode, theBeta].map((address) => new URL(address).host);
    const outside = (text: string): string[] =>
      hostsIn(text).filter((host) => host !== theOneHost && !theThreeOutside.includes(host));

    expect(outside(source)).toEqual([]);

    for (const [name, address] of theAddresses) {
      expect({ name, outside: outside(address) }).toEqual({ name, outside: [] });
    }
  });

  it('points a link whose page nobody has issued at the page she is already reading', () => {
    expect(NO_PAGE_YET).toBe('/');
  });

  it('writes this site out whole for the one reader that cannot follow a path', () => {
    expect(SITE_ORIGIN).toBe('https://myemi.app');
    expect(new URL(SITE_ORIGIN).host).toBe(theOneHost);
    expect(SITE_ORIGIN.endsWith('/')).toBe(false);
  });

  it('offers the picture a chat draws as a file of this site', () => {
    expect(SHARE_PREVIEW).toBe('/share-preview.png');
    expect(hostsIn(SHARE_PREVIEW)).toEqual([]);
  });

  it('serves the face of one of the two founders as a file of this site', () => {
    expect(JULIANS_PHOTOGRAPH).toBe('/julian-tellez.jpg');
    expect(hostsIn(JULIANS_PHOTOGRAPH)).toEqual([]);
  });
});
