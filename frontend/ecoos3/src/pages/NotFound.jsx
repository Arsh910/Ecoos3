import { Link } from 'react-router-dom';
import { SiteLayout } from './SiteLayout';

// Prerendered to dist/404.html, which Vercel serves with a real 404 status.
export function NotFound() {
  return (
    <SiteLayout
      path="/404"
      title="Page not found | ecoos3"
      description="That page doesn’t exist on ecoos3."
      noindex
    >
      <article className="prose">
        <h1>Page not found</h1>
        <p className="section__lead">
          That address doesn’t lead anywhere. The page may have moved, or the link may have a typo
          in it.
        </p>
        <p>
          Go back to the <Link to="/">home page</Link>, read{' '}
          <Link to="/how-it-works">how ecoos3 works</Link>, or{' '}
          <Link to="/app">start a transfer</Link>.
        </p>
      </article>
    </SiteLayout>
  );
}
