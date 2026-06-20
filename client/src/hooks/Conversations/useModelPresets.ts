import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { TConversation } from 'librechat-data-provider';
import type { SettingDefinition } from 'librechat-data-provider';

type SlotId = 'default' | 'customA' | 'customB';

type PerModelPresets = {
  activeSlot: SlotId;
  customA: Record<string, unknown> | null;
  customB: Record<string, unknown> | null;
};

const EMPTY_PRESETS: PerModelPresets = {
  activeSlot: 'default',
  customA: null,
  customB: null,
};

function storageKey(endpoint: string, model: string): string {
  return `storylab_presets:${endpoint}:${model}`;
}

function readPresets(key: string): PerModelPresets {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return EMPTY_PRESETS;
    }
    const parsed = JSON.parse(raw) as PerModelPresets;
    if (parsed && typeof parsed.activeSlot === 'string') {
      return parsed;
    }
    return EMPTY_PRESETS;
  } catch {
    return EMPTY_PRESETS;
  }
}

function writePresets(key: string, presets: PerModelPresets): void {
  localStorage.setItem(key, JSON.stringify(presets));
}

export function extractParamValues(
  conversation: TConversation,
  parameters: SettingDefinition[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const param of parameters) {
    const val = conversation[param.key as keyof TConversation];
    if (val !== undefined) {
      result[param.key] = val;
    }
  }
  return result;
}

export default function useModelPresets(endpoint: string, model: string) {
  const key = useMemo(() => storageKey(endpoint, model), [endpoint, model]);
  const [presets, setPresets] = useState<PerModelPresets>(() => readPresets(key));
  const prevKeyRef = useRef(key);

  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      setPresets(readPresets(key));
    }
  }, [key]);

  const persist = useCallback(
    (next: PerModelPresets) => {
      setPresets(next);
      writePresets(key, next);
    },
    [key],
  );

  const activeSlot = presets.activeSlot;

  const switchSlot = useCallback(
    (slot: SlotId) => {
      persist({ ...presets, activeSlot: slot });
    },
    [presets, persist],
  );

  const saveToSlot = useCallback(
    (slot: SlotId, params: Record<string, unknown>) => {
      if (slot === 'default') {
        return;
      }
      persist({ ...presets, [slot]: params });
    },
    [presets, persist],
  );

  const resetSlot = useCallback(
    (slot: SlotId) => {
      if (slot === 'default') {
        return;
      }
      const next = { ...presets, [slot]: null };
      if (presets.activeSlot === slot) {
        next.activeSlot = 'default';
      }
      persist(next);
    },
    [presets, persist],
  );

  const getSlotParams = useCallback(
    (slot: SlotId): Record<string, unknown> | null => {
      if (slot === 'default') {
        return null;
      }
      return presets[slot];
    },
    [presets],
  );

  const hasCustomA = presets.customA !== null;
  const hasCustomB = presets.customB !== null;

  return {
    activeSlot,
    hasCustomA,
    hasCustomB,
    switchSlot,
    saveToSlot,
    resetSlot,
    getSlotParams,
  };
}
