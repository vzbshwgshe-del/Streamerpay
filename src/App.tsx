import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { StreamProvider } from './context/StreamContext';
import { Shell } from './components/streampay/shell';
import { DonationPage } from './components/streampay/donation-page';
import { AdminPage } from './components/streampay/admin-page';
import { OverlayPage } from './components/streampay/overlay-page';

export type AppView = 'public' | 'admin' | 'overlay';

function getInitialView(): AppView {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('overlay') === 'true' || window.location.pathname.includes('/overlay') || window.location.hash === '#overlay') {
      return 'overlay';
    }
    if (params.get('view') === 'admin' || window.location.pathname.includes('/admin') || window.location.hash === '#admin') {
      return 'admin';
    }
  } catch (e) {
    console.warn(e);
  }
  return 'public';
}

function MainContent() {
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);

  // Sync view state with browser URL search parameters without page reload
  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    const url = new URL(window.location.href);
    if (view === 'public') {
      url.searchParams.delete('view');
      url.searchParams.delete('overlay');
      window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
    } else if (view === 'admin') {
      url.searchParams.set('view', 'admin');
      url.searchParams.delete('overlay');
      window.history.pushState({}, '', url.toString());
    } else if (view === 'overlay') {
      url.searchParams.set('overlay', 'true');
      url.searchParams.delete('view');
      window.history.pushState({}, '', url.toString());
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentView === 'overlay') {
    return (
      <OverlayPage
        onBackToDashboard={() => navigateTo('admin')}
        isStandalone={false}
      />
    );
  }

  return (
    <Shell currentView={currentView} onNavigate={navigateTo}>
      {currentView === 'public' && <DonationPage />}
      {currentView === 'admin' && (
        <AdminPage
          onNavigatePublic={() => navigateTo('public')}
          onNavigateOverlay={() => navigateTo('overlay')}
        />
      )}
    </Shell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <StreamProvider>
        <MainContent />
      </StreamProvider>
    </ThemeProvider>
  );
}
