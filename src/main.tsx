import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Hidratação vs CSR (SEO FASE 2C):
 * - Com marcador do prerender (`data-prerendered-path` igual ao pathname
 *   atual) e markup presente → hydrateRoot (adota o DOM, sem remontar).
 * - Caso contrário (shell SPA, navegação direta sem HTML prerenderizado,
 *   path divergente) → createRoot normal.
 * O primeiro render do cliente é estruturalmente idêntico ao prerender
 * (mesmos providers/componentes; dados dinâmicos só em useEffect).
 */
const expectedPath = root.dataset.prerenderedPath ?? '';
const hasMarkup = root.firstElementChild !== null;
const matchesRoute = expectedPath !== '' && normalizePath(window.location.pathname) === normalizePath(expectedPath);

if (hasMarkup && matchesRoute) {
  hydrateRoot(
    root,
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
