// Renders user-supplied names (decorative Unicode, zalgo, html-escaped text) without
// tofu boxes. Needs both halves: run text through cleanSpecialText, and give the
// element the font stack from specialTextFontFamily with specialTextFontFace loaded.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/* eslint-disable no-misleading-character-class -- matching combining marks is the point */
const COMBINING_MARKS_RUN =
  /[\u{0300}-\u{036F}\u{1AB0}-\u{1AFF}\u{1DC0}-\u{1DFF}\u{20D0}-\u{20FF}\u{FE20}-\u{FE2F}]{3,}/gu;

// The browser falls back per whole cluster, so a mark renders only when the font
// drawing its base holds it too, otherwise the cluster is tofu boxes. The ranges
// are what Android's Roboto and the noto-decorative subset carry.
const MARKS_BY_BASE: [base: RegExp, marks: RegExp][] = [
  [
    /[\p{sc=Latin}\p{sc=Greek}\p{sc=Cyrillic}0-9]/u,
    /[\u{0300}-\u{036F}\u{0483}-\u{0489}\u{1AB0}-\u{1ABE}\u{1DC0}-\u{1DF5}\u{1DFC}-\u{1DFF}\u{A66F}-\u{A672}\u{A674}-\u{A67D}\u{FE20}-\u{FE2D}]/u,
  ],
  [/[\u{1D400}-\u{1D7FF}\u{2100}-\u{214F}]/u, /[\u{20D0}-\u{20DF}\u{20E1}\u{20E4}-\u{20F0}]/u],
];
/* eslint-enable no-misleading-character-class */

// Any other script's font carries only that script's marks.
const SCRIPTS_WITH_MARKS =
  'Arabic Hebrew Syriac Devanagari Bengali Tamil Thai Lao Tibetan Myanmar Khmer Balinese Javanese Hiragana Katakana'
    .split(' ')
    .map((script) => new RegExp(`\\p{scx=${script}}`, 'u'));

const keepMark = (base: string, mark: string) => {
  // Variation selectors pick emoji presentation; U+20E3 turns #, * and digits into key emoji.
  if (mark === '\u{FE0E}' || mark === '\u{FE0F}') return true;
  if (mark === '\u{20E3}') return /[0-9#*]/.test(base);
  if (/[\p{S}\p{P}\p{Z}\u{FF21}-\u{FF5A}]/u.test(base)) return false;
  const marks = MARKS_BY_BASE.find(([pattern]) => pattern.test(base))?.[1];
  if (marks) return marks.test(mark);
  return SCRIPTS_WITH_MARKS.some((script) => script.test(base) && script.test(mark));
};

const dropUnsupportedMarks = (text: string) =>
  text.replace(
    /(^|\P{M})(\p{M}+)/gu,
    (_, base: string, marks: string) =>
      base + [...marks].filter((mark) => keepMark(base, mark)).join(''),
  );

// One or two marks is a real diacritic; longer zalgo stacks overflow the line.
const capCombiningMarks = (text: string) =>
  text.replace(COMBINING_MARKS_RUN, (run) => run.slice(0, 2));

const decodeEntities = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const codePoint =
        entity[1]?.toLowerCase() === 'x'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      // fromCodePoint throws past U+10FFFF, which would crash the whole render.
      return Number.isNaN(codePoint) || codePoint > 0x10ffff
        ? match
        : String.fromCodePoint(codePoint);
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });

export function cleanSpecialText(text: string | null | undefined): string {
  return capCombiningMarks(dropUnsupportedMarks(decodeEntities(String(text ?? ''))));
}

export const SPECIAL_TEXT_FONT = 'noto_decorative';

// fontUrl points at noto-decorative-subset.woff2 as the bundler serves it.
export const specialTextFontFace = (fontUrl: string) => `@font-face {
  font-family: '${SPECIAL_TEXT_FONT}';
  font-weight: 100 900;
  src: url('${fontUrl}') format('woff2');
  unicode-range: U+1B00-1B7F, U+20D0-20F0, U+25CC, U+2100-214F, U+1D400-1D7FF, U+1EE00-1EEFF;
  font-display: block;
}`;

// Every name is quoted: an unquoted family ending in a number (Noto Sans Symbols 2)
// is invalid CSS and silently drops the whole font-family declaration.
export const specialTextFontFamily = (primaryFont: string) =>
  [
    primaryFont,
    'Noto Color Emoji',
    'Segoe UI Emoji',
    'Apple Color Emoji',
    SPECIAL_TEXT_FONT,
    'Noto Sans',
    'Noto Naskh Arabic',
    'Noto Sans Bengali',
    'Noto Sans Devanagari',
    'Noto Sans Tamil',
    'Noto Sans Thai',
    'Noto Sans Hebrew',
    'Noto Sans Armenian',
    'Noto Sans Georgian',
    'Noto Sans Symbols',
    'Noto Sans Symbols 2',
    'Segoe UI',
    'Roboto',
    'Arial',
  ]
    .map((family) => `'${family}'`)
    .concat('system-ui', 'sans-serif')
    .join(', ');
