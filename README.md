# special-text

Show user-supplied names (fancy Unicode "nickname" styles, zalgo text, HTML-escaped strings) in a web page or WebView **without tofu boxes (□□)**.

```
Before:  𝒀𝒂𝒔□□□ ღ     『□𝐌𝐨𝐡𝐚𝐦𝐦𝐚𝐝』   ๖□□Ǥнσsτ   م□ح□م□د
After:   𝒀𝒂𝒔𝒊⃝⃭ ღ     『𝐌𝐨𝐡𝐚𝐦𝐦𝐚𝐝』    ๖Ǥнσsτ     محمد
```

Written for React/TypeScript apps that run in an Android WebView. It has no runtime dependencies.

## What's in here

| File | What it is |
| --- | --- |
| `specialText.ts` | `cleanSpecialText()` plus the CSS helpers for the font |
| `noto-decorative-subset.woff2` | ~97 KB Noto subset: math alphanumerics (𝐀 𝓐 𝔸 𝙰 …), letterlike symbols (ℳ ℛ …), combining marks for symbols, Balinese, Arabic math letters |
| `OFL.txt` | SIL Open Font License for the Noto glyphs; keep it next to the font |

## Usage

Copy `specialText.ts` and `noto-decorative-subset.woff2` into your project. Every name needs **both** halves: the cleaned text and the font stack. Either half alone still leaves boxes.

```tsx
import fontUrl from './noto-decorative-subset.woff2';
import { cleanSpecialText, specialTextFontFace, specialTextFontFamily } from './specialText';

// Once, at startup (or paste the generated CSS into your stylesheet).
const style = document.createElement('style');
style.textContent = `${specialTextFontFace(fontUrl)}
.special-text { font-family: ${specialTextFontFamily('IRANSansX')}; }`;
document.head.append(style);

// Everywhere a user-supplied name is rendered.
export function UserName({ name }: { name: string }) {
  return (
    <bdi dir="auto" className="special-text">
      {cleanSpecialText(name)}
    </bdi>
  );
}
```

Route **every** place that shows a name through one component like `UserName`. A single raw `{user.name}` in a list row brings the boxes back on that screen.

### With Tailwind

If you put the font stack in `tailwind.config.js` instead, **quote any family name that ends in a number**:

```js
fontFamily: {
  name: ['IRANSansX', /* … */, 'Noto Sans Symbols', '"Noto Sans Symbols 2"', 'Roboto', 'sans-serif'],
}
```

Tailwind outputs family names without quotes, and `Noto Sans Symbols 2` unquoted is invalid CSS. The browser then silently drops the **whole** `font-family` declaration and everything falls back to the default font. Check it in DevTools: the element's computed `font-family` should list `noto_decorative`. `specialTextFontFamily()` quotes every name for you.

## API

### `cleanSpecialText(text: string | null | undefined): string`

1. **Decodes HTML entities**: any numeric entity (`&#x27;`, `&#8217;`) plus `&amp; &lt; &gt; &quot; &apos; &nbsp;`. Entities past U+10FFFF are left as text instead of throwing.
2. **Drops combining marks the font can't draw** (see [How it works](#how-it-works)).
3. **Caps zalgo stacks** at two marks per run. One or two marks is a real accent; long stacks spill over the lines around them.

Normal text passes through unchanged: Persian harakat (`مُحَمَّد`), tatweel with harakat (`مـُـحـَمـَّد`), Quranic marks, ZWNJ, decomposed accents (`José`), Vietnamese, Greek, Hindi, Bengali, Thai, Hebrew niqqud, Japanese dakuten, flags, skin tones, ZWJ emoji and keycaps (`#️⃣`).

### `specialTextFontFace(fontUrl: string): string`

Returns the `@font-face` rule for the bundled subset (family `noto_decorative`). It uses a `unicode-range`, so the browser downloads the font only on pages that actually use those characters.

### `specialTextFontFamily(primaryFont: string): string`

Returns a quoted `font-family` value. It starts with your app font, then the emoji fonts, the decorative subset and the Noto script fonts, and ends with the system fallbacks.

### `SPECIAL_TEXT_FONT`

The family name, `'noto_decorative'`.

## How it works

When a font is missing a glyph, Chrome looks for a replacement font per **grapheme cluster**: a base character plus the combining marks stacked on it. It doesn't do this per character. If no single font has the base *and* all its marks, the whole cluster renders as boxes.

Nickname generators pile marks onto bases whose fonts never carry them:

| Example | Base (font) | Mark | Result |
| --- | --- | --- | --- |
| `𝐌̶` | math bold (noto-decorative) | strikethrough U+0336 | boxes |
| `م̶` | Persian letter (Naskh Arabic) | strikethrough | boxes |
| `『͜` | CJK bracket (Noto CJK) | double breve U+035C | boxes |
| `๖ۣۜ` | Thai digit (Noto Thai) | Arabic Quranic marks | boxes |
| `ꫀׁׅ` | Tai Viet letter | Hebrew points | boxes |

So `cleanSpecialText` keeps a mark only when the font that draws its base also has it:

| Base | Marks kept |
| --- | --- |
| Latin, Greek, Cyrillic letters and ASCII digits (Roboto) | the accent ranges Roboto covers |
| Math alphanumerics and letterlike symbols (noto-decorative) | the symbol marks U+20D0–20F0 that the subset has |
| Letters of other scripts (Arabic, Hebrew, Devanagari, Thai, …) | only marks of **their own** script |
| Symbols, punctuation, spaces, fullwidth letters | none |
| Anything | variation selectors U+FE0E/U+FE0F, and U+20E3 only on `0-9 # *` for keycaps |

The ranges were measured against the real Android font sets (Android 9, 10 and current), not guessed.

## Results

Measured by simulating Chrome's per-cluster font fallback on the Android font sets. The test set was 2,009 names scraped from Persian and English nickname sites and fancy-text generators:

| | Names with boxes (modern Android) |
| --- | --- |
| Raw text | 166 |
| Previous symbol-only rule | 144 |
| `cleanSpecialText` | 16 |

The remaining 16 are out of reach for any text filter:

- **Characters no Android font has**: very new emoji on older phones (🫧 🪷 on Android 9), rare symbols such as `ꟳ` `⮃`, and private-use characters like the Apple logo. The only fix would be bundling an emoji font.
- **`۝` directly before another character** (`۝Ð`). This may be a false positive in the simulation, so verify it on a device.

## Known limits

- **Android first.** The ranges come from Android's system fonts, which is what React Native WebViews use. iOS and desktop fonts weren't simulated, though desktop Chrome was spot-checked.
- **Enclosing circle placement.** The subset draws U+20DD (`⃝`) next to the letter instead of around it, because it has no mark-positioning data. It's visible, not a box.
- **Update the ranges if you change fonts.** Replacing Roboto, the subset or the font stack changes which marks can render.

## License

The Noto glyphs in `noto-decorative-subset.woff2` are © The Noto Project Authors, licensed under the [SIL Open Font License 1.1](OFL.txt).
