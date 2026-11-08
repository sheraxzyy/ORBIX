import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Paperclip,
  Info,
  Check,
  CheckCheck,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit2,
  RotateCcw,
  MessageSquare,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  conversationService,
  type ConversationWithDetails,
} from '@/services/conversationService';
import {
  messageService,
  type MessageWithReactions,
  type Message,
} from '@/services/messageService';
import { presenceService } from '@/services/presenceService';
import { storageService } from '@/services/storageService';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface CenterChatPanelProps {
  conversationId?: string;
  onToggleInfo?: () => void;
  onBackMobile?: () => void;
  isMobileView?: boolean;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '👏', '🚀'];

export const CenterChatPanel: React.FC<CenterChatPanelProps> = ({
  conversationId,
  onToggleInfo,
  onBackMobile,
  isMobileView = false,
}) => {
  const { user, profile, openAuthModal } = useAuth();

  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithReactions[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [draftMessage, setDraftMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<Record<string, { username: string; isTyping: boolean }>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId
  const [uploading, setUploading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversation & messages
  const loadChat = useCallback(async () => {
    if (!conversationId || !user) return;
    setLoading(true);

    try {
      const [convData, msgData] = await Promise.all([
        conversationService.getConversation(conversationId, user.id),
        messageService.getMessages(conversationId),
      ]);

      setConversation(convData);
      setMessages(msgData);

      // Advance read pointer
      if (msgData.length > 0) {
        const lastMsg = msgData[msgData.length - 1];
        if (lastMsg) {
          messageService.markAsRead(conversationId, user.id, lastMsg.id, lastMsg.seq);
        }
      }
    } catch (err) {
      console.error('Error loading chat:', err);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [conversationId, user]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  // Subscribe to Realtime Messages
  useEffect(() => {
    if (!conversationId) return;

    const unsub = messageService.subscribeToConversationMessages(conversationId, {
      onInsert: (newMsg: Message) => {
        setMessages((prev) => {
          // Deduplicate by client_id or id
          const exists = prev.some(
            (m) => m.id === newMsg.id || (m.client_id && m.client_id === newMsg.client_id)
          );
          if (exists) {
            return prev.map((m) =>
              m.client_id === newMsg.client_id ? { ...newMsg, status: 'sent' } : m
            );
          }
          return [...prev, { ...newMsg, status: 'read' }];
        });
        setTimeout(scrollToBottom, 50);

        if (user) {
          messageService.markAsRead(conversationId, user.id, newMsg.id, newMsg.seq);
        }
      },
      onUpdate: (updatedMsg: Message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
        );
      },
      onDelete: (deletedId: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === deletedId
              ? { ...m, body: 'This message was deleted.', deleted_at: new Date().toISOString() }
              : m
          )
        );
      },
    });

    return () => {
      unsub();
    };
  }, [conversationId, user]);

  // Subscribe to Realtime Typing Broadcast
  useEffect(() => {
    if (!conversationId || !user || !profile) return;

    const channel = presenceService.createConversationPresence(
      conversationId,
      { id: user.id, username: profile.username, displayName: profile.display_name },
      (typingMap) => {
        setTypingUsers(typingMap);
      }
    );

    typingChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, user, profile]);

  const handleInputChange = (val: string) => {
    setDraftMessage(val);
    if (sendError) setSendError(null);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    if (typingChannelRef.current && user && profile) {
      presenceService.broadcastTyping(typingChannelRef.current, user.id, profile.username, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (typingChannelRef.current && user && profile) {
          presenceService.broadcastTyping(typingChannelRef.current, user.id, profile.username, false);
        }
      }, 2000);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      openAuthModal('Sign in to send messages');
      return;
    }
    const body = draftMessage.trim();
    if (!body || !conversationId) return;

    const tempClientId = crypto.randomUUID();
    const lastSeq = messages.length > 0 && messages[messages.length - 1] ? messages[messages.length - 1]!.seq : 0;

    // Optimistic message item with accurate sequential sequence
    const optimisticMsg: MessageWithReactions = {
      id: tempClientId,
      conversation_id: conversationId,
      sender_id: user.id,
      client_id: tempClientId,
      body,
      reply_to_id: null,
      forwarded_from_id: null,
      seq: lastSeq + 1,
      edited_at: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      status: 'sending',
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setDraftMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setSending(true);
    setSendError(null);
    setTimeout(scrollToBottom, 50);

    // Stop typing broadcast
    if (typingChannelRef.current && profile) {
      presenceService.broadcastTyping(typingChannelRef.current, user.id, profile.username, false);
    }

    try {
      const serverMsg = await messageService.sendMessage(
        conversationId,
        user.id,
        body,
        undefined,
        tempClientId
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.client_id === tempClientId ? { ...serverMsg, status: 'sent' } : m
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message.';
      console.error('Failed to send message:', err);
      setSendError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.client_id === tempClientId ? { ...m, status: 'failed' } : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  const handleRetryMessage = async (failedMsg: MessageWithReactions) => {
    if (!user || !conversationId) return;
    setSendError(null);
    setMessages((prev) =>
      prev.map((m) =>
        m.client_id === failedMsg.client_id ? { ...m, status: 'sending' } : m
      )
    );

    try {
      const serverMsg = await messageService.sendMessage(
        conversationId,
        user.id,
        failedMsg.body,
        failedMsg.reply_to_id || undefined,
        failedMsg.client_id
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.client_id === failedMsg.client_id ? { ...serverMsg, status: 'sent' } : m
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Message retry failed.';
      console.error('Failed to retry message:', err);
      setSendError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.client_id === failedMsg.client_id ? { ...m, status: 'failed' } : m
        )
      );
    }
  };

  const handleEditSubmit = async (messageId: string) => {
    if (!editBody.trim() || !user) return;
    try {
      await messageService.editMessage(messageId, user.id, editBody.trim());
      setEditingMessageId(null);
      setEditBody('');
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!user) return;
    try {
      await messageService.deleteMessage(messageId, user.id);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!user) {
      openAuthModal('Sign in to react to messages');
      return;
    }
    setShowEmojiPicker(null);
    try {
      await messageService.addReaction(messageId, user.id, emoji);
      const updatedMessages = await messageService.getMessages(conversationId!);
      setMessages(updatedMessages);
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;
    if (!user) {
      openAuthModal('Sign in to upload attachments');
      return;
    }

    setUploading(true);
    try {
      const { path, name } = await storageService.uploadAttachment(conversationId, file);
      const attachmentText = `[Attachment: ${name}](${path})`;
      await messageService.sendMessage(conversationId, user.id, attachmentText);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload attachment. Supabase storage bucket may be private or unconfigured.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!conversationId) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center h-full bg-background p-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center text-primary mb-4 shadow-crimson-sm">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-text mb-2 tracking-tight">
          Your conversations start here.
        </h2>
        <p className="text-xs sm:text-sm text-text-muted max-w-sm mb-6 leading-relaxed">
          Connect with people and start a conversation on ORBIX.
        </p>
        <Button
          onClick={() => {
            if (!user) {
              openAuthModal('Connect with people and start a conversation on ORBIX');
            } else {
              const newChatBtn = document.querySelector('[aria-label="New Conversation"]') as HTMLButtonElement;
              if (newChatBtn) newChatBtn.click();
            }
          }}
          className="gap-2 px-6 h-11 text-sm font-semibold shadow-crimson-sm"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Start Chatting</span>
        </Button>
      </main>
    );
  }

  const activeTypingList = Object.values(typingUsers).filter((t) => t.isTyping);

  return (
    <main className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Chat Top Header */}
      <div className="h-16 px-4 border-b border-border bg-surface/70 backdrop-blur-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {isMobileView && onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="p-1.5 -ml-1 rounded-lg text-text-muted hover:text-text hover:bg-card focus-visible:outline-primary"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            {conversation?.displayAvatar ? (
              <img
                src={conversation.displayAvatar}
                alt={conversation.displayName}
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-sm text-primary">
                {(conversation?.displayName || 'Chat').substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface" />
          </div>

          <div>
            <h2 className="text-sm sm:text-base font-bold text-text leading-none">
              {conversation?.displayName || 'Loading...'}
            </h2>
            <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1.5 font-mono">
              <span className="text-success font-medium">Realtime Active</span>
              <span>•</span>
              <span className="text-[10px]">Postgres RLS Guarded</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {onToggleInfo && (
            <button
              type="button"
              onClick={onToggleInfo}
              className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-card focus-visible:outline-primary"
              aria-label="Toggle Conversation Intel Panel"
              title="Toggle Information Panel"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Security Banner */}
      <div className="bg-surface/50 border-b border-border/80 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] text-text-muted font-mono">
        <ShieldAlert className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Encrypted in transit and at rest by the platform, with access controlled by RLS.</span>
      </div>

      {/* Messages Scroll Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-primary shadow-crimson-sm mb-1">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-text">Your conversations start here</h3>
            <p className="text-xs text-text-muted max-w-sm">
              Connect with people and start a conversation on ORBIX. Send a message below to begin chatting in real time.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            const isDeleted = Boolean(msg.deleted_at);
            const isEditing = editingMessageId === msg.id;

            return (
              <div
                key={msg.id || msg.client_id}
                className={`flex flex-col group relative ${isOwn ? 'items-end' : 'items-start'}`}
              >
                {!isOwn && (
                  <span className="text-[11px] font-semibold text-text-muted mb-1 ml-1">
                    {msg.senderName || 'Participant'}
                  </span>
                )}

                <div className="relative max-w-[85%] sm:max-w-[70%]">
                  {/* Inline Message Action Toolbar */}
                  <div
                    className={`absolute -top-7 ${
                      isOwn ? 'right-0' : 'left-0'
                    } hidden group-hover:flex items-center gap-1 bg-surface border border-border rounded-lg px-1.5 py-0.5 shadow-sm z-10`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)
                      }
                      className="p-1 hover:text-primary text-text-muted transition-colors text-xs"
                      title="Add reaction"
                    >
                      😊
                    </button>
                    {isOwn && !isDeleted && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setEditBody(msg.body);
                          }}
                          className="p-1 hover:text-text text-text-muted transition-colors"
                          title="Edit message"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(msg.id)}
                          className="p-1 hover:text-danger text-text-muted transition-colors"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Emoji Quick Picker Dropdown */}
                  {showEmojiPicker === msg.id && (
                    <div className="absolute -top-12 left-0 bg-surface border border-border rounded-xl p-1.5 shadow-xl flex items-center gap-1.5 z-20 animate-fade-in">
                      {COMMON_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => handleAddReaction(msg.id, em)}
                          className="p-1.5 hover:scale-125 transition-transform text-base"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm transition-all ${
                      isOwn
                        ? 'bg-primary text-white rounded-tr-xs shadow-crimson-sm'
                        : 'bg-card border border-border text-text rounded-tl-xs'
                    } ${isDeleted ? 'italic text-text-muted bg-surface/50 border-dashed' : ''}`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="bg-background text-text text-xs h-8"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingMessageId(null)}
                            className="text-[10px] text-text-muted hover:text-text"
                          >
                            Cancel
                          </button>
                          <Button
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => handleEditSubmit(msg.id)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                        <div
                          className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                            isOwn ? 'text-white/80' : 'text-text-muted'
                          }`}
                        >
                          {msg.edited_at && <span className="text-[9px]">(edited)</span>}
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOwn && (
                            <span className="inline-flex items-center">
                              {msg.status === 'sending' ? (
                                <Loader2 className="w-3 h-3 animate-spin text-white/70" />
                              ) : msg.status === 'failed' ? (
                                <button
                                  type="button"
                                  onClick={() => handleRetryMessage(msg)}
                                  className="inline-flex items-center gap-1 bg-white text-danger px-1.5 py-0.5 rounded text-[9px] font-bold shadow-xs hover:bg-white/90 transition-colors"
                                  title="Click to retry sending"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Retry</span>
                                </button>
                              ) : msg.status === 'sent' ? (
                                <span title="Sent">
                                  <Check className="w-3.5 h-3.5 text-white/80" />
                                </span>
                              ) : (
                                <span title="Delivered / Read">
                                  <CheckCheck className="w-3.5 h-3.5 text-white" />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Message Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {msg.reactions.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-surface border border-border shadow-xs"
                        >
                          {r.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Realtime Typing Indicator Banner */}
        {activeTypingList.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-text-muted font-mono animate-fade-in pl-1">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>
              {activeTypingList.map((t) => t.username).join(', ')}{' '}
              {activeTypingList.length === 1 ? 'is typing...' : 'are typing...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
      />

      {/* Send Error Alert Banner */}
      {sendError && (
        <div className="px-4 py-2 bg-danger/10 border-t border-danger/30 text-danger text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{sendError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSendError(null)}
            className="p-1 rounded text-danger/80 hover:text-danger hover:bg-danger/20 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Message Composer Dock */}
      <div className="p-3 sm:p-4 border-t border-border bg-surface/80 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl border border-border bg-card text-text-muted hover:text-text hover:border-primary/50 transition-colors focus-visible:outline-primary mb-0.5"
            aria-label="Attach File"
            title="Attach file"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={draftMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none min-h-[44px] max-h-32 transition-all font-sans leading-relaxed block"
            />
          </div>

          <Button
            type="submit"
            disabled={!draftMessage.trim() || sending}
            size="default"
            className="h-11 px-4 gap-1.5 shrink-0 mb-0.5"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </main>
  );
};
