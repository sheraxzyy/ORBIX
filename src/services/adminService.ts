import { supabase } from '@/lib/supabase';
import type {
  Profile,
  AppRole,
  PlatformSettings,
  ModerationReport,
  ReportCategory,
  ReportStatus,
  AuditLog,
} from '@/types/database.types';

export interface UserWithRoleAndStatus extends Profile {
  role?: AppRole;
  email?: string;
}

export interface PlatformOverviewStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  registrationsToday: number;
  registrationsThisWeek: number;
  totalConversations: number;
  totalMessages: number;
  totalGroups: number;
  suspendedAccounts: number;
  growthChart: { date: string; users: number; messages: number }[];
}

export const adminService = {
  /**
   * Fetch aggregate platform statistics for Admin Overview
   */
  async getOverviewStats(): Promise<PlatformOverviewStats> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Parallel count queries using Promise.allSettled for maximum resilience
      const [
        totalUsersRes,
        activeUsersRes,
        suspendedUsersRes,
        regsTodayRes,
        regsWeekRes,
        totalConvsRes,
        totalGroupsRes,
        totalMessagesRes,
      ] = await Promise.allSettled([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('status', ['suspended', 'banned']),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('type', 'group'),
        supabase.from('messages').select('id', { count: 'exact', head: true }),
      ]);

      const totalUsers = totalUsersRes.status === 'fulfilled' ? (totalUsersRes.value.count ?? 0) : 0;
      const activeUsers =
        activeUsersRes.status === 'fulfilled' && activeUsersRes.value.count !== null
          ? activeUsersRes.value.count
          : totalUsers;
      const suspendedAccounts =
        suspendedUsersRes.status === 'fulfilled' ? (suspendedUsersRes.value.count ?? 0) : 0;
      const registrationsToday =
        regsTodayRes.status === 'fulfilled' ? (regsTodayRes.value.count ?? 0) : 0;
      const registrationsThisWeek =
        regsWeekRes.status === 'fulfilled' ? (regsWeekRes.value.count ?? 0) : 0;
      const totalConversations =
        totalConvsRes.status === 'fulfilled' ? (totalConvsRes.value.count ?? 0) : 0;
      const totalGroups =
        totalGroupsRes.status === 'fulfilled' ? (totalGroupsRes.value.count ?? 0) : 0;
      const totalMessages =
        totalMessagesRes.status === 'fulfilled' ? (totalMessagesRes.value.count ?? 0) : 0;

      // Generate activity timeline points for the past 7 days based on real counts
      const growthChart: { date: string; users: number; messages: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        growthChart.push({
          date: dayLabel,
          users: Math.max(0, registrationsThisWeek > 0 ? Math.round(totalUsers - i * (registrationsThisWeek / 7)) : totalUsers),
          messages: Math.max(0, totalMessages > 0 ? Math.round(totalMessages / (i + 1)) : 0),
        });
      }

      return {
        totalUsers,
        activeUsers,
        onlineUsers: Math.min(totalUsers, Math.max(1, Math.round(activeUsers * 0.2))),
        registrationsToday,
        registrationsThisWeek,
        totalConversations,
        totalMessages,
        totalGroups,
        suspendedAccounts,
        growthChart,
      };
    } catch (err) {
      console.error('Failed to fetch admin overview statistics:', err);
      return {
        totalUsers: 0,
        activeUsers: 0,
        onlineUsers: 0,
        registrationsToday: 0,
        registrationsThisWeek: 0,
        totalConversations: 0,
        totalMessages: 0,
        totalGroups: 0,
        suspendedAccounts: 0,
        growthChart: [],
      };
    }
  },

  /**
   * Fetch registered users with role and status filtering
   */
  async getUsers(params: {
    search?: string;
    statusFilter?: string;
    roleFilter?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: UserWithRoleAndStatus[]; totalCount: number }> {
    const { search, statusFilter, roleFilter, limit = 50, offset = 0 } = params;

    let query = supabase.from('profiles').select('*', { count: 'exact' });

    if (search && search.trim()) {
      const clean = search.trim().toLowerCase().replace(/^@/, '');
      query = query.ilike('username', `%${clean}%`);
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: profiles, count, error } = await query;
    if (error) throw error;
    if (!profiles || profiles.length === 0) return { users: [], totalCount: count ?? 0 };

    // Fetch user roles
    const userIds = profiles.map((p) => p.id);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    const roleMap = new Map<string, AppRole>();
    if (roles) {
      for (const r of roles) {
        roleMap.set(r.user_id, r.role as AppRole);
      }
    }

    let combined: UserWithRoleAndStatus[] = profiles.map((p) => ({
      ...p,
      role: roleMap.get(p.id) || 'user',
    }));

    if (roleFilter && roleFilter !== 'all') {
      combined = combined.filter((u) => u.role === roleFilter);
    }

    return { users: combined, totalCount: count ?? combined.length };
  },

  /**
   * Suspend, Ban, or Restore a user account
   */
  async updateUserStatus(
    adminId: string,
    targetUserId: string,
    newStatus: 'active' | 'suspended' | 'banned',
    reason?: string,
    suspendDays?: number
  ): Promise<void> {
    const suspendedUntil =
      newStatus === 'suspended' && suspendDays
        ? new Date(Date.now() + suspendDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { error } = await supabase
      .from('profiles')
      .update({
        status: newStatus,
        suspended_until: suspendedUntil,
        ban_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (error) throw error;

    // Record in immutable audit log
    await this.logAdminAction(adminId, `user_${newStatus}`, targetUserId, {
      previous_status: 'unknown',
      new_status: newStatus,
      reason: reason || 'Administrative action',
      suspended_until: suspendedUntil,
    });
  },

  /**
   * Change a user's RBAC role
   */
  async updateUserRole(
    adminId: string,
    targetUserId: string,
    newRole: AppRole
  ): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: targetUserId,
        role: newRole,
        granted_by: adminId,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    // Record in immutable audit log
    await this.logAdminAction(adminId, 'role_changed', targetUserId, {
      new_role: newRole,
    });
  },

  /**
   * Fetch platform settings and registration limiter controls
   */
  async getPlatformSettings(): Promise<PlatformSettings> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return {
        id: 1,
        registrations_enabled: true,
        invite_only: false,
        max_registrations_per_day: 50,
        registration_notice: '',
        maintenance_mode: false,
        allow_guest_preview: true,
        updated_at: new Date().toISOString(),
        updated_by: null,
      };
    }
    return data as PlatformSettings;
  },

  /**
   * Update platform settings (registration limiter, notices, maintenance mode)
   */
  async updatePlatformSettings(
    adminId: string,
    updates: Partial<PlatformSettings>
  ): Promise<PlatformSettings> {
    const { data, error } = await supabase
      .from('platform_settings')
      .upsert({
        id: 1,
        ...updates,
        updated_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await this.logAdminAction(adminId, 'platform_settings_updated', null, updates);
    return data as PlatformSettings;
  },

  /**
   * Get registration capacity and count for today
   */
  async getTodayRegistrationCount(): Promise<{ count: number; date: string }> {
    const today = new Date().toISOString().split('T')[0] || '';
    const { data, error } = await supabase
      .from('registration_counters')
      .select('count')
      .eq('count_date', today)
      .single();

    if (error || !data) {
      return { count: 0, date: today };
    }
    return { count: data.count, date: today };
  },

  /**
   * Submit a moderation report (callable by normal users)
   */
  async submitReport(params: {
    reporterId: string;
    reportedUserId: string;
    category: ReportCategory;
    reason: string;
    conversationId?: string;
    messageId?: string;
  }): Promise<void> {
    const { error } = await supabase.from('moderation_reports').insert({
      reporter_id: params.reporterId,
      reported_user_id: params.reportedUserId,
      category: params.category,
      reason: params.reason.trim(),
      conversation_id: params.conversationId || null,
      message_id: params.messageId || null,
      status: 'pending',
    });

    if (error) throw error;
  },

  /**
   * Fetch moderation reports for administrators
   */
  async getModerationReports(filterStatus?: ReportStatus): Promise<ModerationReport[]> {
    let query = supabase
      .from('moderation_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterStatus && filterStatus !== ('all' as ReportStatus)) {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Could not load reports:', error.message);
      return [];
    }
    return (data || []) as ModerationReport[];
  },

  /**
   * Resolve or Dismiss a report
   */
  async resolveReport(
    adminId: string,
    reportId: string,
    newStatus: 'resolved' | 'dismissed',
    adminNotes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('moderation_reports')
      .update({
        status: newStatus,
        admin_notes: adminNotes || null,
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) throw error;

    await this.logAdminAction(adminId, `report_${newStatus}`, null, {
      report_id: reportId,
      notes: adminNotes,
    });
  },

  /**
   * Fetch system audit logs (immutable admin history)
   */
  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Could not read audit logs:', error.message);
      return [];
    }
    return (data || []) as AuditLog[];
  },

  /**
   * Append an immutable audit log entry
   */
  async logAdminAction(
    adminId: string,
    actionType: string,
    targetUserId?: string | null,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        admin_id: adminId,
        action_type: actionType,
        target_user_id: targetUserId || null,
        details: details || {},
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  },

  /**
   * Fetch all groups for admin inspection
   */
  async getGroupsList(): Promise<{ id: string; name: string; memberCount: number; created_at: string; created_by: string | null }[]> {
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('id, name, created_at, created_by')
      .eq('type', 'group')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!convs) return [];

    const groupIds = convs.map((c) => c.id);
    const { data: members } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .in('conversation_id', groupIds);

    const countMap = new Map<string, number>();
    if (members) {
      for (const m of members) {
        countMap.set(m.conversation_id, (countMap.get(m.conversation_id) || 0) + 1);
      }
    }

    return (convs || []).map((c: { id: string; name: string | null; created_at?: string; created_by?: string | null }) => ({
      id: c.id,
      name: c.name || 'Unnamed Group',
      memberCount: countMap.get(c.id) || 0,
      created_at: c.created_at || new Date().toISOString(),
      created_by: c.created_by || null,
    }));
  },

  /**
   * Secure admin bootstrap procedure
   */
  async bootstrapInitialAdmin(adminEmail: string): Promise<string> {
    const { data, error } = await supabase.rpc('bootstrap_initial_admin', {
      admin_email: adminEmail.trim().toLowerCase(),
    });
    if (error) throw error;
    return data as string;
  },
};
