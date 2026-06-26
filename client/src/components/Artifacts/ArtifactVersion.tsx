import { useState } from 'react';
import { MenuButton } from '@ariakit/react';
import { ChevronDown, Check } from 'lucide-react';
import { DropdownPopup, Button, useMediaQuery } from '@librechat/client';

interface ArtifactVersionProps {
  currentIndex: number;
  totalVersions: number;
  onVersionChange: (index: number) => void;
}

/**
 * Claude-style version picker: trigger reads "v{n} · Más reciente" (when on the latest)
 * or just "v{n}", and the dropdown lists every version with the newest pinned to the top
 * and an explicit "Más reciente" badge so the user always knows which is which.
 */
export default function ArtifactVersion({
  currentIndex,
  totalVersions,
  onVersionChange,
}: ArtifactVersionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const menuId = 'artifact-version-dropdown';

  if (totalVersions <= 1) {
    return null;
  }

  const latestIndex = totalVersions - 1;
  const isOnLatest = currentIndex === latestIndex;

  /** Newest on top, v1 at the bottom (Claude-style ordering). */
  const dropdownItems = Array.from({ length: totalVersions }, (_, i) => i)
    .reverse()
    .map((index) => {
      const isSelected = index === currentIndex;
      const isLatest = index === latestIndex;
      return {
        label: `Versión ${index + 1}${isLatest ? '   ·   Más reciente' : ''}`,
        onClick: () => {
          onVersionChange(index);
          setIsOpen(false);
        },
        icon: isSelected ? (
          <Check size={14} className="text-amber-500" aria-hidden="true" />
        ) : (
          <span className="block w-[14px]" aria-hidden="true" />
        ),
      };
    });

  return (
    <DropdownPopup
      menuId={menuId}
      portal
      focusLoop
      unmountOnHide
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={
        <Button variant="ghost" asChild aria-label="Cambiar versión">
          <MenuButton className="flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary">
            <span>
              v{currentIndex + 1}
              {isOnLatest && <span className="ml-1 opacity-70">· Más reciente</span>}
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </MenuButton>
        </Button>
      }
      items={dropdownItems}
      className={isSmallScreen ? '' : 'absolute right-0 top-0 mt-2 min-w-[200px]'}
    />
  );
}
