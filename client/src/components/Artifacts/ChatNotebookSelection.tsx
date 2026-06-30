import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareQuote } from 'lucide-react';
import { mainTextareaId } from '~/common';

type PopoverState = {
  visible: boolean;
  x: number;
  y: number;
  text: string;
};

const CLOSED: PopoverState = { visible: false, x: 0, y: 0, text: '' };

/**
 * Insert a quoted citation into the main chat input even though we're outside
 * the form context — use the native value setter so react-hook-form's onChange
 * fires. The cite ends with `→ ` so the caret lands right after the arrow,
 * ready for the user to type their comment.
 */
export function insertQuoteIntoChatInput(quote: string) {
  const el = document.getElementById(mainTextareaId) as HTMLTextAreaElement | null;
  if (!el) {
    return;
  }
  const block = `> "${quote.trim()}"\n→ `;
  const prev = el.value;
  const next = prev.trim().length > 0 ? `${prev.replace(/\s+$/, '')}\n\n${block}` : block;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  if (setter) {
    setter.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  el.focus();
  // Land the caret right after the "→ " so they start writing the comment immediately.
  el.selectionStart = el.selectionEnd = el.value.length;
}

/**
 * Floating "Consultar" button shown when the user selects text inside a chat
 * message (`.message-content`). Clicking drops the selection into the chat
 * input as a markdown quote so the user can ask about it — a quick action,
 * no editing prompt, no round-trip.
 *
 * Scoped to `.message-content` so it never fires inside the artifact panel
 * (which renders under `.artifact-prose`) or inputs.
 */
export default function ChatNotebookSelection() {
  const [popover, setPopover] = useState<PopoverState>(CLOSED);

  useEffect(() => {
    const handle = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.('[data-chat-consultar]')) {
        return;
      }
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        const text = selection?.toString() ?? '';
        if (!text.trim() || !selection || selection.rangeCount === 0) {
          setPopover(CLOSED);
          return;
        }
        const range = selection.getRangeAt(0);
        const node = range.commonAncestorContainer;
        const host = node.nodeType === 1 ? (node as Element) : node.parentElement;
        if (!host?.closest?.('.message-content')) {
          setPopover(CLOSED);
          return;
        }
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          return;
        }
        setPopover({
          visible: true,
          x: rect.left + rect.width / 2,
          y: rect.bottom,
          text: text.trim(),
        });
      });
    };
    document.addEventListener('mouseup', handle);
    document.addEventListener('touchend', handle);
    return () => {
      document.removeEventListener('mouseup', handle);
      document.removeEventListener('touchend', handle);
    };
  }, []);

  useEffect(() => {
    if (!popover.visible) {
      return;
    }
    const onScroll = () => setPopover(CLOSED);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopover(CLOSED);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [popover.visible]);

  const consultar = useCallback(() => {
    insertQuoteIntoChatInput(popover.text);
    window.getSelection()?.removeAllRanges();
    setPopover(CLOSED);
  }, [popover.text]);

  if (!popover.visible) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      data-chat-consultar=""
      onMouseDown={(e) => e.preventDefault()}
      onClick={consultar}
      style={{
        position: 'fixed',
        top: popover.y + 6,
        left: popover.x,
        transform: 'translateX(-50%)',
      }}
      className="z-[10000] flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-surface-primary px-2.5 py-1.5 text-xs font-semibold text-text-primary shadow-xl transition-colors hover:bg-surface-hover"
      title="Citar esta parte en el cuadro de mensaje para consultarla"
    >
      <MessageSquareQuote className="size-3.5 text-blue-500" aria-hidden="true" />
      Consultar
    </button>,
    document.body,
  );
}
