import { Separator } from '@/components/ui/separator';

/** Who makes Emi. The page says it in words rather than in a mark, so a reader can read it aloud. */
export const MADE_BY = 'Emi is made by Atlantic Blue Solutions Limited.';

export function SiteFooter() {
  return (
    <footer className="bg-ground px-margin pb-marginMd pt-margin">
      <Separator className="mb-margin" />
      <p className="font-text text-body-sm text-secondaryText">{MADE_BY}</p>
    </footer>
  );
}
