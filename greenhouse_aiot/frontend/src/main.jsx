import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme.jsx';
import './i18n';
import './styles/responsive.css';

const savedTheme = localStorage.getItem('theme') || 'system';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider initialTheme={savedTheme}>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
