// Generates src/styles/tokens.css from src/styles/tokens.json.
// Each colour is [light, dark]. The CSS follows one shape everywhere: light values on :root,
// dark values under the OS preference (unless the person picked light) and again under an
// explicit data-theme="dark", so the in-app theme switch wins in both directions.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export function renderTokensCss(tokens) {
  const entries = Object.entries(tokens.color);
  const block = (index, indent) => entries.map(([name, values]) => `${indent}--${name}: ${values[index]};`).join('\n');
  return `/* GENERATED from tokens.json by scripts/gen-tokens.mjs — do not edit by hand. Run: npm run tokens */
:root {
${block(0, '  ')}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${block(1, '    ')}
    color-scheme: dark;
  }
}
:root[data-theme='dark'] {
${block(1, '  ')}
  color-scheme: dark;
}
`;
}

if (process.argv[1] === here('./gen-tokens.mjs')) {
  const tokens = JSON.parse(readFileSync(here('../src/styles/tokens.json'), 'utf8'));
  writeFileSync(here('../src/styles/tokens.css'), renderTokensCss(tokens));
  console.log('tokens.css written');
}
