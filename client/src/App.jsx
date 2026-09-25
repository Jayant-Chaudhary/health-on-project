import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext';
import { PatientProvider } from './context/PatientContext';
import { AppRoutes } from './routes/AppRoutes.jsx';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <PatientProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </PatientProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
