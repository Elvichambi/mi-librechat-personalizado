import { useState } from 'react';
import copy from 'copy-to-clipboard';
import { MenuButton } from '@ariakit/react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { DropdownPopup, Button, useMediaQuery } from '@librechat/client';

interface ArtifactCopyMenuProps {
  content: string;
}

/**
 * Strips common markdown markers so users can copy the *visible* text without `**`,
 * `#`, `*`, ``` ` ```, blockquote markers, list bullets, etc. Mirrors what's shown in
 * the rendered preview reasonably well — not a full parser, but covers the 90% case.
 */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function ArtifactCopyMenu({ content }: ArtifactCopyMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const flash = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const copyMarkdown = () => {
    copy(content, { format: 'text/plain' });
    flash();
    setIsOpen(false);
  };

  const copyPlain = () => {
    copy(toPlainText(content), { format: 'text/plain' });
    flash();
    setIsOpen(false);
  };

  const items = [
    {
      label: 'Markdown (formato original)',
      onClick: copyMarkdown,
      icon: <Copy size={14} aria-hidden="true" />,
    },
    {
      label: 'Texto plano (sin marcas)',
      onClick: copyPlain,
      icon: <span className="block w-[14px]" aria-hidden="true" />,
    },
  ];

  return (
    <DropdownPopup
      menuId="artifact-copy-menu"
      portal
      focusLoop
      unmountOnHide
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={
        <Button variant="ghost" asChild aria-label="Copiar artifact">
          <MenuButton className="flex h-9 items-center gap-0.5 rounded-md px-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary">
            {copied ? (
              <Check size={16} className="text-green-500" aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            <ChevronDown size={12} aria-hidden="true" />
          </MenuButton>
        </Button>
      }
      items={items}
      className={isSmallScreen ? '' : 'absolute right-0 top-0 mt-2 min-w-[210px]'}
    />
  );
}
