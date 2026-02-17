'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FileCheck,
  ArrowRightLeft,
  Upload,
  AlertTriangle,
  BarChart3,
  FileText,
  Users,
  Settings,
  Shield,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';

// User role type for SQLite (no enum support)
type UserRole = 'SUPER_ADMIN' | 'CFM_OFFICER' | 'SUPERVISOR' | 'BANK_USER' | 'AUDITOR';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'CFM_OFFICER', 'SUPERVISOR', 'BANK_USER', 'AUDITOR'],
  },
  {
    title: 'Banks',
    href: '/banks',
    icon: Building2,
    roles: ['SUPER_ADMIN', 'CFM_OFFICER', 'SUPERVISOR', 'AUDITOR'],
  },
  {
    title: 'Approvals',
    href: '/approvals',
    icon: FileCheck,
    roles: ['SUPER_ADMIN', 'CFM_OFFICER', 'SUPERVISOR', 'BANK_USER', 'AUDITOR'],
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: ArrowRightLeft,
    roles: ['SUPER_ADMIN', 'CFM_OFFICER', 'SUPERVISOR', 'BANK_USER', 'AUDITOR'],
  },
  {
    title: 'Submissions',
    href: '/submissions',
    icon: Upload,
    roles: ['SUPER_ADMIN', 'CFM_OFFICER', 'SUPERVISOR', 'BANK_USER', 'AUDITOR'],
  },
  {
    title: 'Exceptions',
    href: '/exceptions',
    icon: AlertTriangle,
    roles: ['SUPER_ADMIN', 'CFM_OFFICER', 'SUPERVISOR', 'BANK_USER', 'AUDITOR'],
  },
  {
    title: 'Risk Analysis',
    href: '/risk',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'SUPERVISOR', 'AUDITOR'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: FileText,
    roles: ['SUPER_ADMIN', 'CFM_OFFICER', 'SUPERVISOR', 'BANK_USER', 'AUDITOR'],
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    roles: ['SUPER_ADMIN'],
  },
  {
    title: 'Audit Logs',
    href: '/audit',
    icon: History,
    roles: ['SUPER_ADMIN', 'SUPERVISOR', 'AUDITOR'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <span className="font-bold text-lg">CFMS</span>
            <span className="text-xs text-muted-foreground">SupTech Platform</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Logged in as</p>
          <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-muted-foreground">{user.role.replace('_', ' ')}</p>
          {user.bankName && (
            <p className="text-xs text-primary mt-1">{user.bankName}</p>
          )}
        </div>
      </div>
    </div>
  );
}
