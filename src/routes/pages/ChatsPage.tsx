import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { CenterChatPanel } from '@/components/layout/CenterChatPanel';

interface OutletContextType {
  toggleInfoPanel: () => void;
  isMobileConversation: boolean;
  onBackToChats: () => void;
}

export const ChatsPage: React.FC = () => {
  const { toggleInfoPanel } = useOutletContext<OutletContextType>();

  return (
    <div className="flex-1 flex h-full">
      <CenterChatPanel
        conversationId={undefined}
        onToggleInfo={toggleInfoPanel}
      />
    </div>
  );
};
export default ChatsPage;

