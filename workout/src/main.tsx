import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App';

const ContactSheet = lazy(() => import('./screens/ContactSheet'));
const isSheet = location.hash.startsWith('#/dev/contact-sheet');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSheet ? <Suspense fallback={null}><ContactSheet /></Suspense> : <App />}
  </StrictMode>,
);
