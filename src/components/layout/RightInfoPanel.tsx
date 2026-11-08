import React, { useState, useEffect } from 'react';
import {
  X,
  UserX,
  LogOut,
  Loader2,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  conversationService,
  type ConversationWithDetails,
} from '@/services/conversationService';
import { contactService } from '@/services/contactService';

interface RightInfoPanelProps {
  conversationId?: string;
  onClose: () => void;
}

export const RightInfoPanel: React.FC<RightInfoPanelProps> = ({
  conversationId,
  onClose,
}) => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'settings'>('members');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!conversationId || !user) return;
    setLoading(true);

    conversationService
      .getConversation(conversationId, user.id)
      .then((data) => setConversation(data))
      .catch((err) => console.error('Error fetching conversation intel:', err))
      .finally(() => setLoading(false));
  }, [conversationId, user]);

  const handleBlockOther = async () => {
    if (!conversation || conversation.type !== 'direct' || !user) return;
    const other = conversation.participants.find((p) => p.id !== user.id);
    if (!other) return;

    if (!confirm(`Are you sure you want to block ${other.display_name}?`)) return;

    setActionLoading(true);
    try {
      await contactService.blockUser(user.id, other.id);
      alert(`${other.display_name} has been blocked.`);
      onClose();
    } catch (err) {
      console.error('Error blocking user:', err);
      alert('Failed to block user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!conversation || conversation.type !== 'group' || !user) return;

    if (!confirm('Are you sure you want to leave this group?')) return;

    setActionLoading(true);
    try {
      await conversationService.leaveGroup(conversation.id, user.id);
      alert('You have left the group.');
      onClose();
      window.location.href = '/app/chats';
    } catch (err) {
      console.error('Error leaving group:', err);
      alert('Failed to leave group.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!conversationId) return null;

  return (
    <aside className="w-80 flex flex-col h-full bg-surface border-l border-border select-none shrink-0 animate-fade-in">
      {/* Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between">
        <span className="text-sm font-bold text-text">Conversation Intel</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-card focus-visible:outline-primary"
          aria-label="Close information panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !conversation ? (
        <div className="p-6 text-center text-xs text-text-muted">
          No details available.
        </div>
      ) : (
        <>
          {/* Main Channel Avatar & Info */}
          <div className="p-6 text-center border-b border-border flex flex-col items-center">
            {conversation.displayAvatar ? (
              <img
                src={conversation.displayAvatar}
                alt={conversation.displayName}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary/40 mb-3 shadow-crimson-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center font-bold text-2xl text-primary mb-3 shadow-crimson-sm">
                {conversation.displayName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <h3 className="text-base font-bold text-text">{conversation.displayName}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {conversation.type === 'group'
                ? `${conversation.participants.length} Members`
                : 'Direct Encryption Channel'}
            </p>
          </div>

          {/* Segmented View Tabs */}
          <div className="flex border-b border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2.5 border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-primary text-primary bg-card/40'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              Participants ({conversation.participants.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`flex-1 py-2.5 border-b-2 transition-colors ${
                activeTab === 'media'
                  ? 'border-primary text-primary bg-card/40'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              Shared Media
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2.5 border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-primary text-primary bg-card/40'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              Security
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'members' && (
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-text-muted">
                  Members List
                </span>
                {conversation.participants.map((p) => {
                  const isCurrent = p.id === user?.id;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-card/60 border border-border"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                          {p.display_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-text">
                            {p.display_name} {isCurrent && '(You)'}
                          </p>
                          <p className="text-[10px] text-text-muted">@{p.username}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-3">
                <span className="text-[11px] font-mono uppercase text-text-muted">
                  Shared Media
                </span>
                <div className="p-6 rounded-xl border border-dashed border-border bg-card/40 text-center">
                  <Image className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-text font-medium">No Shared Media</p>
                  <p className="text-[10px] text-text-muted mt-1">
                    Upload images or documents in chat to see them archived here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-card border border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Row-Level Security</span>
                    <span className="text-success font-mono">Enforced</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Channel Protocol</span>
                    <span className="text-primary font-mono">Postgres Realtime</span>
                  </div>
                </div>

                {conversation.type === 'direct' ? (
                  <Button
                    variant="outline"
                    disabled={actionLoading}
                    onClick={handleBlockOther}
                    className="w-full justify-start text-xs gap-2 text-danger hover:text-danger hover:bg-danger/10 border-danger/30"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Block Participant</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={actionLoading}
                    onClick={handleLeaveGroup}
                    className="w-full justify-start text-xs gap-2 text-danger hover:text-danger hover:bg-danger/10 border-danger/30"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Group</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};
