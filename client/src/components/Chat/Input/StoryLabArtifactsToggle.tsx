import { memo, useEffect, useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { WandSparkles } from 'lucide-react';
import { CheckboxButton } from '@librechat/client';
import { ArtifactModes } from 'librechat-data-provider';
import { ephemeralAgentByConvoId } from '~/store';
import { useLocalize, useStoryLabEditorPrompt } from '~/hooks';

/** Remembers the user's last toggle choice across refreshes. Defaults OFF. */
const ARTIFACTS_PREF_KEY = 'storylab:artifacts-enabled';

/**
 * StoryLab removed the BadgeRow, so there is no UI to enable Artifacts. This toggle
 * restores that control. It defaults OFF and REMEMBERS the user's last choice in
 * localStorage, so a refresh keeps whatever state the user left it in (no more
 * "always on after every refresh").
 */
function StoryLabArtifactsToggle({ conversationId }: { conversationId: string }) {
  const localize = useLocalize();
  const [ephemeralAgent, setEphemeralAgent] = useRecoilState(
    ephemeralAgentByConvoId(conversationId),
  );

  const mode = ephemeralAgent?.artifacts;
  const isEnabled = typeof mode === 'string' && mode.length > 0;

  // First mount for this conversation: seed from the saved preference (default OFF).
  useEffect(() => {
    if (mode !== undefined) {
      return;
    }
    const savedOn = localStorage.getItem(ARTIFACTS_PREF_KEY) === 'true';
    setEphemeralAgent((prev) => ({
      ...(prev ?? {}),
      artifacts: savedOn ? ArtifactModes.DEFAULT : '',
    }));
  }, [mode, setEphemeralAgent]);

  useStoryLabEditorPrompt(isEnabled);

  const handleToggle = useCallback(() => {
    const next = isEnabled ? '' : ArtifactModes.DEFAULT;
    localStorage.setItem(ARTIFACTS_PREF_KEY, String(!isEnabled));
    setEphemeralAgent((prev) => ({ ...(prev ?? {}), artifacts: next }));
  }, [isEnabled, setEphemeralAgent]);

  return (
    <CheckboxButton
      className="max-w-fit"
      checked={isEnabled}
      setValue={handleToggle}
      label={localize('com_ui_artifacts')}
      isCheckedClassName="border-amber-600/40 bg-amber-500/10 hover:bg-amber-700/10"
      icon={<WandSparkles className="icon-md" aria-hidden="true" />}
    />
  );
}

export default memo(StoryLabArtifactsToggle);
