import { expect } from '@playwright/test';
import type { Request, Response } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

import { test } from './fixtures';

/**
 * The words are written out here rather than imported from the page. A test that reads them from
 * the same constant the page draws them from agrees with the page whatever the page says.
 */
const theHeadlineSheReads = 'This page does not exist';

const thePressBackToEmi = 'Go to the Emi home page';

/** The two moves a browser and a search engine each keep for good. */
const thePermanentMoves = [301, 308];

const { Given, Then } = createBdd(test);

/**
 * Every move the browser followed to reach this answer, the newest first. A browser follows a move
 * and then holds the last answer, so the moves are walked back from where she ended rather than
 * read as they happened.
 */
function theMovesBefore(answer: Response): Request[] {
  const moves: Request[] = [];
  let earlier = answer.request().redirectedFrom();

  while (earlier !== null) {
    moves.push(earlier);
    earlier = earlier.redirectedFrom();
  }

  return moves;
}

Given(
  'a woman opens {string}, which this site does not have',
  async ({ page, answered }, address: string) => {
    const answer = await page.goto(address);

    if (answer === null) {
      throw new Error(`The browser opened ${address} and reported no answer to read.`);
    }

    const moves = theMovesBefore(answer);
    const first = moves[moves.length - 1];
    const whatItSaid = first === undefined ? null : await first.response();

    answered.status = answer.status();
    answered.landedOn = new URL(answer.url()).pathname;
    answered.moves = moves.length;
    answered.movedBy = whatItSaid === null ? null : whatItSaid.status();
  },
);

Then('the site sends her on to {string}, once and permanently', ({ answered }, address: string) => {
  expect(answered.moves).toBe(1);
  // Which of the two permanent moves the framework picks is not something she reads, and not
  // something a search engine keeps. That the move is permanent is both.
  expect(thePermanentMoves).toContain(answered.movedBy);
  expect(answered.landedOn).toBe(address);
});

Then('the site answers that there is no such page', async ({ answered }) => {
  expect(answered.status).toBe(404);
});

Then('she reads that the page does not exist', async ({ page }) => {
  await expect(page.getByText(theHeadlineSheReads)).toBeVisible();
});

Then('the press back to Emi is on the page, inside the screen she holds', async ({ page }) => {
  const pressBack = page.getByRole('link', { name: thePressBackToEmi });

  await expect(pressBack).toBeVisible();
  await expect(pressBack).toHaveAttribute('href', '/');

  const screen = page.viewportSize();
  const box = await pressBack.boundingBox();

  if (screen === null || box === null) {
    throw new Error('The browser reported no screen size, or no box for the press back to Emi.');
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(screen.width);
});
