import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquarePlus, Send, X } from 'lucide-react';

interface SelectionPopoverProps {
  visible: boolean;
  /** When false the popover shows ONLY a discreet comment button (does not interrupt copy/paste).
   *  When true the popover shows the comment textarea. The user expands by clicking the button. */
  expanded: boolean;
  /** Viewport coordinates (popover uses position: fixed, portaled to body). */
  x: number;
  y: number;
  selectedText: string;
  paragraphText?: string;
  type: 'selection' | 'paragraph';
  onExpand: () => void;
  onClose: () => void;
  onSubmit: (comment: string) => void;
}

const CARD_WIDTH = 288;

export default function SelectionPopover({
  visible,
  expanded,
  x,
  y,
  selectedText,
  paragraphText,
  type,
  onExpand,
  onClose,
  onSubmit,
}: SelectionPopoverProps) {
  const [comment, setComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (expanded) {
      setComment('');
      const timer = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [visible, expanded]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  const submit = () => {
    if (comment.trim()) {
      onSubmit(comment.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // ---------- Mini button (compact mode) — appears on selection, doesn't grab focus ----------
  if (!expanded) {
    const left = Math.min(Math.max(x - 14, 12), window.innerWidth - 40);
    const top = Math.min(y + 6, window.innerHeight - 40);
    return createPortal(
      <button
        type="button"
        ref={rootRef as unknown as React.RefObject<HTMLButtonElement>}
        data-artifact-popover="true"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onExpand}
        className="fixed z-[200] flex size-7 items-center justify-center rounded-full border border-border-medium bg-surface-primary text-text-secondary shadow-lg transition-colors hover:bg-surface-hover hover:text-text-primary"
        style={{ top, left }}
        title="Comentar esta parte"
        aria-label="Comentar esta parte"
      >
        <MessageSquarePlus className="size-3.5" />
      </button>,
      document.body,
    );
  }

  // ---------- Full form (expanded) ----------
  const preview = (type === 'selection' ? selectedText : paragraphText) ?? '';
  const truncated = preview.length > 90 ? `${preview.slice(0, 90)}…` : preview;
  const leftFull = Math.min(Math.max(x - CARD_WIDTH / 2, 12), window.innerWidth - CARD_WIDTH - 12);
  const topFull = Math.min(y + 8, window.innerHeight - 200);

  return createPortal(
    <div
      ref={rootRef as unknown as React.RefObject<HTMLDivElement>}
      data-artifact-popover="true"
      className="fixed z-[200] flex w-72 flex-col rounded-xl border border-border-medium bg-surface-primary p-3 shadow-2xl"
      style={{ top: topFull, left: leftFull }}
    >
      <div className="mb-2 flex items-center justify-between border-b border-border-light pb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {type === 'selection' ? 'Corregir selección' : 'Comentar párrafo'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          aria-label="Cerrar"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {truncated && (
        <div className="mb-2 max-h-12 overflow-y-auto rounded border-l-2 border-border-medium bg-surface-secondary p-1.5 text-[11px] italic text-text-secondary">
          "{truncated}"
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe qué cambiar en esta parte…"
          rows={2}
          className="max-h-32 min-h-[52px] w-full resize-none rounded-lg border border-border-light bg-surface-secondary p-2 pr-9 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-border-medium"
        />
        <button
          type="button"
          disabled={!comment.trim()}
          onClick={submit}
          className="absolute bottom-2 right-2 flex size-6 items-center justify-center rounded bg-amber-600 text-white transition-colors hover:bg-amber-700 disabled:bg-surface-tertiary disabled:text-text-secondary"
          title="Añadir (Enter)"
          aria-label="Añadir anotación"
        >
          <Send className="size-3" />
        </button>
      </div>
      <span className="mt-1 text-[9px] text-text-secondary">
        Enter para añadir · Shift+Enter nueva línea
      </span>
    </div>,
    document.body,
  );
}
