import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { MindIslandsProvider } from './context/MindIslandsContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { SceneShell } from './components/SceneShell';
import { AuthPage } from './pages/Auth';
import { router } from './routes';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SceneShell>
        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="rounded-full border border-white/24 bg-white/10 px-5 py-2 text-sm text-slate-50/85 backdrop-blur-md">
            Loading...
          </div>
        </div>
      </SceneShell>
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
