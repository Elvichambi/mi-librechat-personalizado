import { useState } from 'react';
import { MenuButton } from '@ariakit/react';
import { ChevronDown, Check, FileText } from 'lucide-react';
import { DropdownPopup, Button, useMediaQuery } from '@librechat/client';
import type { Artifact } from '~/common';

interface ArtifactDocumentPickerProps {
  currentArtifact: Artifact;
  orderedIdentifiers: string[];
  versionsByIdentifier: Record<string, string[]>;
  artifacts: Record<string, Artifact | undefined> | null;
  onPick: (artifactKey: string) => void;
}

/**
 * Document switcher shown at the top of the artifacts panel. Lists every
 * distinct artifact identifier in the conversation; picking one selects its
 * MOST RECENT version. Versions WITHIN a document are switched separately by
 * `ArtifactVersion`.
 */
export default function ArtifactDocumentPicker({
  currentArtifact,
  orderedIdentifiers,
  versionsByIdentifier,
  artifacts,
  onPick,
}: ArtifactDocumentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const menuId = 'artifact-document-dropdown';

  const currentTitle = currentArtifact.title ?? currentArtifact.identifier ?? 'Sin título';
  const currentIdentifier = currentArtifact.identifier;

  const items = orderedIdentifiers
    .slice()
    .reverse()
    .map((identifier) => {
      const keys = versionsByIdentifier[identifier] ?? [];
      const latestKey = keys.at(-1);
      if (!latestKey) {
        return null;
      }
      const latest = artifacts?.[latestKey];
      if (!latest) {
        return null;
      }
      const title = latest.title ?? identifier;
      const versionCount = keys.length;
      const isSelected = identifier === currentIdentifier;
      return {
        label: `${title}${versionCount > 1 ? `   ·   ${versionCount} versiones` : ''}`,
        onClick: () => {
          onPick(latestKey);
          setIsOpen(false);
        },
        icon: isSelected ? (
          <Check size={14} className="text-amber-500" aria-hidden="true" />
        ) : (
          <FileText size={14} className="text-text-secondary" aria-hidden="true" />
        ),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <DropdownPopup
      menuId={menuId}
      portal
      focusLoop
      unmountOnHide
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={
        <Button variant="ghost" asChild aria-label="Cambiar de documento">
          <MenuButton
            className="flex h-9 min-w-0 max-w-full items-center gap-1.5 rounded-md px-2 text-base font-semibold text-text-primary hover:bg-surface-hover disabled:cursor-default disabled:opacity-100 disabled:hover:bg-transparent"
            disabled={orderedIdentifiers.length <= 1}
          >
            <FileText size={15} aria-hidden="true" className="flex-shrink-0 text-text-secondary" />
            <span className="truncate" title={currentTitle}>
              {currentTitle}
            </span>
            {orderedIdentifiers.length > 1 && (
              <ChevronDown size={14} aria-hidden="true" className="flex-shrink-0 text-text-secondary" />
            )}
          </MenuButton>
        </Button>
      }
      items={items}
      className={isSmallScreen ? '' : 'absolute left-0 top-0 mt-2 min-w-[240px]'}
    />
  );
}
