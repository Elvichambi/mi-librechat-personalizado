import React, { useState, useCallback } from 'react';
import { FolderOpen, FolderClosed, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '~/utils';

interface PromptFolderProps {
  name: string;
  count: number;
  expanded: boolean;
  style?: React.CSSProperties;
  onToggle: () => void;
  onDrop?: (promptId: string) => void;
}

export default function PromptFolder({
  name,
  count,
  expanded,
  style,
  onToggle,
  onDrop,
}: PromptFolderProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const promptId = e.dataTransfer.getData('promptGroupId');
      if (promptId && onDrop) {
        onDrop(promptId);
      }
    },
    [onDrop],
  );

  return (
    <div
      style={style}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors',
        dragOver
          ? 'bg-surface-active-alt ring-1 ring-blue-400'
          : 'text-text-secondary hover:bg-surface-hover',
      )}
      onClick={onToggle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="flex min-h-[44px] items-center gap-2">
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        )}
        {expanded ? (
          <FolderOpen className="h-4 w-4 flex-shrink-0 text-text-tertiary" aria-hidden="true" />
        ) : (
          <FolderClosed className="h-4 w-4 flex-shrink-0 text-text-tertiary" aria-hidden="true" />
        )}
        <span className="truncate">{name}</span>
        <span className="text-xs text-text-tertiary">({count})</span>
      </div>
    </div>
  );
}
