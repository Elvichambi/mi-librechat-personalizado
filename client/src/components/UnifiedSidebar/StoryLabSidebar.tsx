import React, { memo, useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, SquarePen, LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react';
import { QueryKeys } from 'librechat-data-provider';
import { Skeleton, Sidebar } from '@librechat/client';
import type { NavLink } from '~/common';
import { useActivePanel, DEFAULT_PANEL } from '~/Providers';
import { useLocalize, useNewConvo, useShowMarketplace } from '~/hooks';
import { clearMessagesCache } from '~/utils';
import ConversationsSection from './ConversationsSection';
import BookmarksSection from './Bookmarks';
import OpenSidebar from '~/components/Chat/Menus/OpenSidebar';
import SearchBar from '~/components/Nav/SearchBar';
import store from '~/store';

const AccountSettings = lazy(() => import('~/components/Nav/AccountSettings'));

function StoryLabSidebar({
  expanded,
  links,
  onCollapse,
  sidebarWidth,
  setSidebarWidth,
}: {
  expanded: boolean;
  links: NavLink[];
  onCollapse?: () => void;
  sidebarWidth?: number;
  setSidebarWidth?: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [showTools, setShowTools] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activeSubPanel, setActiveSubPanel] = useState<string | null>(null);
  const [lastNormalWidth, setLastNormalWidth] = useState<number>(sidebarWidth || 260);

  const localize = useLocalize();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const switchToHistory = useRecoilValue(store.newChatSwitchToHistory);
  const showMarketplace = useShowMarketplace();
  const { setActive } = useActivePanel();

  // Filter out links we render ourselves: chat history and bookmarks (now in the Marcadores section)
  const toolLinks = links.filter((l) => l.id !== 'conversations' && l.id !== 'bookmarks');

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
    [
      queryClient,
      conversation?.conversationId,
      newConversation,
      switchToHistory,
      setActive,
      setSidebarWidth,
      lastNormalWidth,
    ],
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

  const handleMarketplace = useCallback(() => {
    navigate('/agents');
  }, [navigate]);

  // Collapsed rail — only the expand toggle (new chat lives in the header; full sidebar reveals on hover)
  if (!expanded) {
    return (
      <div className="flex h-full w-full flex-col items-center pt-2 text-text-primary">
        <OpenSidebar />
      </div>
    );
  }

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
      {/* Logo + Collapse + Search toggle */}
      <div className="flex items-center justify-between border-b border-border-light px-2 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label={localize('com_nav_close_sidebar')}
            title={localize('com_nav_close_sidebar')}
          >
            <Sidebar className="h-5 w-5" />
          </button>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-wide">StoryLab</span>
        </div>
        <button
          onClick={() => setShowSearch((prev) => !prev)}
          className={
            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-hover hover:text-text-primary ' +
            (showSearch ? 'text-blue-500' : 'text-text-secondary')
          }
          aria-label={localize('com_nav_search_placeholder')}
          title={localize('com_nav_search_placeholder')}
          aria-pressed={showSearch}
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {/* Search — toggled, like the bookmarks search */}
      {showSearch && (
        <div className="px-3 pb-1 pt-3">
          <SearchBar />
        </div>
      )}

      {/* New Chat — Kimi-style row */}
      <div className="px-2 pb-1 pt-2">
        <a
          href="/c/new"
          onClick={handleNewChat}
          className="flex items-center gap-2.5 rounded-xl border border-border-light px-2.5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
          aria-label={localize('com_ui_new_chat')}
          data-testid="storylab-new-chat"
        >
          <SquarePen className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span>{localize('com_ui_new_chat')}</span>
        </a>
      </div>

      {/* Recent Chats — takes remaining space */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-1">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <ConversationsSection filterMode="active" showFavorites={false} showChatsHeader={false} />
        </div>
      </div>

      {/* Marcadores — carpeta fija "Congelados" + carpetas por etiqueta */}
      <BookmarksSection />

      {/* Tools / Panel Links — COLLAPSIBLE */}
      {(toolLinks.length > 0 || showMarketplace) && (
        <div className="border-t border-border-light">
          <button
            onClick={() => setShowTools(!showTools)}
            className="flex h-8 w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-surface-hover"
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
                {showMarketplace && (
                  <button
                    onClick={handleMarketplace}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  >
                    <LayoutGrid className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{localize('com_agents_marketplace')}</span>
                  </button>
                )}
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
      <div className="border-t border-border-light px-2 py-1.5">
        <Suspense fallback={<Skeleton className="h-9 w-full rounded-lg" />}>
          <AccountSettings />
        </Suspense>
      </div>
    </div>
  );
}

export default memo(StoryLabSidebar);
