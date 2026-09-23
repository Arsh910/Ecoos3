import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Landing } from './pages/Landing.jsx';
import { HowItWorks } from './pages/HowItWorks.jsx';
import { LargeFileTransfer } from './pages/LargeFileTransfer.jsx';
import { NotFound } from './pages/NotFound.jsx';
import { PageLoader } from './components/PageLoader.jsx';

// Loaded only when /app is opened, so the marketing pages never download or run the WebRTC code.
const App = lazy(() => import('./App.jsx'));

export const PRERENDERED = ['/', '/how-it-works', '/large-file-transfer'];
export const NOT_FOUND_PATH = '/404';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/large-file-transfer" element={<LargeFileTransfer />} />
      <Route path="/app" element={<Suspense fallback={<PageLoader />}><App /></Suspense>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
