// Turns each marketing route into a static HTML file, so crawlers and social preview bots get real content instead of an empty <div id="root">.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const { NOT_FOUND_PATH, PRERENDERED, render } = await import(
  pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href
);
const template = await readFile(join(dist, 'index.html'), 'utf8');
const fileFor = (path) => (path === '/' ? 'index.html' : `${path.slice(1)}.html`);

async function writePage(route, file) {
  const { head, body } = render(route);
  const html = template
    .replace('</head>', `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  await writeFile(join(dist, file), html);
  console.log(`prerendered ${route} -> dist/${file}`);
}

for (const route of PRERENDERED) {
  await writePage(route, fileFor(route));
}

await writePage(NOT_FOUND_PATH, '404.html');
await writeFile(join(dist, 'app.html'), template);

console.log('copied shell -> dist/app.html');
