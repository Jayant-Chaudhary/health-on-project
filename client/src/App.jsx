import { ToastProvider } from './context/ToastContext';
import { PatientProvider } from './context/PatientContext';
import AppRoutes from './routes/AppRoutes';
import DevStateSwitcher from './components/dev/DevStateSwitcher';

export default function App() {
  return (
    <ToastProvider>
      <PatientProvider>
        <AppRoutes />
        <DevStateSwitcher />
      </PatientProvider>
    </ToastProvider>
  );
}
