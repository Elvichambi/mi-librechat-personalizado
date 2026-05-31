import { memo } from 'react';
import { useRecoilValue } from 'recoil';
import store from '~/store';
import ClassicChatView from './ClassicChatView';
import StoryLabChatView from './StoryLabChatView';
import type { TMessage } from 'librechat-data-provider';

const ChatView = memo((props: { index?: number }) => {
  const storyLabUI = useRecoilValue(store.storyLabUI);
  return storyLabUI ? <StoryLabChatView {...props} /> : <ClassicChatView {...props} />;
});

export default ChatView;
