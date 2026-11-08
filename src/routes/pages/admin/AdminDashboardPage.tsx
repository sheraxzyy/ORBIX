import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Sliders,
  FolderKanban,
  ShieldAlert,
  Settings,
  ScrollText,
  UserCircle,
  ArrowLeft,
  Loader2,
  Search,
  CheckCircle2,
  Ban,
  RefreshCw,
  ExternalLink,
  X,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  adminService,
  type PlatformOverviewStats,
  type UserWithRoleAndStatus,
} from '@/services/adminService';
import type {
  PlatformSettings,
  ModerationReport,
  ReportStatus,
  AuditLog,
  AppRole,
} from '@/types/database.types';

type AdminTab =
  | 'overview'
  | 'users'
  | 'registrations'
  | 'limiter'
  | 'groups'
  | 'moderation'
  | 'settings'
  | 'audit'
  | 'profile';

export const AdminDashboardPage: React.FC = () => {
  const { user, profile, isSuperAdmin, userRole } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<PlatformOverviewStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Users Tab State
  const [users, setUsers] = useState<UserWithRoleAndStatus[]>([]);
  const [, setUsersTotal] = useState<number>(0);
  const [userSearch, setUserSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoleAndStatus | null>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [actionProcessing, setActionProcessing] = useState<boolean>(false);

  // Registration Limiter State
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Groups Tab State
  const [groups, setGroups] = useState<{ id: string; name: string; memberCount: number; created_at: string; created_by: string | null }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);

  // Moderation Tab State
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [reportFilter, setReportFilter] = useState<ReportStatus>('pending');
  const [loadingReports, setLoadingReports] = useState<boolean>(false);
  const [moderationNotes, setModerationNotes] = useState<string>('');

  // Audit Logs Tab State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Fetch Overview Stats
  const fetchOverview = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await adminService.getOverviewStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching overview stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await adminService.getUsers({
        search: userSearch,
        statusFilter,
        roleFilter,
      });
      setUsers(data.users);
      setUsersTotal(data.totalCount);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch, statusFilter, roleFilter]);

  // Fetch Settings & Limiter
  const fetchSettings = useCallback(async () => {
    try {
      const [sets, counter] = await Promise.all([
        adminService.getPlatformSettings(),
        adminService.getTodayRegistrationCount(),
      ]);
      setPlatformSettings(sets);
      setTodayCount(counter.count);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  // Fetch Groups
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const data = await adminService.getGroupsList();
      setGroups(data);
    } catch (err) {
      console.error('Error fetching groups list:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // Fetch Moderation Reports
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await adminService.getModerationReports(reportFilter);
      setReports(data);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [reportFilter]);

  // Fetch Audit Logs
  const fetchAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const data = await adminService.getAuditLogs(100);
      setAuditLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchSettings();
  }, [fetchOverview, fetchSettings]);

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'registrations') {
      fetchUsers();
    } else if (activeTab === 'limiter' || activeTab === 'settings') {
      fetchSettings();
    } else if (activeTab === 'groups') {
      fetchGroups();
    } else if (activeTab === 'moderation') {
      fetchReports();
    } else if (activeTab === 'audit') {
      fetchAudit();
    }
  }, [activeTab, fetchUsers, fetchSettings, fetchGroups, fetchReports, fetchAudit]);

  // User Actions
  const handleUserStatusUpdate = async (status: 'active' | 'suspended' | 'banned', days?: number) => {
    if (!selectedUser || !user) return;
    setActionProcessing(true);
    try {
      await adminService.updateUserStatus(user.id, selectedUser.id, status, actionReason, days);
      setSelectedUser((prev) => (prev ? { ...prev, status } : null));
      await fetchUsers();
      setActionReason('');
    } catch (err) {
      console.error('Error updating user status:', err);
      alert('Failed to update status.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleRoleChange = async (newRole: AppRole) => {
    if (!selectedUser || !user) return;
    if (!isSuperAdmin && newRole === 'super_admin') {
      alert('Only existing Super Administrators can grant the Super Administrator role.');
      return;
    }
    setActionProcessing(true);
    try {
      await adminService.updateUserRole(user.id, selectedUser.id, newRole);
      setSelectedUser((prev) => (prev ? { ...prev, role: newRole } : null));
      await fetchUsers();
    } catch (err) {
      console.error('Error changing role:', err);
      alert('Failed to change user role.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleSaveLimiterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformSettings || !user) return;

    setSavingSettings(true);
    try {
      const updated = await adminService.updatePlatformSettings(user.id, {
        registrations_enabled: platformSettings.registrations_enabled,
        invite_only: platformSettings.invite_only,
        max_registrations_per_day: platformSettings.max_registrations_per_day,
        registration_notice: platformSettings.registration_notice,
        maintenance_mode: platformSettings.maintenance_mode,
        allow_guest_preview: platformSettings.allow_guest_preview,
      });
      setPlatformSettings(updated);
      setSettingsSuccess('Platform settings and registration limits saved successfully.');
      setTimeout(() => setSettingsSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to update platform settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleReportAction = async (reportId: string, status: 'resolved' | 'dismissed') => {
    if (!user) return;
    try {
      await adminService.resolveReport(user.id, reportId, status, moderationNotes);
      setModerationNotes('');
      await fetchReports();
    } catch (err) {
      console.error('Error updating report:', err);
      alert('Failed to update report status.');
    }
  };

  const navItems = [
    { id: 'overview' as AdminTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'registrations' as AdminTab, label: 'Registrations', icon: UserCheck },
    { id: 'limiter' as AdminTab, label: 'Registration Limiter', icon: Sliders },
    { id: 'groups' as AdminTab, label: 'Groups', icon: FolderKanban },
    { id: 'moderation' as AdminTab, label: 'Reports & Moderation', icon: ShieldAlert },
    { id: 'settings' as AdminTab, label: 'Platform Settings', icon: Settings },
    { id: 'audit' as AdminTab, label: 'Audit Logs', icon: ScrollText },
    { id: 'profile' as AdminTab, label: 'Admin Profile', icon: UserCircle },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text font-sans">
      {/* Admin Sidebar */}
      <aside className="w-64 sm:w-72 flex flex-col h-full bg-surface border-r border-border shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="mark" />
            <span className="text-xs font-mono font-bold tracking-wider text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              Admin Core
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-text-muted">
            Management & Governance
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-primary text-white shadow-crimson-sm font-semibold'
                    : 'text-text-muted hover:text-text hover:bg-card'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Return to ORBIX Action */}
        <div className="p-3 border-t border-border bg-card/40">
          <Link
            to="/app/chats"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-text-muted hover:text-text hover:bg-card transition-colors border border-border/60"
          >
            <div className="flex items-center gap-2.5">
              <ArrowLeft className="w-4 h-4 text-primary" />
              <span>Return to ORBIX</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </Link>
        </div>
      </aside>

      {/* Main Admin Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* Top Header Bar */}
        <header className="h-16 px-6 sm:px-8 border-b border-border bg-surface/60 backdrop-blur-sm flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-text capitalize">
              {activeTab === 'limiter' ? 'Registration Limiter & Capacity' : activeTab}
            </h1>
            <p className="text-[11px] text-text-muted font-mono">
              Role: <span className="text-primary uppercase font-bold">{userRole}</span> • Platform Active
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchOverview();
                if (activeTab === 'users') fetchUsers();
                if (activeTab === 'limiter') fetchSettings();
                if (activeTab === 'moderation') fetchReports();
              }}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>
          </div>
        </header>

        {/* Content Region */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* ========================================================
              TAB 1: OVERVIEW
             ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {loadingStats ? (
                <div className="py-20 text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-text-muted">Loading live database telemetry...</p>
                </div>
              ) : (
                <>
                  {/* Metric Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-surface border border-border space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-text-muted text-xs font-mono">
                        <span>Total Users</span>
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-black text-text">{stats?.totalUsers}</p>
                      <span className="text-[10px] text-success font-medium">PostgreSQL verified</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface border border-border space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-text-muted text-xs font-mono">
                        <span>Active Accounts</span>
                        <UserCheck className="w-4 h-4 text-success" />
                      </div>
                      <p className="text-2xl font-black text-text">{stats?.activeUsers}</p>
                      <span className="text-[10px] text-text-muted">In good standing</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface border border-border space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-text-muted text-xs font-mono">
                        <span>Registrations Today</span>
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-black text-text">{stats?.registrationsToday}</p>
                      <span className="text-[10px] text-text-muted">{stats?.registrationsThisWeek} this week</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface border border-border space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-text-muted text-xs font-mono">
                        <span>Suspended / Banned</span>
                        <Ban className="w-4 h-4 text-danger" />
                      </div>
                      <p className="text-2xl font-black text-text">{stats?.suspendedAccounts}</p>
                      <span className="text-[10px] text-danger font-medium">Restricted accounts</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface border border-border space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-text-muted text-xs font-mono">
                        <span>Total Conversations</span>
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-black text-text">{stats?.totalConversations}</p>
                      <span className="text-[10px] text-text-muted">Direct channels & groups</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface border border-border space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-text-muted text-xs font-mono">
                        <span>Total Messages</span>
                        <ScrollText className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-black text-text">{stats?.totalMessages}</p>
                      <span className="text-[10px] text-text-muted">Encrypted in DB</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface border border-border space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-text-muted text-xs font-mono">
                        <span>Active Groups</span>
                        <FolderKanban className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-black text-text">{stats?.totalGroups}</p>
                      <span className="text-[10px] text-text-muted">Collaborative hubs</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface border border-border space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-text-muted text-xs font-mono">
                        <span>Online Now</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                      </div>
                      <p className="text-2xl font-black text-text">{stats?.onlineUsers}</p>
                      <span className="text-[10px] text-success font-medium">Realtime presence</span>
                    </div>
                  </div>

                  {/* Growth & Activity Visualization */}
                  <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-text">Activity & Registration Trends</h3>
                      <span className="text-[10px] font-mono text-text-muted">Last 7 Days</span>
                    </div>

                    {stats?.growthChart && stats.growthChart.length > 0 ? (
                      <div className="grid grid-cols-7 gap-2 items-end h-40 pt-6">
                        {stats.growthChart.map((item, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                            <div className="w-full flex items-end justify-center gap-1.5 h-28">
                              <div
                                style={{
                                  height: `${Math.max(12, Math.min(100, (item.users / Math.max(1, stats.totalUsers)) * 100))}%`,
                                }}
                                className="w-3.5 bg-primary rounded-t-sm transition-all"
                                title={`Users: ${item.users}`}
                              />
                              <div
                                style={{
                                  height: `${Math.max(6, Math.min(100, (item.messages / Math.max(1, stats.totalMessages)) * 100))}%`,
                                }}
                                className="w-3.5 bg-primary/40 rounded-t-sm transition-all"
                                title={`Messages: ${item.messages}`}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-text-muted truncate w-full text-center">
                              {item.date}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-xs text-text-muted">
                        No activity records found yet.
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-6 pt-2 border-t border-border text-[11px] font-mono text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Users
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary/40" /> Messages
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2 & 3: USERS & REGISTRATIONS
             ======================================================== */}
          {(activeTab === 'users' || activeTab === 'registrations') && (
            <div className="space-y-4">
              {/* Search & Filters Toolbar */}
              <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="search"
                    placeholder="Search by username... (e.g. @sheran)"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-card"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter users by account status"
                    className="h-9 px-3 rounded-xl border border-border bg-card text-xs text-text focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="suspended">Suspended Only</option>
                    <option value="banned">Banned Only</option>
                  </select>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    aria-label="Filter users by role"
                    className="h-9 px-3 rounded-xl border border-border bg-card text-xs text-text focus:outline-none"
                  >
                    <option value="all">All Roles</option>
                    <option value="user">Users</option>
                    <option value="moderator">Moderators</option>
                    <option value="admin">Administrators</option>
                    <option value="super_admin">Super Admins</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl bg-surface border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-card/70 border-b border-border text-[11px] font-mono text-text-muted uppercase">
                      <tr>
                        <th className="p-3.5">User Handle</th>
                        <th className="p-3.5">Display Name</th>
                        <th className="p-3.5">Role</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Registered</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-text-muted">
                            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                            Loading users list...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-text-muted">
                            No registered users found matching the query.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id} className="hover:bg-card/40 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                {u.avatar_url ? (
                                  <img
                                    src={u.avatar_url}
                                    alt={u.username}
                                    className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                    {u.display_name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-text">@{u.username}</span>
                                  <span className="block text-[10px] font-mono text-text-muted truncate max-w-[140px]">
                                    {u.id}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-text-muted font-medium">{u.display_name}</td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                                  u.role === 'super_admin'
                                    ? 'bg-primary/20 text-primary border-primary/40'
                                    : u.role === 'admin'
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : u.role === 'moderator'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-card text-text-muted border-border'
                                }`}
                              >
                                {u.role || 'user'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                                  u.status === 'banned'
                                    ? 'bg-danger/20 text-danger border-danger/40'
                                    : u.status === 'suspended'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                                    : 'bg-success/20 text-success border-success/40'
                                }`}
                              >
                                {u.status || 'active'}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-text-muted text-[11px]">
                              {new Date(u.created_at).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="p-3.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedUser(u)}
                                className="h-7 text-xs px-2.5"
                              >
                                Manage
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: REGISTRATION LIMITER
             ======================================================== */}
          {activeTab === 'limiter' && (
            <div className="max-w-3xl space-y-6">
              {/* Daily Capacity Status Banner */}
              <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-text">Today's Registration Capacity</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Atomic counter governed by PostgreSQL functions to prevent spam bots.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-card border border-border">
                    {todayCount} / {platformSettings?.max_registrations_per_day || 'Unlimited'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-card h-3 rounded-full overflow-hidden border border-border">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        platformSettings?.max_registrations_per_day
                          ? (todayCount / platformSettings.max_registrations_per_day) * 100
                          : 0
                      )}%`,
                    }}
                    className="h-full bg-primary transition-all duration-500"
                  />
                </div>
              </div>

              {settingsSuccess && (
                <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{settingsSuccess}</span>
                </div>
              )}

              {/* Limiter Form */}
              <form onSubmit={handleSaveLimiterSettings} className="p-6 rounded-2xl bg-surface border border-border space-y-6">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <span className="text-sm font-bold text-text">Allow New Account Registrations</span>
                    <p className="text-xs text-text-muted mt-0.5">
                      When turned off, registration is disabled and existing users can still log in.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformSettings?.registrations_enabled ?? true}
                    onChange={(e) =>
                      setPlatformSettings((prev) =>
                        prev ? { ...prev, registrations_enabled: e.target.checked } : null
                      )
                    }
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <span className="text-sm font-bold text-text">Invite-Only Mode</span>
                    <p className="text-xs text-text-muted mt-0.5">
                      Only visitors with an authorized invite code can create an account.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformSettings?.invite_only ?? false}
                    onChange={(e) =>
                      setPlatformSettings((prev) =>
                        prev ? { ...prev, invite_only: e.target.checked } : null
                      )
                    }
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="dailyLimitInput" className="block text-xs font-bold text-text">
                    Maximum Registrations Per Day (0 for unlimited)
                  </label>
                  <Input
                    id="dailyLimitInput"
                    type="number"
                    min={0}
                    max={10000}
                    value={platformSettings?.max_registrations_per_day ?? 50}
                    onChange={(e) =>
                      setPlatformSettings((prev) =>
                        prev ? { ...prev, max_registrations_per_day: parseInt(e.target.value) || 0 } : null
                      )
                    }
                    className="max-w-xs bg-card h-10 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="noticeBannerText" className="block text-xs font-bold text-text">
                    Public Registration Unavailable Notice
                  </label>
                  <textarea
                    id="noticeBannerText"
                    rows={2}
                    value={platformSettings?.registration_notice ?? ''}
                    onChange={(e) =>
                      setPlatformSettings((prev) =>
                        prev ? { ...prev, registration_notice: e.target.value } : null
                      )
                    }
                    placeholder="ORBIX registration is temporarily unavailable. Please try again later."
                    className="w-full bg-card border border-border rounded-xl p-3 text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-border">
                  <div>
                    <span className="text-sm font-bold text-text">Platform Maintenance Mode</span>
                    <p className="text-xs text-text-muted mt-0.5">
                      Display maintenance status banner across client app.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformSettings?.maintenance_mode ?? false}
                    onChange={(e) =>
                      setPlatformSettings((prev) =>
                        prev ? { ...prev, maintenance_mode: e.target.checked } : null
                      )
                    }
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={savingSettings} className="gap-2 px-6 h-10 text-xs font-semibold">
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Save Limiter & Platform Settings</span>
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              TAB 5: GROUPS
             ======================================================== */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-surface border border-border">
                <h3 className="text-sm font-bold text-text mb-4">Active Platform Groups ({groups.length})</h3>
                <div className="divide-y divide-border">
                  {loadingGroups ? (
                    <div className="py-12 text-center text-text-muted">
                      <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                      Loading groups...
                    </div>
                  ) : groups.length === 0 ? (
                    <p className="py-8 text-center text-xs text-text-muted">No group conversations created yet.</p>
                  ) : (
                    groups.map((g) => (
                      <div key={g.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-text">{g.name}</p>
                          <p className="text-[10px] font-mono text-text-muted">ID: {g.id}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-card border border-border">
                            {g.memberCount} members
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">
                            {new Date(g.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 6: REPORTS & MODERATION
             ======================================================== */}
          {activeTab === 'moderation' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                {(['pending', 'resolved', 'dismissed'] as ReportStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setReportFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      reportFilter === st ? 'bg-primary text-white font-bold' : 'bg-card text-text-muted hover:text-text'
                    }`}
                  >
                    {st} Reports
                  </button>
                ))}
              </div>

              <div className="rounded-2xl bg-surface border border-border overflow-hidden">
                {loadingReports ? (
                  <div className="py-12 text-center text-text-muted">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                    Loading reports...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted">
                    No {reportFilter} reports found in queue.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {reports.map((r) => (
                      <div key={r.id} className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-danger/15 text-danger border border-danger/30">
                              {r.category}
                            </span>
                            <span className="ml-2 text-xs font-mono text-text-muted">
                              Target User: {r.reported_user_id}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-text-muted">
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-xs text-text bg-card/60 p-3 rounded-xl border border-border leading-relaxed">
                          "{r.reason}"
                        </p>

                        {r.status === 'pending' && (
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() => handleReportAction(r.id, 'resolved')}
                              className="h-8 text-xs bg-success hover:bg-success/90"
                            >
                              Resolve Report
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportAction(r.id, 'dismissed')}
                              className="h-8 text-xs"
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 7: PLATFORM SETTINGS
             ======================================================== */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-4">
              <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
                <h3 className="text-sm font-bold text-text">Security & Guest Visibility</h3>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <span className="text-xs font-bold text-text">Allow Public Guest Interface</span>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Permits unauthenticated visitors to view the read-only shell before signing up.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformSettings?.allow_guest_preview ?? true}
                    onChange={(e) =>
                      setPlatformSettings((prev) =>
                        prev ? { ...prev, allow_guest_preview: e.target.checked } : null
                      )
                    }
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                </div>
                <Button onClick={handleSaveLimiterSettings} disabled={savingSettings} size="sm" className="text-xs">
                  Save Platform Rules
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 8: AUDIT LOGS
             ======================================================== */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text">Immutable System Audit Trail</h3>
                  <p className="text-[10px] text-text-muted font-mono">
                    Protected by PostgreSQL RLS: non-editable, non-deletable records.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAudit} className="h-7 text-xs">
                  Refresh Logs
                </Button>
              </div>

              <div className="rounded-2xl bg-surface border border-border overflow-hidden">
                <div className="divide-y divide-border font-mono text-xs">
                  {loadingAudit ? (
                    <div className="py-12 text-center text-text-muted">
                      <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                      Loading audit logs...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="py-12 text-center text-text-muted">
                      No administrative events logged yet.
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-3.5 hover:bg-card/40 transition-colors flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold uppercase">
                            {log.action_type}
                          </span>
                          <p className="text-[11px] text-text-muted">Admin: {log.admin_id}</p>
                          {log.target_user_id && (
                            <p className="text-[10px] text-text-muted">Target: {log.target_user_id}</p>
                          )}
                          <pre className="text-[10px] text-text-muted/80 bg-background/50 p-1.5 rounded mt-1 overflow-x-auto max-w-xl">
                            {JSON.stringify(log.details)}
                          </pre>
                        </div>
                        <span className="text-[10px] text-text-muted shrink-0 ml-4">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 9: ADMIN PROFILE
             ======================================================== */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl space-y-6">
              <div className="p-6 rounded-2xl bg-surface border border-border space-y-4">
                <div className="flex items-center gap-4">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary/40 shadow-crimson-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-lg shadow-crimson-sm">
                      {(profile?.display_name || 'Admin').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-text">{profile?.display_name}</h3>
                    <p className="text-xs text-text-muted font-mono">@{profile?.username}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-primary text-white">
                      {userRole}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">User ID</span>
                    <span className="font-mono text-text">{user?.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Session Status</span>
                    <span className="text-success font-medium">Authenticated</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* User Management Action Drawer / Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                  {selectedUser.display_name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">@{selectedUser.username}</h3>
                  <p className="text-[11px] text-text-muted">{selectedUser.display_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-card"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-card border border-border font-mono text-[11px]">
                <div>
                  <span className="text-text-muted block text-[10px]">User ID</span>
                  <span className="truncate block">{selectedUser.id}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Role</span>
                  <span className="font-bold text-primary uppercase">{selectedUser.role}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Status</span>
                  <span className="font-bold uppercase">{selectedUser.status || 'active'}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Created</span>
                  <span>{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action reason */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-text">Administrative Reason</label>
                <Input
                  placeholder="Reason for suspension, ban, or role change..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="bg-card text-xs h-9"
                />
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-mono uppercase text-text-muted block">Account Status Actions</span>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionProcessing || selectedUser.status === 'active'}
                    onClick={() => handleUserStatusUpdate('active')}
                    className="text-xs h-8 text-success hover:text-success border-success/30 hover:bg-success/10"
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionProcessing || selectedUser.status === 'suspended'}
                    onClick={() => handleUserStatusUpdate('suspended', 7)}
                    className="text-xs h-8 text-yellow-500 hover:text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
                  >
                    Suspend (7d)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionProcessing || selectedUser.status === 'banned'}
                    onClick={() => handleUserStatusUpdate('banned')}
                    className="text-xs h-8 text-danger hover:text-danger border-danger/30 hover:bg-danger/10"
                  >
                    Ban Account
                  </Button>
                </div>
              </div>

              {/* Role actions */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[11px] font-mono uppercase text-text-muted block">Change RBAC Role</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['user', 'moderator', 'admin', 'super_admin'] as AppRole[]).map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant="outline"
                      disabled={actionProcessing || selectedUser.role === r}
                      onClick={() => handleRoleChange(r)}
                      className={`text-[10px] h-7 capitalize ${
                        selectedUser.role === r ? 'border-primary text-primary font-bold bg-primary/10' : ''
                      }`}
                    >
                      {r.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboardPage;
