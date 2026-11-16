// Builds the prototype as ONE self-contained HTML file: scripts, styles and fonts inlined,
// no service worker, no other requests. Two outputs in dist-single/:
//   cyclecare.html  — a complete document; open it or host it anywhere
//   artifact.html   — the same page as a body fragment (title, style, markup, script),
//                     for hosts that supply their own <html>/<head> skeleton
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
execFileSync('npx', ['vite', 'build', '--mode', 'single'], { cwd: root, stdio: 'inherit' });

const dist = `${root}dist-single/`;
const html = readFileSync(`${dist}index.html`, 'utf8');
const scriptPath = /<script[^>]+src="\.\/(assets\/[^"]+\.js)"/.exec(html)?.[1];
const stylePath = /<link[^>]+href="\.\/(assets\/[^"]+\.css)"/.exec(html)?.[1];
if (!scriptPath || !stylePath) throw new Error('Could not find the built script or stylesheet in index.html');

// Closing tags inside inlined code would end the element early.
const script = readFileSync(dist + scriptPath, 'utf8').replace(/<\/script/gi, '<\\/script');
const style = readFileSync(dist + stylePath, 'utf8').replace(/<\/style/gi, '<\\/style');
for (const [name, text] of [
  ['script', script],
  ['style', style],
]) {
  if (/url\(\s*["']?\.{0,2}\//.test(text)) throw new Error(`The inlined ${name} still references a separate file`);
}

const title = '<title>CycleCare</title>';
const fragment = [
  title,
  // Declares that the page keeps its own side gutters clear of system bars (see --gutter-l / --gutter-r).
  '<meta name="claude:viewport-fit-sides" content="cover">',
  `<style>${style}</style>`,
  '<div id="root"></div>',
  `<script type="module">${script}</script>`,
  '',
].join('\n');

const page = `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="referrer" content="no-referrer">
</head>
<body>
${fragment}</body>
</html>
`;

writeFileSync(`${dist}artifact.html`, fragment);
writeFileSync(`${dist}cyclecare.html`, page);
const kb = (text) => `${Math.round(Buffer.byteLength(text) / 1024)} kB`;
console.log(`dist-single/cyclecare.html ${kb(page)}, dist-single/artifact.html ${kb(fragment)}`);
