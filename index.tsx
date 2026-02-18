
import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix: App is a named export in App.tsx
import { App } from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';

    if (isHttps || isLocalhost) {
      navigator.serviceWorker.register('sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope:', registration.scope);
        })
        .catch(err => {
          console.warn('ServiceWorker registration failed (this is expected in some preview environments):', err);
        });
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary name="Global Root">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);