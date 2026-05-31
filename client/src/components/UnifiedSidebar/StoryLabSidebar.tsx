import React, { memo, useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import { SquarePen, Snowflake, ChevronDown, ChevronRight, Sparkles, PanelLeftClose } from 'lucide-react';
import { QueryKeys, Constants } from 'librechat-data-provider';
import { Skeleton } from '@librechat/client';
import type { NavLink } from '~/common';
import { useActivePanel, resolveActivePanel, DEFAULT_PANEL } from '~/Providers';
import { useLocalize, useNewConvo } from '~/hooks';
import { clearMessagesCache } from '~/utils';
import ConversationsSection from './ConversationsSection';
import SearchBar from '~/components/Nav/SearchBar';
import store from '~/store';

const AccountSettings = lazy(() => import('~/components/Nav/AccountSettings'));

function StoryLabSidebar({
  expanded,
  links,
  onCollapse,
  onExpand,
  sidebarWidth,
  setSidebarWidth,
}: {
  expanded: boolean;
  links: NavLink[];
  onCollapse?: () => void;
  onExpand?: () => void;
  sidebarWidth?: number;
  setSidebarWidth?: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [showFrozen, setShowFrozen] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [activeSubPanel, setActiveSubPanel] = useState<string | null>(null);
  const [lastNormalWidth, setLastNormalWidth] = useState<number>(sidebarWidth || 260);

  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const switchToHistory = useRecoilValue(store.newChatSwitchToHistory);
  const { setActive } = useActivePanel();

  // Filter out the conversations link — we render it ourselves
  const toolLinks = links.filter((l) => l.id !== 'conversations');

  // Save the last dragged width in normal view
  useEffect(() => {
    if (activeSubPanel === null && sidebarWidth != null) {
      setLastNormalWidth(sidebarWidth);
    }
  }, [sidebarWidth, activeSubPanel]);

  const handleNewChat = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      clearMessagesCache(queryClient, conversation?.conversationId);
      queryClient.invalidateQueries([QueryKeys.messages]);
      newConversation();
      setActiveSubPanel(null);
      if (setSidebarWidth) {
        setSidebarWidth(lastNormalWidth);
      }
      if (switchToHistory) {
        setActive(DEFAULT_PANEL);
      }
    },
    [queryClient, conversation?.conversationId, newConversation, switchToHistory, setActive, setSidebarWidth, lastNormalWidth],
  );

  const handleToolClick = useCallback(
    (link: NavLink) => {
      if (link.onClick) {
        link.onClick({} as React.MouseEvent<HTMLButtonElement>);
        return;
      }
      if (activeSubPanel === link.id) {
        setActiveSubPanel(null);
        if (setSidebarWidth) {
          setSidebarWidth(lastNormalWidth);
        }
        return;
      }
      
      // Auto-expand left sidebar if it is too narrow
      if (sidebarWidth != null && setSidebarWidth) {
        setLastNormalWidth(sidebarWidth);
        if (sidebarWidth < 340) {
          setSidebarWidth(340);
        }
      }

      setActiveSubPanel(link.id);
      setActive(link.id);
    },
    [activeSubPanel, setActive, sidebarWidth, setSidebarWidth, lastNormalWidth],
  );

  if (!expanded) return null;

  // If a sub-panel is active, show it full-height
  const activeLink = toolLinks.find((l) => l.id === activeSubPanel);
  if (activeLink?.Component) {
    return (
      <div className="flex h-full w-full flex-col bg-surface-primary-alt text-text-primary">
        {/* Sub-panel header */}
        <div className="flex items-center gap-2 border-b border-border-light p-3">
          <button
            onClick={() => {
              setActiveSubPanel(null);
              if (setSidebarWidth) {
                setSidebarWidth(lastNormalWidth);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Back"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <span className="text-sm font-semibold">{localize(activeLink.title)}</span>
        </div>
        {/* Sub-panel content — scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <activeLink.Component />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-surface-primary-alt text-text-primary">
      {/* Logo + Collapse + New Chat */}
      <div className="flex items-center justify-between border-b border-border-light px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label={localize('com_nav_close_sidebar')}
            title={localize('com_nav_close_sidebar')}
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-wide">StoryLab</span>
        </div>
        <a
          href="/c/new"
          onClick={handleNewChat}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label={localize('com_ui_new_chat')}
          data-testid="storylab-new-chat"
        >
          <SquarePen className="h-5 w-5" />
        </a>
      </div>

      {/* Search — Real SearchBar component */}
      <div className="px-3 pt-3 pb-1">
        <SearchBar />
      </div>

      {/* Recent Chats — takes remaining space */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {localize('com_ui_chat_history')}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <ConversationsSection filterMode="active" />
        </div>
      </div>

      {/* Frozen Chats — collapsible */}
      <div className="flex flex-col border-t border-border-light">
        <button
          onClick={() => setShowFrozen(!showFrozen)}
          className="flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-surface-hover"
        >
          <div className="flex items-center gap-2">
            <Snowflake className="h-3.5 w-3.5" />
            <span>Frozen Chats</span>
          </div>
          {showFrozen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        {showFrozen && (
          <div className="max-h-40 overflow-y-auto overflow-x-hidden">
            <ConversationsSection filterMode="frozen" />
          </div>
        )}
      </div>

      {/* Tools / Panel Links — COLLAPSIBLE */}
      {toolLinks.length > 0 && (
        <div className="border-t border-border-light">
          <button
            onClick={() => setShowTools(!showTools)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-surface-hover"
          >
            <span>Tools</span>
            {showTools ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
          {showTools && (
            <div className="max-h-48 overflow-y-auto overflow-x-hidden px-3 pb-2">
              <div className="flex flex-col gap-0.5">
                {toolLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleToolClick(link)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  >
                    <link.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{localize(link.title)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account */}
      <div className="border-t border-border-light p-3">
        <Suspense fallback={<Skeleton className="h-10 w-full rounded-lg" />}>
          <AccountSettings />
        </Suspense>
      </div>
    </div>
  );
}

export default memo(StoryLabSidebar);
