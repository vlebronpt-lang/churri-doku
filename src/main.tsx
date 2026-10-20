import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { SettingsProvider } from './state/settings';
import { setupPwa } from './state/install';
import { initAccount } from './cloud/account';

setupPwa();
initAccount();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
