import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider} from './context/ThemeContext.tsx';
import {NotificationProvider} from './context/NotificationContext.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
);
