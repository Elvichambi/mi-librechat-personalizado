import { memo } from 'react';
import { useRecoilValue } from 'recoil';
import store from '~/store';
import ClassicChatForm from './ClassicChatForm';
import StoryLabChatForm from './StoryLabChatForm';

const ChatForm = memo((props: { index?: number }) => {
  const storyLabUI = useRecoilValue(store.storyLabUI);
  return storyLabUI ? <StoryLabChatForm {...props} /> : <ClassicChatForm {...props} />;
});

export default ChatForm;

