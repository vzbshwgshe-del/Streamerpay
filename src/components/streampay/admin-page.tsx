import React from 'react';
import { useStream } from '../../context/StreamContext';
import { AdminLogin } from './admin-login';
import { AdminDashboard } from './admin-dashboard';

interface AdminPageProps {
  onNavigatePublic: () => void;
  onNavigateOverlay: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  onNavigatePublic,
  onNavigateOverlay,
}) => {
  const { isAdminLoggedIn } = useStream();

  if (!isAdminLoggedIn) {
    return <AdminLogin onBackToPublic={onNavigatePublic} />;
  }

  return (
    <AdminDashboard
      onNavigatePublic={onNavigatePublic}
      onNavigateOverlay={onNavigateOverlay}
    />
  );
};
