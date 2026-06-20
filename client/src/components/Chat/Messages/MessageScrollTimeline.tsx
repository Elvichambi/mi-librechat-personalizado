import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { TMessage } from 'librechat-data-provider';
import { cn } from '~/utils';

interface TimelineDot {
  messageId: string;
  text: string;
  isCreatedByUser: boolean;
  offsetTop: number;
  relativeTopPercent: number; // calculated relative to scrollHeight
  aiResponseText?: string; // snippet from the paired AI response
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
  const [shouldOverflow, setShouldOverflow] = useState(false);
  const MIN_GAP = 16; // px
  const DOT_SIZE = 28; // px (el tamaño real de la caja del botón con padding de 1.5 es ~28px)

  // Track dots count stably to avoid recreating observers inside the main useEffect
  const dotsLengthRef = useRef(dots.length);
  useEffect(() => {
    dotsLengthRef.current = dots.length;
  }, [dots.length]);

  // Recalculate overflow status when dots change
  useEffect(() => {
    if (containerRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      const totalNeeded = dots.length * DOT_SIZE + Math.max(0, dots.length - 1) * MIN_GAP;
      setShouldOverflow(totalNeeded > containerHeight);
    }
  }, [dots.length, DOT_SIZE, MIN_GAP]);

  // Safely extract text snippet from a message
  const getMessageSnippet = (msg: TMessage): string => {
    let rawText = msg.text ?? '';
    if (Array.isArray(msg.content)) {
      rawText = msg.content
        .map((part) => {
          if (part == null) return '';
          if (typeof part === 'string') return part;
          if ('text' in part) {
            return typeof part.text === 'string' ? part.text : part.text?.value ?? '';
          }
          if ('think' in part) {
            return typeof part.think === 'string' ? part.think : part.think?.value ?? '';
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
      // Only create dots for user messages (paired turns)
      if (!foundMsg || !foundMsg.isCreatedByUser) return;

      // Find the paired AI response (first child from model)
      const aiResponse = flatMessages.find(
        (m) => m.parentMessageId === foundMsg.messageId && !m.isCreatedByUser
      );

      // Posición del mensaje relativa al contenido del contenedor de scroll
      const htmlEl = el as HTMLElement;
      const containerRect = scrollContainer.getBoundingClientRect();
      const elRect = htmlEl.getBoundingClientRect();
      const offsetTop = elRect.top - containerRect.top + scrollContainer.scrollTop;
      
      // relative top percentage (e.g. 5% to 95% of scrollHeight)
      const relativeTopPercent = Math.max(
        3,
        Math.min(97, (offsetTop / scrollHeight) * 100)
      );

      newDots.push({
        messageId,
        text: getMessageSnippet(foundMsg),
        isCreatedByUser: true,
        offsetTop,
        relativeTopPercent,
        aiResponseText: aiResponse ? getMessageSnippet(aiResponse) : undefined,
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

    const { scrollTop, clientHeight, scrollHeight } = scrollContainer;
    const scrollTriggerY = scrollTop + clientHeight / 3;

    // Si scrolled al fondo total, iluminar el último punto directamente
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 30;

    let activeId = dots[0].messageId;
    if (isAtBottom) {
      activeId = dots[dots.length - 1].messageId;
    } else {
      let minDistance = Infinity;
      for (let i = 0; i < dots.length; i++) {
        // Encontrar el mensaje con menor distancia absoluta a la línea de lectura focal
        const distance = Math.abs(dots[i].offsetTop - scrollTriggerY);
        if (distance < minDistance) {
          minDistance = distance;
          activeId = dots[i].messageId;
        }
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

    let rafId: number | null = null;

    // Wrap recalculation in requestAnimationFrame to prevent layout thrashing
    const scheduleRecalculate = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        recalculatePositions();
        updateActiveDot();
      });
    };

    // Recalculate immediately
    scheduleRecalculate();

    // Create ResizeObserver for viewport, timeline container and each individual message element
    const resizeObserver = new ResizeObserver(() => {
      scheduleRecalculate();
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const length = dotsLengthRef.current;
        const totalNeeded = length * DOT_SIZE + Math.max(0, length - 1) * MIN_GAP;
        setShouldOverflow(totalNeeded > containerHeight);
      }
    });

    // Observe scroll container (viewport changes)
    resizeObserver.observe(scrollContainer);

    // Observe timeline container (to detect height changes of the timeline itself)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Track which elements are currently observed to avoid redundant observers
    const observedElements = new Set<Element>();

    const observeMessages = () => {
      const messageElements = scrollContainer.querySelectorAll('.message-render');
      messageElements.forEach((el) => {
        if (!observedElements.has(el)) {
          resizeObserver.observe(el);
          observedElements.add(el);
        }
      });
    };

    // Initial observation of existing message elements
    observeMessages();

    // Create MutationObserver to observe when message elements are added or removed
    const mutationObserver = new MutationObserver(() => {
      observeMessages();
      scheduleRecalculate();
    });

    mutationObserver.observe(scrollContainer, {
      childList: true,
      subtree: true,
    });

    // Handle scroll events with requestAnimationFrame for smooth active dot highlighting
    let scrollRafId: number | null = null;
    const handleScroll = () => {
      if (scrollRafId) {
        cancelAnimationFrame(scrollRafId);
      }
      scrollRafId = requestAnimationFrame(() => {
        updateActiveDot();
      });
    };
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    // 50ms safety net timeout to recalculate after initial mount / chat load has painted
    const safetyTimeout = setTimeout(scheduleRecalculate, 50);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (scrollRafId) {
        cancelAnimationFrame(scrollRafId);
      }
      clearTimeout(safetyTimeout);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [scrollableRef, messages, recalculatePositions, updateActiveDot, DOT_SIZE, MIN_GAP]);

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
      className="absolute right-8 top-8 bottom-8 z-[25] select-none pointer-events-none"
      style={{ width: '12px' }}
    >
      <style>{`
        .no-scrollbar-timeline::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .no-scrollbar-timeline {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* Subtle Vertical Track Line (centered behind the scrollable area) */}
      <div className="absolute top-0 bottom-0 w-[1px] bg-black/10 dark:bg-white/[0.08] left-1/2 -translate-x-1/2" />

      {/* Scrollable Track Container */}
      <div
        ref={containerRef}
        className={cn(
          "w-full h-full flex flex-col items-center pt-3 pb-3 overflow-y-auto overflow-x-hidden no-scrollbar-timeline pointer-events-auto",
          shouldOverflow ? "gap-4 justify-start" : "justify-between"
        )}
      >
        {/* Render Dots directly using Flexbox */}
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
                  const containerHeight = containerRect.height;
                  const calculatedTop = rect.top - containerRect.top + rect.height / 2;
                  
                  // Clamp top to keep the tooltip fully inside [50px, containerHeight - 50px] bounds
                  // This prevents the tooltip from overflowing the bottom/top of the viewport
                  // and triggering a browser scrollbar/layout shift flicker loop.
                  const clampedTop = Math.max(50, Math.min(containerHeight - 50, calculatedTop));
                  setHoverPos({
                    top: clampedTop,
                    left: -186, // Tooltip on the left
                  });
                }
              }}
              onMouseLeave={() => {
                setHoveredDotId(null);
                setHoverPos(null);
              }}
              className={cn(
                'relative flex items-center justify-center p-1.5 cursor-pointer pointer-events-auto rounded-full focus:outline-none transition-all group duration-200 shrink-0',
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
      </div>

      {/* Floating Tooltip Snippet (Google AI Studio style) - Sibling to avoid overflow clipping */}
      {hoveredDotId && hoveredDot && hoverPos && (
        <div
          className="absolute z-50 pointer-events-none select-none -translate-y-1/2 animate-fade-in flex items-center justify-end"
          style={{
            top: `${hoverPos.top}px`,
            left: `${hoverPos.left}px`,
            width: '180px',
          }}
        >
          <div
            className="backdrop-blur-md bg-white/95 dark:bg-[#1a1a1c]/95 text-text-primary dark:text-white border border-black/10 dark:border-white/[0.08] text-[11px] font-normal px-2.5 py-1.5 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)] max-w-full leading-normal"
            style={{ whiteSpace: 'normal', maxWidth: '210px' }}
          >
            <div className="truncate">
              <span className="font-semibold text-[#1a73e8] dark:text-[#8ab4f8] mr-1">User:</span>
              {hoveredDot.text || '(file/image)'}
            </div>
            {hoveredDot.aiResponseText && (
              <div className="truncate mt-0.5 opacity-80 dark:opacity-75">
                <span className="font-semibold text-[#137333] dark:text-[#81c995] mr-1">Model:</span>
                {hoveredDot.aiResponseText}
              </div>
            )}
          </div>
          {/* Arrow pointing right towards the dot */}
          <div className="w-1.5 h-1.5 rotate-45 border-t border-r border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1a1a1c] -mr-1 z-10" />
        </div>
      )}
    </div>
  );
}
