import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { MindIslandsProvider } from './context/MindIslandsContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { AuthPage } from './pages/Auth';
import { router } from './routes';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0f2e] via-[#2d1b4f] to-[#1a0f2e] text-foreground flex items-center justify-center">
        <div className="text-sm opacity-80">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage />
        <LanguageSwitcher />
      </>
    );
  }

  return (
    <MindIslandsProvider>
      <RouterProvider router={router} />
      <LanguageSwitcher />
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'bg-card border-border text-foreground',
        }}
      />
    </MindIslandsProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
