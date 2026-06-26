import { useEffect, memo } from 'react';
import { Separator, usePanelRef } from 'react-resizable-panels';
import { ResizablePanel } from '@librechat/client';
import { GripVertical } from 'lucide-react';

interface ArtifactsPanelProps {
  artifacts: React.ReactNode | null;
  minSizeMain: string;
  shouldRender: boolean;
  onRenderChange: (shouldRender: boolean) => void;
}

/**
 * Slim divider that lives between the chat and the artifact pane. The base library's
 * ResizableHandleAlt bakes in a `bg-border` (dark bar) that can't be overridden via
 * className, so we use the lower-level PanelResizeHandle directly and supply our own
 * styling — transparent by default, sublte on hover, still draggable.
 */
const SlimResizeHandle = () => (
  <Separator className="group relative flex w-px items-center justify-center bg-transparent transition-colors hover:w-[3px] hover:bg-border-medium">
    <div className="invisible absolute z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-border-medium bg-surface-primary-alt text-text-secondary group-hover:visible group-active:visible group-data-[separator=active]:visible">
      <GripVertical className="h-2.5 w-2.5" />
    </div>
  </Separator>
);

const ArtifactsPanel = memo(function ArtifactsPanel({
  artifacts,
  minSizeMain,
  shouldRender,
  onRenderChange,
}: ArtifactsPanelProps) {
  const artifactsPanelRef = usePanelRef();

  useEffect(() => {
    if (artifacts != null) {
      onRenderChange(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          artifactsPanelRef.current?.expand();
        });
      });
    } else if (shouldRender) {
      onRenderChange(false);
    }
  }, [artifacts, shouldRender, onRenderChange, artifactsPanelRef]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {artifacts != null && <SlimResizeHandle />}
      <ResizablePanel
        defaultSize="50"
        maxSize="70"
        collapsedSize="0"
        collapsible={true}
        minSize={minSizeMain}
        panelRef={artifactsPanelRef}
        id="artifacts-panel"
      >
        <div className="h-full min-w-[400px] overflow-hidden">{artifacts}</div>
      </ResizablePanel>
    </>
  );
});

ArtifactsPanel.displayName = 'ArtifactsPanel';

export default ArtifactsPanel;
