import { useEffect } from 'react';
import { useChatContext } from '~/Providers/ChatContext';
import useSetIndexOptions from '~/hooks/Conversations/useSetIndexOptions';
import {
  STORYLAB_EDITOR_PROMPT,
  isStoryLabEditorPrompt,
} from '~/utils/storyLabEditorPrompt';

/**
 * Auto-applies the StoryLab editor system prompt to the current conversation
 * while the Artefactos toggle is ON. Stays out of the way when the user has
 * set their own custom prompt.
 *
 * Rules:
 *  - `enabled` becomes true → if prompt is empty or already ours, write ours.
 *    If it's the user's own prompt, leave it alone.
 *  - `enabled` becomes false → if prompt is ours, clear it. Otherwise leave.
 *  - We do NOT react to manual edits of the prompt mid-conversation
 *    (would fight the user). Toggling Artefactos off and on again refreshes.
 */
export default function useStoryLabEditorPrompt(enabled: boolean) {
  const { conversation } = useChatContext();
  const { setOption } = useSetIndexOptions();

  const conversationId = conversation?.conversationId ?? null;
  const promptPrefix = conversation?.promptPrefix ?? '';
  const system = conversation?.system ?? '';

  useEffect(() => {
    if (conversationId == null) {
      return;
    }
    const currentPrompt = promptPrefix || system;

    if (enabled) {
      if (!currentPrompt || isStoryLabEditorPrompt(currentPrompt)) {
        if (currentPrompt !== STORYLAB_EDITOR_PROMPT) {
          setOption('promptPrefix')(STORYLAB_EDITOR_PROMPT);
          setOption('system')(STORYLAB_EDITOR_PROMPT);
        }
      }
      return;
    }

    if (isStoryLabEditorPrompt(currentPrompt)) {
      setOption('promptPrefix')('');
      setOption('system')('');
    }
    // Intentionally omit promptPrefix / system from deps — we don't want to
    // re-fire on every edit the user makes to their own prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, conversationId]);
}
