import React from 'react';
import { useRecoilState } from 'recoil';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSetIndexOptions } from '~/hooks/Conversations';
import { useChatContext } from '~/Providers';
import Parameters from '~/components/SidePanel/Parameters/Panel';
import '~/components/Chat/StoryLabStyles.css';
import store from '~/store';

export default function RunSettings() {
  const [collapsed, setCollapsed] = useRecoilState(store.runSettingsCollapsed);
  const { conversation } = useChatContext();
  const { setOption } = useSetIndexOptions();

  if (!conversation) {
    return null;
  }

  const {
    promptPrefix = '',
    system = '',
  } = conversation;

  const systemText = promptPrefix || system || '';

  const setSystem = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setOption('promptPrefix')(e.target.value);
    setOption('system')(e.target.value);
  };

  // Collapsed: show a thin strip with expand button
  if (collapsed) {
    return (
      <div className="flex h-full w-10 flex-col items-center border-l border-border-light bg-surface-primary pt-3">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label="Expand settings"
          title="Expand settings"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-[320px] flex-shrink-0 flex-col border-l border-border-light bg-surface-primary">
      {/* Header — sticky */}
      <div className="flex items-center gap-2 border-b border-border-light px-3 py-3">
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label="Collapse settings"
          data-testid="collapse-run-settings"
          title="Collapse panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-semibold text-text-primary">Run settings</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* System Instructions */}
        <div className="flex flex-col gap-2 p-4 border-b border-border-light">
          <label className="text-sm font-medium text-text-primary">System instructions</label>
          <textarea
            className="w-full resize-y rounded-xl border border-border-light bg-surface-secondary p-3 text-sm text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px]"
            placeholder="Optional tone and style instructions for the model"
            value={systemText}
            onChange={setSystem}
          />
        </div>

        {/* Dynamic Parameters — from original LibreChat */}
        <Parameters />
      </div>
    </div>
  );
}
