import { memo, useEffect, useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { WandSparkles } from 'lucide-react';
import { CheckboxButton } from '@librechat/client';
import { ArtifactModes } from 'librechat-data-provider';
import { ephemeralAgentByConvoId } from '~/store';
import { useLocalize } from '~/hooks';

/**
 * StoryLab removed the BadgeRow, so there is no UI to enable Artifacts. This toggle
 * restores that control and defaults Artifacts ON, ensuring the backend injects the
 * `:::artifact` system prompt for ephemeral (standard) StoryLab conversations.
 */
function StoryLabArtifactsToggle({ conversationId }: { conversationId: string }) {
  const localize = useLocalize();
  const [ephemeralAgent, setEphemeralAgent] = useRecoilState(
    ephemeralAgentByConvoId(conversationId),
  );

  const mode = ephemeralAgent?.artifacts;
  const isEnabled = typeof mode === 'string' && mode.length > 0;

  useEffect(() => {
    if (mode === undefined) {
      setEphemeralAgent((prev) => ({ ...(prev ?? {}), artifacts: ArtifactModes.DEFAULT }));
    }
  }, [mode, setEphemeralAgent]);

  const handleToggle = useCallback(() => {
    setEphemeralAgent((prev) => ({
      ...(prev ?? {}),
      artifacts: isEnabled ? '' : ArtifactModes.DEFAULT,
    }));
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
