// Display-time string formatters for user-entered fields.
//
// Policy: never mutate user input on save. Store the user's bytes verbatim and
// normalize for display at the read site. This keeps the database faithful to
// what the user typed while presenting consistent, polished output everywhere.

const SMALL_WORDS = new Set(["of", "the", "and", "in", "at", "on", "to", "for", "de", "del", "la", "le"]);

function titleCaseWord(word: string, isFirst: boolean): string {
  if (!word) return word;
  // Preserve all-caps acronyms (USA, DC, MIT, NASA). Cap at 4 chars so a
  // user typing "VINAY KUMAR" still gets normalized to "Vinay Kumar".
  if (word.length >= 2 && word.length <= 4 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) return word;
  const lower = word.toLowerCase();
  if (!isFirst && SMALL_WORDS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Title-case a string at word boundaries. Preserves all-caps acronyms and
 *  small connector words. */
export function toTitleCase(input: string | null | undefined): string {
  if (!input) return "";
  // Split on whitespace AND keep separators (comma, hyphen, slash) so each
  // logical word gets capitalized even after a punctuation boundary.
  return input
    .split(/(\s+|[,\-/])/)
    .map((seg, i) => (/^\s+$/.test(seg) || /^[,\-/]$/.test(seg) ? seg : titleCaseWord(seg, i === 0)))
    .join("")
    .trim();
}

/** Display a person's name. Title-cased; preserves apostrophes (O'Brien). */
export function formatName(name: string | null | undefined): string {
  return toTitleCase(name);
}

/** Display a place string ("erode, tamil nadu, india" → "Erode, Tamil Nadu, India"). */
export function formatPlace(place: string | null | undefined): string {
  return toTitleCase(place);
}
