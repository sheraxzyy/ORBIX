import React from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { CenterChatPanel } from '@/components/layout/CenterChatPanel';

interface OutletContextType {
  toggleInfoPanel: () => void;
  isMobileConversation: boolean;
  onBackToChats: () => void;
}

export const ConversationPage: React.FC = () => {
  const { conversationId } = useParams();
  const { toggleInfoPanel, isMobileConversation, onBackToChats } =
    useOutletContext<OutletContextType>();

  return (
    <div className="flex-1 flex h-full">
      <CenterChatPanel
        conversationId={conversationId}
        onToggleInfo={toggleInfoPanel}
        isMobileView={isMobileConversation}
        onBackMobile={onBackToChats}
      />
    </div>
  );
};
export default ConversationPage;

