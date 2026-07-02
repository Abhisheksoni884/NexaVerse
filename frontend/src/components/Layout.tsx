import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Files,
  BarChart2,
  ShieldAlert,
  Activity,
  LogOut,
  User as UserIcon,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useState } from 'react';

const navItems = [
  { name: 'Chat', path: '/chat', icon: MessageSquare, roles: ['admin', 'analyst', 'viewer'] },
  { name: 'Documents', path: '/documents', icon: Files, roles: ['admin', 'analyst', 'viewer'] },
  { name: 'My Usage', path: '/usage', icon: Activity, roles: ['admin', 'analyst', 'viewer'] },
  { name: 'Audit Logs', path: '/admin/audit', icon: ShieldAlert, roles: ['admin'] },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart2, roles: ['admin'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA]">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'relative flex flex-col flex-shrink-0 transition-all duration-300 bg-brand-dark',
          collapsed ? 'w-[72px]' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-4 border-b border-white/10">
          <div className="flex-shrink-0 w-9 h-9 bg-brand-teal rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-white tracking-tight animate-fade-in">
              NexaVerse
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems
            .filter(item => item.roles.includes(user.role))
            .map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-brand-teal text-white'
                        : 'text-[#8A9BB0] hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="animate-fade-in">{item.name}</span>}
                </NavLink>
              );
            })}
        </nav>

        {/* User + logout */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-4 h-4 text-slate-300" />
            </div>
            {!collapsed && (
              <div className="min-w-0 animate-fade-in">
                <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                <p className="text-xs text-slate-400 capitalize">{user.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            title={collapsed ? 'Log out' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[#8A9BB0] hover:text-brand-coral hover:bg-white/5 transition-all text-sm font-medium',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-[4.25rem] z-30 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:text-brand-blue transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
