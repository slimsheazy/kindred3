import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker
// Using a relative path 'sw.js' is the most robust way to ensure the browser 
// registers the worker against the correct origin and scope.
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
          // In some sandboxed environments (like iframes), service workers are blocked by design.
          // We catch and log this gracefully to prevent app crashes.
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
    <App />
  </React.StrictMode>
);