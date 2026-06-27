import { useEffect } from 'react';
import { useChatContext } from '~/Providers/ChatContext';
import useSetIndexOptions from '~/hooks/Conversations/useSetIndexOptions';
import {
  getStoryLabEditorPrompt,
  isStoryLabEditorPrompt,
} from '~/utils/storyLabEditorPrompt';

/**
 * Auto-applies the StoryLab editor system prompt to the current conversation
 * while the Artefactos toggle is ON. The prompt content carries a leading
 * marker so the UI can hide it from the System Instructions card / textarea —
 * the user only sees it inside the dedicated "📁 Oculto" folder.
 *
 * Rules:
 *  - `enabled` becomes true → if the active prompt is empty or already ours,
 *    write the (possibly user-overridden) editor prompt. If the user has set
 *    their own prompt, leave it alone.
 *  - `enabled` becomes false → if the active prompt is ours, clear it.
 *  - Mid-conversation manual edits to the prompt are NOT clobbered (re-toggle
 *    to refresh).
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
        const next = getStoryLabEditorPrompt();
        if (currentPrompt !== next) {
          setOption('promptPrefix')(next);
          setOption('system')(next);
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
