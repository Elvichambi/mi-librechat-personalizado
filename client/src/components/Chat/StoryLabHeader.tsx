import React, { memo, useMemo, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { useQueryClient } from '@tanstack/react-query';
import { SquarePen } from 'lucide-react';
import { TooltipAnchor, useMediaQuery } from '@librechat/client';
import {
  getConfigDefaults,
  PermissionTypes,
  Permissions,
  QueryKeys,
} from 'librechat-data-provider';
import {
  ModelSelectorProvider,
  useModelSelectorContext,
} from './Menus/Endpoints/ModelSelectorContext';
import { ModelSelectorChatProvider } from './Menus/Endpoints/ModelSelectorChatContext';
import { getSelectedIcon, getDisplayValue } from './Menus/Endpoints/utils';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import { OpenSidebar, PresetsMenu } from './Menus';
import BookmarkMenu from './Menus/BookmarkMenu';
import FreezeButton from './Menus/FreezeButton';
import { TemporaryChat } from './TemporaryChat';
import AddMultiConvo from './AddMultiConvo';
import { useHasAccess, useLocalize, useNewConvo } from '~/hooks';
import { clearMessagesCache, cn } from '~/utils';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

function CollapsedNewChat() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const conversation = useRecoilValue(store.conversationByIndex(0));

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey) {
        return;
      }
      e.preventDefault();
      clearMessagesCache(queryClient, conversation?.conversationId);
      queryClient.invalidateQueries([QueryKeys.messages]);
      newConversation();
    },
    [queryClient, conversation?.conversationId, newConversation],
  );

  return (
    <TooltipAnchor
      description={localize('com_ui_new_chat')}
      render={
        <a
          href="/c/new"
          onClick={handleClick}
          aria-label={localize('com_ui_new_chat')}
          data-testid="storylab-header-new-chat"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-light bg-presentation text-text-primary transition-colors hover:bg-surface-active-alt"
        >
          <SquarePen className="icon-md" aria-hidden="true" />
        </a>
      }
    />
  );
}

function ActiveModelHeaderDisplay() {
  const localize = useLocalize();
  const { mappedEndpoints, selectedValues, modelSpecs, endpointsConfig } =
    useModelSelectorContext();

  const selectedIcon = useMemo(
    () =>
      getSelectedIcon({
        mappedEndpoints: mappedEndpoints ?? [],
        selectedValues,
        modelSpecs,
        endpointsConfig,
      }),
    [mappedEndpoints, selectedValues, modelSpecs, endpointsConfig],
  );

  const selectedDisplayValue = useMemo(
    () =>
      getDisplayValue({
        localize,
        modelSpecs,
        selectedValues,
        mappedEndpoints,
      }),
    [localize, modelSpecs, selectedValues, mappedEndpoints],
  );

  return (
    <div className="my-1 flex h-9 items-center gap-2 rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-primary">
      {selectedIcon && React.isValidElement(selectedIcon) && (
        <div className="flex flex-shrink-0 items-center justify-center overflow-hidden">
          {selectedIcon}
        </div>
      )}
      <span className="max-w-[200px] truncate text-left font-semibold">{selectedDisplayValue}</span>
    </div>
  );
}

function Header() {
  const { data: startupConfig } = useGetStartupConfig();
  const navVisible = useRecoilValue(store.sidebarExpanded);

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const hasAccessToMultiConvo = useHasAccess({
    permissionType: PermissionTypes.MULTI_CONVO,
    permission: Permissions.USE,
  });

  const hasAccessToTemporaryChat = useHasAccess({
    permissionType: PermissionTypes.TEMPORARY_CHAT,
    permission: Permissions.USE,
  });

  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  return (
    <div className="via-presentation/70 md:from-presentation/80 md:via-presentation/50 2xl:from-presentation/0 absolute top-0 z-10 flex h-[52px] w-full items-center justify-between bg-gradient-to-b from-presentation to-transparent p-2 font-semibold text-text-primary 2xl:via-transparent">
      <div className="hide-scrollbar flex w-full items-center justify-between gap-2 overflow-x-auto">
        <div className="mx-1 flex items-center">
          {!navVisible && isSmallScreen && <OpenSidebar />}
          {!navVisible && !isSmallScreen && <CollapsedNewChat />}
          {navVisible && isSmallScreen && <OpenSidebar />}
          {!(navVisible && isSmallScreen) && (
            <div
              className={cn(
                'flex items-center gap-2 pl-2',
                !isSmallScreen ? 'transition-all duration-200 ease-in-out' : '',
              )}
            >
              <ModelSelectorChatProvider>
                <ModelSelectorProvider startupConfig={startupConfig}>
                  <ActiveModelHeaderDisplay />
                </ModelSelectorProvider>
              </ModelSelectorChatProvider>
              {interfaceConfig.presets === true && interfaceConfig.modelSelect && <PresetsMenu />}
              {hasAccessToBookmarks === true && <BookmarkMenu />}
              <FreezeButton />
              {hasAccessToMultiConvo === true && <AddMultiConvo />}
              {isSmallScreen && (
                <>
                  <ExportAndShareMenu
                    isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false}
                  />
                  {hasAccessToTemporaryChat === true && <TemporaryChat />}
                </>
              )}
            </div>
          )}
        </div>

        {!isSmallScreen && (
          <div className="flex items-center gap-2">
            <ExportAndShareMenu
              isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false}
            />
            {hasAccessToTemporaryChat === true && <TemporaryChat />}
          </div>
        )}
      </div>
      {/* Empty div for spacing */}
      <div />
    </div>
  );
}

const MemoizedHeader = memo(Header);
MemoizedHeader.displayName = 'Header';

export default MemoizedHeader;
