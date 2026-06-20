import { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { AutoSizer, List } from 'react-virtualized';
import { Spinner, useCombobox } from '@librechat/client';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import type { TPromptGroup } from 'librechat-data-provider';
import type { PromptOption } from '~/common';
import useInitPopoverInput from '~/hooks/Input/useInitPopoverInput';
import useGroupedPrompts from '~/hooks/Prompts/useGroupedPrompts';
import { removeCharIfLast, detectVariables } from '~/utils';
import { useUpdatePromptGroup, useRecordPromptUsage } from '~/data-provider';
import { VariableDialog } from '~/components/Prompts';
import { usePromptGroupsContext } from '~/Providers';
import PromptFolder from './PromptFolder';
import MentionItem from './MentionItem';
import { useLocalize } from '~/hooks';
import store from '~/store';

const commandChar = '/';

const PopoverContainer = memo(
  ({
    index,
    children,
    isVariableDialogOpen,
    variableGroup,
    setVariableDialogOpen,
    textAreaRef,
  }: {
    index: number;
    children: React.ReactNode;
    isVariableDialogOpen: boolean;
    variableGroup: TPromptGroup | null;
    setVariableDialogOpen: (isOpen: boolean) => void;
    textAreaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  }) => {
    const showPromptsPopover = useRecoilValue(store.showPromptsPopoverFamily(index));
    return (
      <>
        {showPromptsPopover ? children : null}
        <VariableDialog
          open={isVariableDialogOpen}
          onClose={() => {
            setVariableDialogOpen(false);
            requestAnimationFrame(() => {
              textAreaRef.current?.focus();
            });
          }}
          group={variableGroup}
        />
      </>
    );
  },
);

const ROW_HEIGHT = 44;

function PromptsCommand({
  index,
  textAreaRef,
  submitPrompt,
}: {
  index: number;
  textAreaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  submitPrompt: (textPrompt: string) => void;
}) {
  const localize = useLocalize();
  const { mutate: recordUsage } = useRecordPromptUsage();
  const promptGroupsContext = usePromptGroupsContext();
  const { allPromptGroups, hasAccess } = promptGroupsContext ?? {};
  const { data, isLoading } = allPromptGroups ?? {};

  const [activeIndex, setActiveIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isVariableDialogOpen, setVariableDialogOpen] = useState(false);
  const [variableGroup, setVariableGroup] = useState<TPromptGroup | null>(null);
  const setShowPromptsPopover = useSetRecoilState(store.showPromptsPopoverFamily(index));

  const prompts = useMemo(() => data?.promptGroups, [data]);
  const promptsMap = useMemo(() => data?.promptsMap, [data]);
  const updateGroupMutation = useUpdatePromptGroup();

  const { open, setOpen, searchValue, setSearchValue, matches } = useCombobox({
    value: '',
    options: prompts ?? [],
  });

  const initInputRef = useInitPopoverInput({
    inputRef,
    textAreaRef,
    commandChar,
    setSearchValue,
    setOpen,
  });

  const handleSelect = useCallback(
    (mention?: PromptOption, e?: React.KeyboardEvent<HTMLInputElement>) => {
      if (!mention) {
        return;
      }

      setSearchValue('');
      setOpen(false);
      setShowPromptsPopover(false);

      if (textAreaRef.current) {
        removeCharIfLast(textAreaRef.current, commandChar);
      }

      const group = promptsMap?.[mention.id];
      if (!group) {
        return;
      }

      const hasVariables = detectVariables(group.productionPrompt?.prompt ?? '');
      if (hasVariables) {
        if (e && e.key === 'Tab') {
          e.preventDefault();
        }
        setVariableGroup(group);
        setVariableDialogOpen(true);
        return;
      } else {
        submitPrompt(group.productionPrompt?.prompt ?? '');
        if (group._id) {
          recordUsage(group._id);
        }
      }
    },
    [
      setSearchValue,
      setOpen,
      setShowPromptsPopover,
      textAreaRef,
      promptsMap,
      submitPrompt,
      recordUsage,
    ],
  );

  useEffect(() => {
    if (!open) {
      setActiveIndex(0);
    } else {
      setVariableGroup(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentActiveItem = document.getElementById(`prompt-item-${activeIndex}`);
    currentActiveItem?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  }, [activeIndex]);

  const { items: groupedItems, toggleFolder } = useGroupedPrompts(
    matches as PromptOption[],
    searchValue,
  );

  const handleDropToFolder = useCallback(
    (folderName: string, promptId: string) => {
      const category = folderName === 'Recientes' ? '' : folderName;
      updateGroupMutation.mutate({ id: promptId, payload: { category } });
    },
    [updateGroupMutation],
  );

  const promptIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < groupedItems.length; i++) {
      if (groupedItems[i].type === 'prompt') {
        indices.push(i);
      }
    }
    return indices;
  }, [groupedItems]);

  if (!hasAccess) {
    return null;
  }

  const rowRenderer = ({
    index: rowIndex,
    key,
    style,
  }: {
    index: number;
    key: string;
    style: React.CSSProperties;
  }) => {
    const item = groupedItems[rowIndex];
    if (item.type === 'folder') {
      return (
        <PromptFolder
          key={key}
          style={style}
          name={item.name}
          count={item.count}
          expanded={item.expanded}
          onToggle={() => toggleFolder(item.name === 'Recientes' ? '' : item.name)}
          onDrop={(promptId) => handleDropToFolder(item.name, promptId)}
        />
      );
    }
    const mention = item.option;
    const promptIdx = promptIndices.indexOf(rowIndex);
    return (
      <MentionItem
        index={rowIndex}
        type="prompt"
        key={key}
        style={style}
        onClick={() => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = null;
          handleSelect(mention);
        }}
        name={mention.label ?? ''}
        icon={mention.icon}
        description={mention.description}
        isActive={promptIdx === activeIndex}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('promptGroupId', mention.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
      />
    );
  };

  return (
    <PopoverContainer
      index={index}
      isVariableDialogOpen={isVariableDialogOpen}
      variableGroup={variableGroup}
      setVariableDialogOpen={setVariableDialogOpen}
      textAreaRef={textAreaRef}
    >
      <div className="absolute bottom-28 z-10 w-full space-y-2">
        <div className="popover border-token-border-light rounded-2xl border bg-surface-tertiary-alt p-2 shadow-lg">
          <input
            ref={initInputRef}
            placeholder={localize('com_ui_command_usage_placeholder')}
            className="mb-1 w-full border-0 bg-surface-tertiary-alt p-2 text-sm focus:outline-none dark:text-gray-200"
            autoComplete="off"
            value={searchValue}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setShowPromptsPopover(false);
                textAreaRef.current?.focus();
              }
              if (e.key === 'ArrowDown') {
                setActiveIndex((prevIndex) => (prevIndex + 1) % promptIndices.length);
              } else if (e.key === 'ArrowUp') {
                setActiveIndex(
                  (prevIndex) => (prevIndex - 1 + promptIndices.length) % promptIndices.length,
                );
              } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
                const flatIdx = promptIndices[activeIndex];
                const item = flatIdx != null ? groupedItems[flatIdx] : undefined;
                const mention =
                  item && item.type === 'prompt' ? (item.option as PromptOption) : undefined;
                handleSelect(mention, e);
              } else if (e.key === 'Backspace' && searchValue === '') {
                setOpen(false);
                setShowPromptsPopover(false);
                textAreaRef.current?.focus();
              }
            }}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              timeoutRef.current = setTimeout(() => {
                setOpen(false);
                setShowPromptsPopover(false);
              }, 150);
            }}
          />
          {open && isLoading && groupedItems.length === 0 && (
            <div className="flex h-32 items-center justify-center text-text-primary">
              <Spinner />
            </div>
          )}
          {open && groupedItems.length > 0 && (
            <div className="max-h-60">
              <AutoSizer disableHeight>
                {({ width }) => (
                  <List
                    width={width}
                    overscanRowCount={5}
                    rowHeight={ROW_HEIGHT}
                    rowCount={groupedItems.length}
                    rowRenderer={rowRenderer}
                    scrollToIndex={
                      promptIndices[activeIndex] != null ? promptIndices[activeIndex] : 0
                    }
                    height={Math.min(groupedItems.length * ROW_HEIGHT, 260)}
                  />
                )}
              </AutoSizer>
            </div>
          )}
        </div>
      </div>
    </PopoverContainer>
  );
}

export default memo(PromptsCommand);
