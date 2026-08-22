import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Boxes,
  Building2,
  Cable,
  ClipboardList,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Receipt,
  ScrollText,
  Server,
  Shield,
  Users,
  Workflow,
  X,
  CreditCard,
  HardDrive,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { opsApi } from '../../services/admin';
import { StatusBadge, statusVariant } from '../ui/StatusBadge';

const platformNav = [
  { name: 'Overview', icon: LayoutDashboard, path: '/' },
  { name: 'Users', icon: Users, path: '/users' },
  { name: 'Tenants', icon: Building2, path: '/tenants' },
  { name: 'Workspaces', icon: Boxes, path: '/workspaces' },
  { name: 'Plans', icon: CreditCard, path: '/plans' },
  { name: 'Finance', icon: Wallet, path: '/finance' },
  { name: 'Billing', icon: Receipt, path: '/billing' },
  { name: 'Invites', icon: UserPlus, path: '/invites' },
  { name: 'Usage', icon: Activity, path: '/usage' },
];

const opsNav = [
  { name: 'Chat Runs', icon: Workflow, path: '/chat-runs' },
  { name: 'Connectors', icon: Cable, path: '/connectors' },
  { name: 'Datasources', icon: HardDrive, path: '/datasources' },
  { name: 'Feedback', icon: MessageSquare, path: '/feedback' },
  { name: 'Providers', icon: Database, path: '/providers' },
  { name: 'Logs', icon: ScrollText, path: '/logs' },
  { name: 'Audit', icon: ClipboardList, path: '/audit' },
  { name: 'Ops', icon: Server, path: '/ops' },
];

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: (typeof platformNav)[0];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const active =
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-teal-500/15 text-teal-300'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
      } ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? item.name : undefined}
    >
      {active ? (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl bg-teal-500/15 ring-1 ring-teal-500/30"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      ) : null}
      <item.icon className={`relative z-10 h-[18px] w-[18px] shrink-0 ${active ? 'text-teal-300' : ''}`} />
      {!collapsed ? <span className="relative z-10">{item.name}</span> : null}
    </Link>
  );
}

const DashboardLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const healthQuery = useQuery({
    queryKey: ['admin', 'ops', 'health'],
    queryFn: () => opsApi.health(),
    refetchInterval: 60_000,
    retry: 1,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pageTitle =
    [...platformNav, ...opsNav].find((n) =>
      n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path),
    )?.name ?? 'Admin';

  const SidebarInner = ({
    isMobile = false,
    onNavigate,
  }: {
    isMobile?: boolean;
    onNavigate?: () => void;
  }) => (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center px-4 py-5 ${
          collapsed && !isMobile ? 'justify-center px-2' : 'justify-start'
        }`}
      >
        <img
          src="/logo.webp"
          alt="Beleh"
          className={`shrink-0 rounded-xl object-contain transition-all duration-300 ${
            isMobile
              ? 'h-14 w-14'
              : collapsed
                ? 'h-9 w-9'
                : 'h-16 w-16'
          }`}
        />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <div>
          {(!collapsed || isMobile) && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Platform
            </p>
          )}
          <div className="space-y-0.5">
            {platformNav.map((item) => (
              <NavLink
                key={item.path}
                item={item}
                collapsed={collapsed && !isMobile}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
        <div>
          {(!collapsed || isMobile) && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Operations
            </p>
          )}
          <div className="space-y-0.5">
            {opsNav.map((item) => (
              <NavLink
                key={item.path}
                item={item}
                collapsed={collapsed && !isMobile}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/5 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 ${
            collapsed && !isMobile ? 'justify-center' : ''
          }`}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {(!collapsed || isMobile) && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1220] text-slate-900">
      {/* Desktop sidebar */}
      <aside
        className={`relative hidden shrink-0 border-r border-white/5 bg-[#0b1220] transition-all duration-300 lg:block ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <SidebarInner />
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-teal-700"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0b1220] lg:hidden"
            >
              <SidebarInner isMobile onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-2xl bg-transparent lg:rounded-tl-3xl">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-teal-500/30 bg-teal-500/15 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-teal-300 hover:bg-teal-500/20 lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-teal-400/70">Admin</p>
              <h2 className="text-sm font-semibold text-teal-300">{pageTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {healthQuery.data ? (
              <StatusBadge variant={statusVariant(healthQuery.data.status)}>
                System {healthQuery.data.status}
              </StatusBadge>
            ) : null}
            <div className="hidden items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1.5 ring-1 ring-teal-500/30 sm:flex">
              <Shield className="h-3.5 w-3.5 text-teal-300" />
              <span className="max-w-[180px] truncate text-xs font-medium text-teal-200">
                {admin?.email ?? 'Admin'}
              </span>
            </div>
            <img
              src={
                admin?.photo_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(admin?.display_name || admin?.email || 'A')}&background=0d9488&color=fff`
              }
              alt=""
              className="h-9 w-9 rounded-full ring-2 ring-teal-500/30"
            />
          </div>
        </header>

        <main className="admin-mesh flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
