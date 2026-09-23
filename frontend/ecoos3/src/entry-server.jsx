import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppRoutes } from './routes.jsx';

export { NOT_FOUND_PATH, PRERENDERED } from './routes.jsx';

// React 19 hoists <title>, <meta> and <link> to the front of the rendered string, ahead of the app markup. This peels them back off so they can go in <head>.
const HOISTED_HEAD = /^(?:<title>[\s\S]*?<\/title>|<(?:meta|link)\b[^>]*>)+/;

// Renders one route to the two pieces scripts/prerender.js drops into index.html.
export function render(path) {
  const markup = renderToString(
    <StaticRouter location={path}>
      <AppRoutes />
    </StaticRouter>,
  );

  const head = markup.match(HOISTED_HEAD)?.[0] ?? '';
  return { head, body: markup.slice(head.length) };
}
