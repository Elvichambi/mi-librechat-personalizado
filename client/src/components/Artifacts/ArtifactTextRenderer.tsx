import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import supersub from 'remark-supersub';
import rehypeKatex from 'rehype-katex';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { MessageSquarePlus } from 'lucide-react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import type { Pluggable } from 'unified';
import { code, a, img } from '~/components/Chat/Messages/Content/MarkdownComponents';
import { CodeBlockProvider } from '~/Providers';
import { pendingAnnotationsState, focusedAnnotationState } from '~/store/artifacts';
import { langSubset, preprocessLaTeX, cn } from '~/utils';
import SelectionPopover from './SelectionPopover';

type BlockTag = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'li' | 'blockquote';

type PopoverState = {
  visible: boolean;
  expanded: boolean;
  x: number;
  y: number;
  selectedText: string;
  paragraphText?: string;
  type: 'selection' | 'paragraph';
};

const CLOSED: PopoverState = {
  visible: false,
  expanded: false,
  x: 0,
  y: 0,
  selectedText: '',
  type: 'selection',
};

let annotationCounter = 0;

const WIDE_MARKER_REGEX = /^([ \t]*)([*+-]|\d+\.)( {2,})(.*)$/;
const FENCE_LINE_REGEX = /^\s*```/;
/** Whitespace chars that look like a space but are NOT counted as block
 *  indentation by CommonMark: non-breaking space (U+00A0), the unicode space
 *  family (U+2000-U+200A), zero-width space (U+200B), narrow/medium NBSP
 *  (U+202F/U+205F), ideographic space (U+3000). A model or copy-paste can
 *  emit these as indentation; they look identical to a normal space in a text
 *  editor ("looks perfect in Notepad") but leave a nested list FLAT because
 *  the parser ignores them as indentation. */
const LEADING_WS_REGEX = /^[\t\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000 ]+/;
const FAUX_SPACE_REGEX = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;

/**
 * Normalize list/indentation whitespace so CommonMark nests sub-items the way
 * the writer intended. Per line (skipping fenced code):
 *
 *  1. Leading-indent repair: convert non-breaking / unicode spaces AND tabs at
 *     the START of the line into regular spaces (tab -> 2 spaces). These look
 *     like normal spaces in an editor but are NOT counted as block indentation
 *     by the parser, so a nested list built with them renders FLAT. This is the
 *     usual reason a list "looks indented in Notepad but flat when rendered."
 *  2. Wide-marker collapse: `*   Item` (marker + 2+ spaces) -> `* Item`, so a
 *     4-space-wide marker does not push the content column out and break the
 *     nesting boundary for sub-items.
 *
 * Indentation depth is otherwise preserved, so real 2-space and 4-space
 * nesting both keep working.
 */
function normalizeListSpacing(markdown: string): string {
  const lines = markdown.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE_LINE_REGEX.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const leadingMatch = lines[i].match(LEADING_WS_REGEX);
    if (leadingMatch) {
      const fixedIndent = leadingMatch[0]
        .replace(FAUX_SPACE_REGEX, ' ')
        .replace(/\t/g, '  ');
      lines[i] = fixedIndent + lines[i].slice(leadingMatch[0].length);
    }
    const m = lines[i].match(WIDE_MARKER_REGEX);
    if (m) {
      const [, indent, marker, , content] = m;
      lines[i] = `${indent}${marker} ${content}`;
    }
  }
  return lines.join('\n');
}

function ArtifactTextRenderer({ content }: { content: string }) {
  const setPendingAnnotations = useSetRecoilState(pendingAnnotationsState);
  const focused = useRecoilValue(focusedAnnotationState);
  const [popover, setPopover] = useState<PopoverState>(CLOSED);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentContent = useMemo(
    () => preprocessLaTeX(normalizeListSpacing(content ?? '')),
    [content],
  );

  const rehypePlugins = useMemo(
    () => [
      [rehypeKatex],
      [rehypeHighlight, { detect: true, ignoreMissing: true, subset: langSubset }],
    ],
    [],
  );

  const remarkPlugins: Pluggable[] = useMemo(
    () => [supersub, remarkGfm, [remarkMath, { singleDollarTextMath: false }]],
    [],
  );

  /** Paragraph hover button => the user already clicked, jump straight to the form. */
  const openParagraphPopover = useCallback((text: string, anchor: DOMRect) => {
    setPopover({
      visible: true,
      expanded: true,
      x: anchor.left + anchor.width / 2,
      y: anchor.bottom,
      selectedText: '',
      paragraphText: text,
      type: 'paragraph',
    });
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent | TouchEvent) => {
      // Ignore mouseups that originate INSIDE the popover itself — those are the user
      // clicking the compact button or interacting with the form, not a new selection.
      const target = e.target as Element | null;
      if (target?.closest?.('[data-artifact-popover]')) {
        return;
      }
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        const text = selection?.toString() ?? '';
        if (!text.trim() || !selection || selection.rangeCount === 0) {
          return;
        }
        const range = selection.getRangeAt(0);
        const node = range.commonAncestorContainer;
        const host = node.nodeType === 1 ? (node as Element) : node.parentElement;
        if (!host || !containerRef.current?.contains(host)) {
          return;
        }
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          return;
        }
        /** Selection => show ONLY the compact button. The user expands by clicking it. */
        setPopover({
          visible: true,
          expanded: false,
          x: rect.left + rect.width / 2,
          y: rect.bottom,
          selectedText: text.trim(),
          type: 'selection',
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

  const closePopover = useCallback(() => {
    setPopover(CLOSED);
  }, []);

  /** When the user clicks "Locate" on an annotation row, find the matching block in the
   *  renderer, scroll it into view, and pulse a highlight ring on it. */
  useEffect(() => {
    if (!focused?.text || !containerRef.current) {
      return;
    }
    const root = containerRef.current;
    const needle = focused.text.trim().slice(0, 80).toLowerCase();
    if (!needle) {
      return;
    }
    const blocks = Array.from(
      root.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6, li, blockquote'),
    );
    const target = blocks.find((el) => el.innerText.toLowerCase().includes(needle));
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('artifact-flash');
    const timer = setTimeout(() => {
      target.classList.remove('artifact-flash');
    }, 1800);
    return () => clearTimeout(timer);
  }, [focused]);

  /** Compact mini-button click => expand to the textarea form, keeping the selection. */
  const expandPopover = useCallback(() => {
    setPopover((prev) => ({ ...prev, expanded: true }));
  }, []);

  const addAnnotation = useCallback(
    (comment: string) => {
      annotationCounter += 1;
      setPendingAnnotations((prev) => [
        ...prev,
        {
          id: `annotation-${annotationCounter}`,
          type: popover.type,
          selectedText: popover.selectedText,
          paragraphText: popover.paragraphText,
          comment,
        },
      ]);
      setPopover(CLOSED);
      window.getSelection()?.removeAllRanges();
    },
    [popover, setPendingAnnotations],
  );

  const components = useMemo(() => {
    /**
     * Block with a hover-only comment button. The button lives INSIDE the block's
     * padding-right so the cursor doesn't leave the bounding box on the way over to it.
     * `onMouseEnter` is non-bubbling — so nested blocks each track their own hover.
     */
    const makeBlock = (Tag: BlockTag, sizeClass: string) => {
      const Block = ({ children }: { children?: React.ReactNode }) => {
        const [hovered, setHovered] = useState(false);
        return (
          <Tag
            className={cn('relative pr-9', sizeClass)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {children}
            <button
              type="button"
              contentEditable={false}
              onMouseDown={(e) => e.preventDefault()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const block = e.currentTarget.parentElement;
                if (block) {
                  openParagraphPopover(
                    block.innerText.trim(),
                    e.currentTarget.getBoundingClientRect(),
                  );
                }
              }}
              data-block-btn=""
              tabIndex={hovered ? 0 : -1}
              aria-hidden={!hovered}
              className={cn(
                'artifact-block-btn absolute right-1 top-1 rounded-md bg-surface-primary-alt p-1 text-text-secondary shadow-sm transition-opacity hover:bg-surface-hover hover:text-text-primary',
                hovered ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              title="Comentar esta parte"
              aria-label="Comentar esta parte"
            >
              <MessageSquarePlus className="size-4" />
            </button>
          </Tag>
        );
      };
      Block.displayName = `ArtifactBlock_${Tag}`;
      return Block;
    };

    /** Hover comment button lives on prose blocks (paragraphs, headings, list items).
     *  For nested-list cases, CSS in `style.css` hides the parent <li>'s button when
     *  it directly contains a <p> or a nested list, so only the innermost leaf
     *  shows a single button instead of stacking them. */
    return {
      code,
      a,
      img,
      p: makeBlock('p', 'text-[15px]'),
      li: makeBlock('li', ''),
      h1: makeBlock('h1', 'mt-[1.6em] text-3xl font-bold'),
      h2: makeBlock('h2', 'mt-[1.4em] text-2xl font-semibold'),
      h3: makeBlock('h3', 'mt-[1.2em] text-xl font-semibold'),
      h4: makeBlock('h4', 'mt-[1em] text-lg font-semibold'),
      h5: makeBlock('h5', 'mt-[0.9em] text-base font-semibold'),
      h6: makeBlock('h6', 'mt-[0.8em] text-sm font-semibold'),
    } as { [nodeType: string]: React.ElementType };
  }, [openParagraphPopover]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto bg-surface-primary-alt">
      <div className="mx-auto max-w-3xl px-6 py-10 md:px-14">
        <div className="prose artifact-prose dark:prose-invert max-w-none break-words text-text-primary">
          <CodeBlockProvider>
            <ReactMarkdown
              /** @ts-ignore */
              remarkPlugins={remarkPlugins}
              /** @ts-ignore */
              rehypePlugins={rehypePlugins}
              components={components}
            >
              {currentContent}
            </ReactMarkdown>
          </CodeBlockProvider>
        </div>
      </div>
      <SelectionPopover
        visible={popover.visible}
        expanded={popover.expanded}
        x={popover.x}
        y={popover.y}
        selectedText={popover.selectedText}
        paragraphText={popover.paragraphText}
        type={popover.type}
        onExpand={expandPopover}
        onClose={closePopover}
        onSubmit={addAnnotation}
      />
    </div>
  );
}

export default memo(ArtifactTextRenderer);
