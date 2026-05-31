import { useRecoilValue } from 'recoil';
import store from '~/store';
import ClassicHeader from './ClassicHeader';
import StoryLabHeader from './StoryLabHeader';

export default function Header() {
  const storyLabUI = useRecoilValue(store.storyLabUI);
  return storyLabUI ? <StoryLabHeader /> : <ClassicHeader />;
}
