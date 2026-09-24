import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext';
import { PatientProvider } from './context/PatientContext';
import { AppRoutes } from './routes/AppRoutes.jsx';

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PatientProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PatientProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
