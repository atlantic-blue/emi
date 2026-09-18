/**
 * The words of the unexpected bleeding control, in one place, so a test reads them without
 * rendering a screen. Design section 9.7 sets the line, and the rules the rest of them follow: say
 * what happens, never congratulate, and never use an exclamation mark.
 *
 * Two rules matter more here than anywhere else in the product. Emi gives her no advice, because
 * mid cycle bleeding is a question for a person who can examine her and Emi cannot. And Emi raises
 * no alarm, because the record is the thing she came to make and a warning over it would make her
 * put the phone down instead.
 */
export const unexpectedBleedingCopy = {
  /** The brand brief's own line, word for word. */
  invitation: 'Not your period? Log it. Emi will track the pattern.',
  mark: 'Not my period',
  /** What her mark did, said as the arithmetic behaves rather than as a reassurance. */
  marked: 'Kept in your record. Emi counts no cycle from this day.',
} as const;
