import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import PermissionDeniedPage from './PermissionDeniedPage.jsx';

export default function RoleGuard({ allowedRoles = [], children }) {
  const { currentRole } = useAuth();

  if (!allowedRoles.includes(currentRole)) {
    return <PermissionDeniedPage requiredRole={allowedRoles.join(' or ')} />;
  }

  return children;
}
