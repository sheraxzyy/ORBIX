import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { LeftSidebar } from './LeftSidebar';
import { RightInfoPanel } from './RightInfoPanel';
import { MobileBottomNav } from './MobileBottomNav';
import { AuthModal } from '@/components/common/AuthModal';
import { useAuth } from '@/contexts/AuthContext';

export const AppLayout: React.FC = () => {
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthModalOpen, closeAuthModal, openAuthModal, authModalAction } = useAuth();
  const [showRightPanel, setShowRightPanel] = useState(false);

  useEffect(() => {
    if ((location.state as { requireAuth?: boolean })?.requireAuth) {
      openAuthModal('Authentication Required');
    }
  }, [location.state, openAuthModal]);

  // Determine if on a dedicated conversation page on mobile
  const isConversationOpenOnMobile = Boolean(conversationId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text">
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


