import { memo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ReactNode, ComponentType } from 'react';
import { cn } from '~/utils';

function Folder({
  icon: Icon,
  label,
  count,
  defaultOpen = false,
  highlight = false,
  onOpenChange,
  headerRight,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  defaultOpen?: boolean;
  highlight?: boolean;
  onOpenChange?: (open: boolean) => void;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);

  return (
    <div className="flex flex-col">
      <div className="group/folder flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-surface-hover">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-sm text-text-secondary"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          )}
          <Icon
            className={cn('h-4 w-4 flex-shrink-0', highlight && 'text-blue-500')}
            aria-hidden="true"
          />
          <span className="truncate">{label}</span>
          {typeof count === 'number' && count > 0 && (
            <span className="ml-1 text-xs text-text-secondary opacity-70">{count}</span>
          )}
        </button>
        {headerRight}
      </div>
      {open && <div className="flex flex-col pl-3">{children}</div>}
    </div>
  );
}

export default memo(Folder);
