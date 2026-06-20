import { useState, useMemo, useCallback } from 'react';
import type { PromptOption } from '~/common';

export type FolderItem = {
  type: 'folder';
  name: string;
  expanded: boolean;
  count: number;
};

export type PromptItem = {
  type: 'prompt';
  option: PromptOption;
};

export type FlatItem = FolderItem | PromptItem;

const UNCATEGORIZED = '';
const VISIBLE_UNCATEGORIZED = 5;

export default function useGroupedPrompts(
  prompts: PromptOption[],
  searchValue: string,
) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggleFolder = useCallback((name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const items = useMemo((): FlatItem[] => {
    if (!prompts?.length) {
      return [];
    }

    if (searchValue.length > 0) {
      return prompts.map((option) => ({ type: 'prompt', option }));
    }

    const grouped = new Map<string, PromptOption[]>();
    for (const p of prompts) {
      const cat = p.category || UNCATEGORIZED;
      const list = grouped.get(cat);
      if (list) {
        list.push(p);
      } else {
        grouped.set(cat, [p]);
      }
    }

    const result: FlatItem[] = [];

    const uncategorized = grouped.get(UNCATEGORIZED);
    if (uncategorized) {
      const isCollapsed = collapsed.has(UNCATEGORIZED);
      result.push({
        type: 'folder',
        name: 'Recientes',
        expanded: !isCollapsed,
        count: uncategorized.length,
      });
      if (!isCollapsed) {
        const visible = uncategorized.slice(0, VISIBLE_UNCATEGORIZED);
        for (const option of visible) {
          result.push({ type: 'prompt', option });
        }
        if (uncategorized.length > VISIBLE_UNCATEGORIZED && !collapsed.has('__more_uncategorized')) {
          for (let i = VISIBLE_UNCATEGORIZED; i < uncategorized.length; i++) {
            result.push({ type: 'prompt', option: uncategorized[i] });
          }
        }
      }
      grouped.delete(UNCATEGORIZED);
    }

    const sortedCategories = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));
    for (const cat of sortedCategories) {
      const list = grouped.get(cat)!;
      const isCollapsed = collapsed.has(cat);
      result.push({
        type: 'folder',
        name: cat,
        expanded: !isCollapsed,
        count: list.length,
      });
      if (!isCollapsed) {
        for (const option of list) {
          result.push({ type: 'prompt', option });
        }
      }
    }

    return result;
  }, [prompts, searchValue, collapsed]);

  return { items, toggleFolder };
}
