import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';
import { SettingsProvider } from './SettingsContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>
);
