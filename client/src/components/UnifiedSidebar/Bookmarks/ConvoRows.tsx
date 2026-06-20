import { memo } from 'react';
import type { TConversation } from 'librechat-data-provider';
import Convo from '~/components/Conversations/Convo';

const noop = () => {};

function ConvoRows({
  conversations,
  refetch,
  emptyLabel,
}: {
  conversations: TConversation[];
  refetch: () => void;
  emptyLabel: string;
}) {
  if (conversations.length === 0) {
    return <div className="px-3 py-1.5 text-xs text-text-secondary opacity-70">{emptyLabel}</div>;
  }

  return (
    <>
      {conversations.map((conversation) => (
        <Convo
          key={conversation.conversationId}
          conversation={conversation}
          retainView={refetch}
          toggleNav={noop}
        />
      ))}
    </>
  );
}

export default memo(ConvoRows);
