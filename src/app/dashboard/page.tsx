'use client';

import { useAuth } from '@/components/auth-provider';
import { redirect } from 'next/navigation';
import SupervisorDashboard from './supervisor-dashboard';
import BankDashboard from './bank-dashboard';
import CFMDashboard from './cfm-dashboard';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  // Render role-specific dashboard
  switch (user.role) {
    case 'SUPER_ADMIN':
    case 'SUPERVISOR':
    case 'AUDITOR':
      return <SupervisorDashboard />;
    case 'CFM_OFFICER':
      return <CFMDashboard />;
    case 'BANK_USER':
      return <BankDashboard />;
    default:
      return <SupervisorDashboard />;
  }
}
