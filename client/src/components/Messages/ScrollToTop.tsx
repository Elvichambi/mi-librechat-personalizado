import { forwardRef } from 'react';

type Props = {
  scrollHandler: React.MouseEventHandler<HTMLButtonElement>;
};

const ScrollToTop = forwardRef<HTMLButtonElement, Props>(({ scrollHandler }, ref) => {
  return (
    <button
      ref={ref}
      onClick={scrollHandler}
      className="premium-scroll-button absolute bottom-14 right-6 cursor-pointer border border-border-light bg-surface-secondary"
      aria-label="Ir al inicio"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
        <path
          d="M7 11L12 6L17 11M12 18L12 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
});

ScrollToTop.displayName = 'ScrollToTop';

export default ScrollToTop;
