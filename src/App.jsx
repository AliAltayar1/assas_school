import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from 'sonner';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors dir="rtl" />
      <AppRoutes />
    </BrowserRouter>
  );
}
