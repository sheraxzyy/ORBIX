import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ShieldCheck, MessageSquare, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  conversationService,
  type ConversationWithDetails,
} from '@/services/conversationService';
import { contactService, type ContactWithProfile } from '@/services/contactService';

export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Create Group Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [groupDesc, setGroupDesc] = useState<string>('');
  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creating, setCreating] = useState<boolean>(false);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const allConvs = await conversationService.getConversations(user.id);
      setGroups(allConvs.filter((c) => c.type === 'group'));
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const openCreateModal = async () => {
    setIsCreateOpen(true);
    if (user) {
      const cList = await contactService.getContacts(user.id);
      setContacts(cList);
    }
  };

  const toggleSelectMember = (uid: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !user) return;

    setCreating(true);
    try {
      const convId = await conversationService.createGroup(
        groupName.trim(),
        groupDesc.trim(),
        selectedMemberIds
      );
      setIsCreateOpen(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedMemberIds([]);
      await fetchGroups();
      navigate(`/app/chats/${convId}`);
    } catch (err) {
      console.error('Failed to create group:', err);
      alert('Could not create group. Check connection.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Groups</h1>
            <p className="text-sm text-text-muted mt-1">
              Create and manage collaborative channels governed by PostgreSQL RLS roles.
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            <span>Create Group</span>
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-text-muted">Loading group channels...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface border border-border border-dashed text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-text-muted mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-text">No active groups</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              You are not a member of any group conversations yet. Create a group to collaborate.
            </p>
            <Button size="sm" onClick={openCreateModal} className="text-xs">
              Create Your First Group
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((grp) => (
              <div
                key={grp.id}
                className="p-5 rounded-2xl bg-surface border border-border space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-lg">
                      {grp.displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-text">{grp.displayName}</h3>
                      <p className="text-xs text-text-muted">
                        {grp.participants.length} Member{grp.participants.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {grp.description && (
                    <p className="text-xs text-text-muted leading-relaxed">{grp.description}</p>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-between text-xs border-t border-border/60">
                  <span className="flex items-center gap-1 text-success font-mono text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Role: {grp.member.role}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/app/chats/${grp.id}`)}
                    className="gap-1.5 text-xs h-8"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Chat</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text">Create Group Channel</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-card focus-visible:outline-primary"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text">Group Name</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Core Operations Syndicate"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text">Description</label>
                <Input
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="e.g. Infrastructure, roadmap, and real-time review."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text">Add Contacts as Members</label>
                {contacts.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-1">
                    No contacts available. You can also add members later.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-xl p-2 bg-card">
                    {contacts.map((c) => {
                      const isSelected = selectedMemberIds.includes(c.contact_id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleSelectMember(c.contact_id)}
                          className={`w-full p-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                            isSelected
                              ? 'bg-primary/15 text-primary border border-primary/30'
                              : 'hover:bg-surface text-text'
                          }`}
                        >
                          <span className="font-medium">{c.profile.display_name}</span>
                          <span className="text-[10px] text-text-muted">
                            {isSelected ? 'Added' : '+ Add'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!groupName.trim() || creating}
                  className="w-full h-10 text-sm font-semibold"
                >
                  {creating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Group...</span>
                    </span>
                  ) : (
                    'Create Group'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default GroupsPage;
