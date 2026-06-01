import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { TMessage } from 'librechat-data-provider';
import { cn } from '~/utils';

interface TimelineDot {
  messageId: string;
  text: string;
  isCreatedByUser: boolean;
  offsetTop: number;
  relativeTopPercent: number; // calculated relative to scrollHeight
}

interface MessageScrollTimelineProps {
  scrollableRef: React.RefObject<HTMLDivElement>;
  messages?: TMessage[] | null;
}

export default function MessageScrollTimeline({
  scrollableRef,
  messages,
}: MessageScrollTimelineProps) {
  const [dots, setDots] = useState<TimelineDot[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [hoveredDotId, setHoveredDotId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Safely extract text snippet from a message
  const getMessageSnippet = (msg: TMessage): string => {
    let rawText = msg.text ?? '';
    if (Array.isArray(msg.content)) {
      rawText = msg.content
        .map((part) => {
          if (part == null) return '';
          if (typeof part === 'string') return part;
          if ('text' in part) return part.text || '';
          if ('think' in part) {
            const thinkText = typeof part.think === 'string' ? part.think : part.think?.text || '';
            return thinkText;
          }
          return '';
        })
        .join('');
    }
    
    // Clean up text
    const cleanText = rawText
      .replace(/<[^>]*>/g, '') // remove HTML tags
      .replace(/[\s\n\r]+/g, ' ') // collapse whitespaces
      .trim();

    if (cleanText.length <= 60) return cleanText;
    return cleanText.substring(0, 57) + '...';
  };

  // Recalculate dots coordinate positions based on DOM elements
  const recalculatePositions = useCallback(() => {
    const scrollContainer = scrollableRef.current;
    if (!scrollContainer || !messages || messages.length === 0) {
      setDots([]);
      setShowTimeline(false);
      return;
    }

    const { scrollHeight, clientHeight } = scrollContainer;
    if (scrollHeight <= clientHeight) {
      // Content is not tall enough to justify showing a timeline scroll indicator
      setShowTimeline(false);
      return;
    }

    // Flatten the nested messages tree recursively into a flat array
    const flatMessages: TMessage[] = [];
    const flatten = (nodes: TMessage[]) => {
      for (const node of nodes) {
        flatMessages.push(node);
        if (node.children && node.children.length > 0) {
          flatten(node.children);
        }
      }
    };
    flatten(messages);

    const newDots: TimelineDot[] = [];
    const messageElements = scrollContainer.querySelectorAll('.message-render');

    messageElements.forEach((el) => {
      const messageId = el.getAttribute('id');
      if (!messageId) return;

      const foundMsg = flatMessages.find((m) => m.messageId === messageId);
      if (!foundMsg) return;

      // offsetTop of the element inside scroll container
      const htmlEl = el as HTMLElement;
      const offsetTop = htmlEl.offsetTop;
      
      // relative top percentage (e.g. 5% to 95% of scrollHeight)
      // We clamp or pad a tiny bit so dots do not sit directly at the absolute top/bottom edge
      const relativeTopPercent = Math.max(
        3,
        Math.min(97, (offsetTop / scrollHeight) * 100)
      );

      newDots.push({
        messageId,
        text: getMessageSnippet(foundMsg),
        isCreatedByUser: !!foundMsg.isCreatedByUser,
        offsetTop,
        relativeTopPercent,
      });
    });

    setDots((prevDots) => {
      const isSame =
        prevDots.length === newDots.length &&
        prevDots.every(
          (d, i) =>
            d.messageId === newDots[i].messageId &&
            d.relativeTopPercent === newDots[i].relativeTopPercent &&
            d.text === newDots[i].text
        );
      return isSame ? prevDots : newDots;
    });

    setShowTimeline((prev) => {
      const nextVal = newDots.length > 1;
      return prev === nextVal ? prev : nextVal;
    });
  }, [scrollableRef, messages]);

  // Update active dot based on current scroll position
  const updateActiveDot = useCallback(() => {
    const scrollContainer = scrollableRef.current;
    if (!scrollContainer || dots.length === 0) return;

    const { scrollTop, clientHeight } = scrollContainer;
    // We consider a message visible if scroll is near its offsetTop
    // We offset by clientHeight / 3 for visual comfort
    const scrollTriggerY = scrollTop + clientHeight / 3;

    let activeId = dots[0].messageId;
    for (let i = 0; i < dots.length; i++) {
      if (scrollTriggerY >= dots[i].offsetTop) {
        activeId = dots[i].messageId;
      } else {
        break;
      }
    }

    setActiveMessageId((prev) => (prev === activeId ? prev : activeId));
  }, [scrollableRef, dots]);

  // Handle click on dot -> smooth scroll container to message element
  const handleDotClick = (dot: TimelineDot) => {
    const scrollContainer = scrollableRef.current;
    if (!scrollContainer) return;

    const messageEl = scrollContainer.querySelector(`[id="${dot.messageId}"]`);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Setup event listeners for scroll, resize, and mutations
  useEffect(() => {
    const scrollContainer = scrollableRef.current;
    if (!scrollContainer) return;

    recalculatePositions();

    // Call on small delays to ensure React paint has completed
    const t1 = setTimeout(recalculatePositions, 100);
    const t2 = setTimeout(recalculatePositions, 400);

    // Set up resize observer to adjust positions if container sizes change
    const resizeObserver = new ResizeObserver(() => {
      recalculatePositions();
    });
    resizeObserver.observe(scrollContainer);

    // Set up mutation observer to listen to DOM additions/deletions of message nodes
    const mutationObserver = new MutationObserver(() => {
      recalculatePositions();
      updateActiveDot();
    });
    mutationObserver.observe(scrollContainer, {
      childList: true,
      subtree: true,
    });

    // Watch for scroll events to update illuminated indicators
    const handleScroll = () => {
      updateActiveDot();
    };
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    // Initial scroll sync
    updateActiveDot();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollableRef, messages]);

  // Sync active dot whenever dots data is recalculated
  useEffect(() => {
    updateActiveDot();
  }, [dots, updateActiveDot]);

  // Keep the active dot visible inside the scrollable timeline container if it overflows
  useEffect(() => {
    if (activeMessageId && containerRef.current) {
      const activeEl = containerRef.current.querySelector('.active-dot-btn');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeMessageId]);

  if (!showTimeline || dots.length === 0) {
    return null;
  }

  const hoveredDot = dots.find((d) => d.messageId === hoveredDotId);

  return (
    <div
      ref={containerRef}
      className="absolute right-6 top-8 bottom-8 z-[25] flex flex-col items-center justify-between select-none pointer-events-none"
      style={{ width: '12px' }}
    >
      {/* Subtle Vertical Track Line (centered behind the flex dots) */}
      <div className="absolute top-0 bottom-0 w-[1px] bg-black/10 dark:bg-white/[0.08]" />

      {/* Render Dots directly with justify-between spacing */}
      {dots.map((dot) => {
        const isActive = activeMessageId === dot.messageId;
        const isHovered = hoveredDotId === dot.messageId;

        return (
          <button
            key={dot.messageId}
            type="button"
            onClick={() => handleDotClick(dot)}
            onMouseEnter={(e) => {
              setHoveredDotId(dot.messageId);
              const rect = e.currentTarget.getBoundingClientRect();
              const containerRect = containerRef.current?.getBoundingClientRect();
              if (rect && containerRect) {
                setHoverPos({
                  top: rect.top - containerRect.top + rect.height / 2,
                  left: -180, // Tooltip on the left
                });
              }
            }}
            onMouseLeave={() => {
              setHoveredDotId(null);
              setHoverPos(null);
            }}
            className={cn(
              'relative flex items-center justify-center p-1.5 cursor-pointer pointer-events-auto rounded-full focus:outline-none transition-all group duration-200',
              isActive && 'active-dot-btn'
            )}
          >
            {/* Dot asset with dynamic sizing and shadows */}
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all duration-300 transform-gpu',
                isActive
                  ? 'bg-black dark:bg-white scale-125 shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                  : isHovered
                  ? 'bg-[#3b82f6] scale-150 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                  : 'bg-black/35 dark:bg-white/20 hover:bg-black/60 dark:hover:bg-white/40'
              )}
            />
          </button>
        );
      })}

      {/* Floating Tooltip Snippet (Google AI Studio style) */}
      {hoveredDotId && hoveredDot && hoverPos && (
        <div
          className="absolute z-50 pointer-events-none select-none -translate-y-1/2 animate-fade-in flex items-center justify-end"
          style={{
            top: `${hoverPos.top}px`,
            left: `${hoverPos.left}px`,
            width: '170px',
          }}
        >
          <div className="bg-[#1e1e20] text-white border border-[#3c4043]/50 text-[11px] font-normal px-2.5 py-1.5 rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.5)] truncate max-w-full leading-normal">
            <span className="font-semibold text-[#8ab4f8] mr-1.5">
              {hoveredDot.isCreatedByUser ? 'User:' : 'Model:'}
            </span>
            {hoveredDot.text || '...'}
          </div>
          {/* Arrow pointing right towards the dot */}
          <div className="w-1.5 h-1.5 rotate-45 border-t border-r border-[#3c4043]/50 bg-[#1e1e20] -mr-1 z-10" />
        </div>
      )}
    </div>
  );
}
