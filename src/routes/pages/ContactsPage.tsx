import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Shield, Loader2, MessageSquare, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { contactService, type ContactWithProfile } from '@/services/contactService';
import { profileService, type Profile } from '@/services/profileService';
import { conversationService } from '@/services/conversationService';

export const ContactsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Contact Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addSearchQuery, setAddSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await contactService.getContacts(user.id);
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSearchUsers = async (query: string) => {
    setAddSearchQuery(query);
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await profileService.searchProfiles(query, user.id);
      setSearchResults(results);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddContact = async (contactUser: Profile) => {
    if (!user) return;
    setAddingId(contactUser.id);
    try {
      await contactService.addContact(user.id, contactUser.id);
      await fetchContacts();
      setIsAddModalOpen(false);
      setAddSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to add contact:', err);
      alert('Could not add contact. They may already be in your list.');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!user) return;
    if (!confirm('Remove this user from your contacts?')) return;

    try {
      await contactService.removeContact(user.id, contactId);
      setContacts((prev) => prev.filter((c) => c.contact_id !== contactId));
    } catch (err) {
      console.error('Failed to remove contact:', err);
    }
  };

  const handleStartChat = async (contactId: string) => {
    try {
      const convId = await conversationService.getOrCreateDirectConversation(contactId);
      navigate(`/app/chats/${convId}`);
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.profile.display_name.toLowerCase().includes(q) ||
      c.profile.username.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Contacts</h1>
            <p className="text-sm text-text-muted mt-1">
              Connect with people via unique handles without exposing private personal email addresses.
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
            <UserPlus className="w-4 h-4" />
            <span>Add Contact</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts by username or display name..."
            className="pl-9 bg-surface text-sm"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-text-muted">Loading your contact list...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface border border-border border-dashed text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-text-muted mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-text">No contacts found</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              {searchQuery
                ? 'No contacts matched your search query.'
                : 'Your contact directory is empty. Add other operators to message them quickly.'}
            </p>
            {!searchQuery && (
              <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="text-xs">
                Add Your First Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  {c.profile.avatar_url ? (
                    <img
                      src={c.profile.avatar_url}
                      alt={c.profile.display_name}
                      className="w-11 h-11 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                      {c.profile.display_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-text">{c.profile.display_name}</h3>
                    <p className="text-xs text-text-muted">@{c.profile.username}</p>
                    {c.profile.bio && (
                      <p className="text-[11px] text-text-muted italic mt-0.5 max-w-md truncate">
                        &quot;{c.profile.bio}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartChat(c.contact_id)}
                    className="gap-1.5 text-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleRemoveContact(c.contact_id)}
                    className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-card transition-colors"
                    title="Remove Contact"
                    aria-label="Remove Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 rounded-xl bg-surface/40 border border-border text-xs text-text-muted flex items-center gap-3">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <span>
            Discovery is protected by PostgreSQL pg_trgm indices. Private email addresses are never returned or queryable.
          </span>
        </div>
      </div>

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text">Add Contact</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-card focus-visible:outline-primary"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="search"
                autoFocus
                placeholder="Search username or display name..."
                value={addSearchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="pl-9 bg-card text-xs h-10"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {searching ? (
                <div className="py-6 text-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-text-muted">Searching users...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-center py-6 text-xs text-text-muted">
                  {addSearchQuery.trim()
                    ? 'No matching users found.'
                    : 'Type a name or username to search.'}
                </p>
              ) : (
                searchResults.map((target) => (
                  <div
                    key={target.id}
                    className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                        {target.display_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-text">{target.display_name}</p>
                        <p className="text-[11px] text-text-muted">@{target.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={addingId === target.id}
                      onClick={() => handleAddContact(target)}
                      className="text-xs"
                    >
                      {addingId === target.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Add'
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ContactsPage;
