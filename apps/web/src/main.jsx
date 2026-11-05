import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/plus-jakarta-sans';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import './styles/ui.css';
import './styles/base.css';
import './styles/public-display.css';
import './styles/public-display-ornamental.css';

if (window.location.pathname.startsWith('/public-display')) {
  document.documentElement.classList.add('public-display-route');
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
