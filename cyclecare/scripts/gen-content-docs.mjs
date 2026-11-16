// Writes docs/04-…md and docs/05-…md from the app's own content modules.
// The modules are TypeScript, so they are loaded through Vite (already a dev dependency).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { renderLegalDoc, renderTipsDoc } from './content-docs.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true },
});
try {
  const tips = await server.ssrLoadModule('/src/content/ro/tips.ts');
  const legal = await server.ssrLoadModule('/src/content/ro/legal.ts');
  const { ro } = await server.ssrLoadModule('/src/i18n/ro.ts');
  const { THRESHOLDS, FLAG_SEVERITY } = await server.ssrLoadModule('/src/domain/insights.ts');
  const { SYMPTOM_GROUPS } = await server.ssrLoadModule('/src/domain/types.ts');
  writeFileSync(`${root}docs/04-sablon-continut-sfaturi.md`, renderTipsDoc({ tips, ro, thresholds: THRESHOLDS, severity: FLAG_SEVERITY, symptomGroups: SYMPTOM_GROUPS }));
  writeFileSync(`${root}docs/05-consimtamant-si-confidentialitate.md`, renderLegalDoc({ legal }));
  console.log('docs/04-sablon-continut-sfaturi.md and docs/05-consimtamant-si-confidentialitate.md written');
} finally {
  await server.close();
}
