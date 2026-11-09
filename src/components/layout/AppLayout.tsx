import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { LeftSidebar } from './LeftSidebar';
import { RightInfoPanel } from './RightInfoPanel';
import { MobileBottomNav } from './MobileBottomNav';
import { AuthModal } from '@/components/common/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const AppLayout: React.FC = () => {
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isAuthModalOpen,
    closeAuthModal,
    openAuthModal,
    authModalAction,
    isDeactivated,
    reactivateAccount,
  } = useAuth();
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    if ((location.state as { requireAuth?: boolean })?.requireAuth) {
      openAuthModal('Authentication Required');
    }
  }, [location.state, openAuthModal]);

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await reactivateAccount();
    } catch (err) {
      console.error('Failed to reactivate account:', err);
    } finally {
      setReactivating(false);
    }
  };

  // Determine if on a dedicated conversation page on mobile
  const isConversationOpenOnMobile = Boolean(conversationId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-text">
      {/* Deactivated Account Notice Banner */}
      {isDeactivated && (
        <aside
          role="status"
          aria-live="polite"
          className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-400 shrink-0 z-40 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <p>
              Your ORBIX account will be temporarily deactivated. You can reactivate it by following the account recovery process.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleReactivate}
            disabled={reactivating}
            className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0 gap-1.5"
          >
            {reactivating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reactivate Account</span>
              </>
            )}
          </Button>
        </aside>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Left Sidebar: Visible on md:screens, or mobile when not inside a conversation */}
        <div
          className={`${
            isConversationOpenOnMobile ? 'hidden md:flex' : 'flex'
          } h-full shrink-0`}
        >
          <LeftSidebar currentConversationId={conversationId} />
        </div>

        {/* Center Main Stage */}
        <div
          className={`flex-1 flex flex-col h-full min-w-0 overflow-hidden ${
            !isConversationOpenOnMobile && location.pathname.startsWith('/app/chats')
              ? 'hidden md:flex'
              : 'flex'
          }`}
        >
          <Outlet
            context={{
              toggleInfoPanel: () => setShowRightPanel((prev) => !prev),
              isMobileConversation: isConversationOpenOnMobile,
              onBackToChats: () => navigate('/app/chats'),
            }}
          />
        </div>

        {/* Desktop Collapsible Right Info Panel */}
        {showRightPanel && (
          <div className="hidden lg:flex h-full shrink-0">
            <RightInfoPanel conversationId={conversationId} onClose={() => setShowRightPanel(false)} />
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation: only visible when NOT in an active conversation viewport */}
      {!isConversationOpenOnMobile && <MobileBottomNav />}

      {/* Public Guest Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        intendedAction={authModalAction}
      />
    </div>
  );
};
