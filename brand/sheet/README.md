# The brand sheet

One page carrying the whole brand: the mark, the application icon, every colour with the ratio
somebody measured it at, the type scale, the ring in three states, the twenty icons and the three
onboarding pieces.

Two files are committed here.

    brand/sheet/brand-sheet.html   the page, written by the generator
    brand/sheet/brand-sheet.png    the picture of it, for a person to look at

Write them both again after any change to a token, a drawing or the page itself:

    npm run generate:sheet

That needs a browser. Set `EMI_BROWSER` to a Chromium or Chrome binary if the generator cannot
find one. The markup on its own needs no browser:

    npm run check:sheet

## Why the markup is committed and the picture is not checked

Nothing on the page is typed here. The colours, the sizes, the ring arcs and the icon bodies come
from `packages/tokens`, and the mark and the illustrations are read from the files the application
ships. So the page is a function of the repository, and the pipeline runs `npm run check:sheet` to
write it again and refuse the commit when the committed copy and the generator disagree.

The picture is a different kind of artifact. A browser rasterises text differently between
versions and between machines, so two correct runs produce two different files. Comparing the
picture byte for byte would fail for reasons that have nothing to do with the brand. The markup
carries every value, so the markup is what the pipeline compares, and the picture is what a person
looks at.

## The application icon

`brand/icon` does not exist yet, so the icon on this page is composed here from
`brand/logo/emi-ring.svg`: the ring alone, on the stone ground, at 56 percent of the width and
sitting slightly above the middle, which is what section 9.2 of the design asks for. The numbers
are in `assets.ts`. When the icon generator is built it takes those numbers from here, or this
page changes with it.

## What proves it

`brand/tests/1.7.test.ts` reads the committed page and asks whether every colour, every size,
every arc, every icon and every piece is on it, and whether each printed ratio is the ratio
`contrastRatio` computes. It then moves a token and reads what the page says, which is the drift
the pipeline job exists to catch.
