import { memo, useCallback } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { cn } from '~/utils';

type SlotId = 'default' | 'customA' | 'customB';

const SLOTS: { id: SlotId; label: string }[] = [
  { id: 'default', label: 'Por defecto' },
  { id: 'customA', label: 'A' },
  { id: 'customB', label: 'B' },
];

function PresetSlots({
  activeSlot,
  hasCustomA,
  hasCustomB,
  onSwitch,
  onReset,
}: {
  activeSlot: SlotId;
  hasCustomA: boolean;
  hasCustomB: boolean;
  onSwitch: (slot: SlotId) => void;
  onReset: (slot: SlotId) => void;
}) {
  const hasSaved = useCallback(
    (slot: SlotId): boolean => {
      if (slot === 'customA') return hasCustomA;
      if (slot === 'customB') return hasCustomB;
      return false;
    },
    [hasCustomA, hasCustomB],
  );

  return (
    <div className="flex items-center gap-1">
      {SLOTS.map(({ id, label }) => {
        const isActive = activeSlot === id;
        const isCustom = id !== 'default';
        const saved = hasSaved(id);

        return (
          <div key={id} className="group/slot relative flex items-center">
            <button
              type="button"
              onClick={() => onSwitch(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-surface-active-alt text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )}
            >
              {id === 'default' && <RotateCcw className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
              {isCustom && saved && (
                <span
                  className={cn(
                    'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                    isActive ? 'bg-blue-500' : 'bg-text-secondary opacity-50',
                  )}
                  aria-hidden="true"
                />
              )}
              {label}
            </button>
            {isCustom && saved && !isActive && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset(id);
                }}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-tertiary text-text-secondary opacity-0 transition-opacity hover:text-red-500 group-hover/slot:opacity-100"
                aria-label={`Borrar ${label}`}
              >
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(PresetSlots);
