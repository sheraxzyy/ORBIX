import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  UserCheck,
  User,
  Settings,
  Search,
  Plus,
  Radio,
  LogOut,
  LogIn,
  Shield,
  X,
  Loader2,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  conversationService,
  type ConversationWithDetails,
} from '@/services/conversationService';
import { profileService, type Profile } from '@/services/profileService';
import { presenceService, type PresenceUser } from '@/services/presenceService';

interface LeftSidebarProps {
  currentConversationId?: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ currentConversationId }) => {
  const { user, profile, signOut, isAdmin, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceUser>>({});

  // New Chat modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  const navItems = [
    { to: '/app/chats', label: 'Chats', icon: MessageSquare },
    { to: '/app/groups', label: 'Groups', icon: Users },
    { to: '/app/contacts', label: 'Contacts', icon: UserCheck },
    { to: '/app/profile', label: 'Profile', icon: User },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ];

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await conversationService.getConversations(user.id);
      setConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime conversation updates
  useEffect(() => {
    if (!user) return;
    const unsub = conversationService.subscribeToConversations(user.id, () => {
      fetchConversations();
    });
    return () => {
      unsub();
    };
  }, [user, fetchConversations]);

  // Presence channel
  useEffect(() => {
    if (!user || !profile) return;
    const channel = presenceService.createGlobalPresenceChannel(
      {
        id: user.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
      },
      (users) => {
        setOnlineUsers(users);
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [user, profile]);

  // Handle user search in New Chat modal
  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await profileService.searchProfiles(query, user.id);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStartDirectChat = async (targetUserId: string) => {
    setStartingChatId(targetUserId);
    try {
      const convId = await conversationService.getOrCreateDirectConversation(targetUserId);
      setIsNewChatOpen(false);
      setUserSearchQuery('');
      setSearchResults([]);
      await fetchConversations();
      navigate(`/app/chats/${convId}`);
    } catch (err) {
      console.error('Failed to initiate conversation:', err);
      alert('Could not start conversation. Please check your connection.');
    } finally {
      setStartingChatId(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.participants.some((p) => p.username.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q))
    );
  });

  return (
    <aside className="w-80 sm:w-88 flex flex-col h-full bg-surface border-r border-border shrink-0 select-none">
      {/* Top Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between">
        <BrandLogo variant="full" />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors focus-visible:outline-primary"
                  title="Admin Dashboard"
                  aria-label="Admin Dashboard"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-card transition-colors focus-visible:outline-primary"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAuthModal('Sign In')}
              className="text-xs h-8 px-2.5 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </Button>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="flex items-center justify-around px-2 py-2 border-b border-border bg-card/40" aria-label="Main App Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => {
                if (!user && item.to !== '/app/chats') {
                  e.preventDefault();
                  openAuthModal(`Access ${item.label}`);
                }
              }}
              className={({ isActive }) =>
                `relative p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 text-xs font-medium focus-visible:outline-primary ${
                  isActive
                    ? 'text-primary bg-primary/10 font-semibold'
                    : 'text-text-muted hover:text-text hover:bg-card'
                }`
              }
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] hidden sm:block">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Conversation Search Bar */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 bg-card text-xs h-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-mono uppercase text-text-muted">
          <span>Active Channels</span>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                openAuthModal('Start a private conversation');
              } else {
                setIsNewChatOpen(true);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-card text-primary transition-colors focus-visible:outline-primary"
            title="New Direct Conversation"
            aria-label="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {loading && user ? (
          <div className="p-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-text-muted">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-primary mx-auto shadow-crimson-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-text">
              {searchQuery ? 'No conversations matching search.' : 'Your conversations start here.'}
            </p>
            <p className="text-[11px] text-text-muted">
              {!searchQuery && 'Connect with people and start a conversation on ORBIX.'}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={() => {
                  if (!user) {
                    openAuthModal('Connect with people and start a conversation on ORBIX');
                  } else {
                    setIsNewChatOpen(true);
                  }
                }}
                className="text-xs gap-1.5 shadow-crimson-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start Chatting</span>
              </Button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = currentConversationId === conv.id;
            const otherUser = conv.participants.find((p) => p.id !== user?.id);
            const isOnline = otherUser ? Boolean(onlineUsers[otherUser.id]) : false;
            const initials = conv.displayName.substring(0, 2).toUpperCase();

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => navigate(`/app/chats/${conv.id}`)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border ${
                  isSelected
                    ? 'bg-card border-primary/40 shadow-sm'
                    : 'border-transparent hover:bg-card/60 hover:border-border'
                }`}
              >
                <div className="relative shrink-0">
                  {conv.displayAvatar ? (
                    <img
                      src={conv.displayAvatar}
                      alt={conv.displayName}
                      className="w-11 h-11 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'bg-primary text-white' : 'bg-surface border border-border text-text'
                      }`}
                    >
                      {initials}
                    </div>
                  )}

                  {conv.type === 'direct' && isOnline && (
                    <span
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-surface"
                      title="Online"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-text truncate">
                      {conv.displayName}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {conv.last_message_at
                        ? new Date(conv.last_message_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-muted truncate pr-2">
                      {conv.type === 'group' ? 'Group conversation' : `@${otherUser?.username || 'user'}`}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-primary text-white text-[10px] font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Network & Backend Status Indicator */}
      <div className="p-3 border-t border-border bg-card/60 flex items-center justify-between text-xs font-mono text-text-muted">
        {user ? (
          <>
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-success animate-pulse" />
              <span>Realtime Live</span>
            </div>
            <span className="text-[10px] text-text-muted">
              {Object.keys(onlineUsers).length} online
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Guest Preview</span>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('Sign In')}
              className="text-primary hover:underline text-[11px] font-semibold font-sans"
            >
              Sign In
            </button>
          </>
        )}
      </div>

      {/* New Direct Chat Modal */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-text">Find people by username</h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Ask your friends for their ORBIX username to find them.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewChatOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-card focus-visible:outline-primary"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="userSearchInput" className="block text-xs font-medium text-text">
                Find people by username
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="userSearchInput"
                  type="search"
                  autoFocus
                  placeholder="Enter a username... (e.g. @sheran)"
                  value={userSearchQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  className="pl-9 bg-card text-xs h-10"
                />
              </div>
              <p className="text-[10px] text-text-muted font-mono">
                Example: @sheran
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {searchLoading ? (
                <div className="py-6 text-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-text-muted">Searching usernames...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-center py-6 text-xs text-text-muted">
                  {userSearchQuery.trim()
                    ? 'No users found matching that exact username.'
                    : 'Enter an ORBIX username to begin a conversation.'}
                </p>
              ) : (
                searchResults.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    disabled={startingChatId === target.id}
                    onClick={() => handleStartDirectChat(target.id)}
                    className="w-full p-2.5 rounded-xl hover:bg-card flex items-center justify-between text-left transition-colors border border-transparent hover:border-border group"
                  >
                    <div className="flex items-center gap-3">
                      {target.avatar_url ? (
                        <img
                          src={target.avatar_url}
                          alt={target.username}
                          className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                          {target.display_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        {/* Username prominently displayed first */}
                        <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">
                          @{target.username}
                        </p>
                        {/* Display name as secondary info */}
                        <p className="text-[11px] text-text-muted">{target.display_name}</p>
                      </div>
                    </div>
                    {startingChatId === target.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <span className="text-xs text-primary font-medium px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                        Chat
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
