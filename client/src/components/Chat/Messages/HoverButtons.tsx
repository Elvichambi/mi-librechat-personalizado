import React, { useState, useMemo, memo } from 'react';
import { useRecoilState } from 'recoil';
import { useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Trash2, GitFork, ClipboardType } from 'lucide-react';
import type { TConversation, TMessage, TFeedback } from 'librechat-data-provider';
import { request, QueryKeys, ForkOptions } from 'librechat-data-provider';
import { EditIcon, Clipboard, CheckMark, ContinueIcon, RegenerateIcon, useToastContext } from '@librechat/client';
import { useGenerationsByLatest, useLocalize, useNavigateToConvo, useNewConvo } from '~/hooks';
import { useForkConvoMutation, useDeleteConversationMutation } from '~/data-provider';
import MessageAudio from './MessageAudio';
import Feedback from './Feedback';
import { cn } from '~/utils';
import store from '~/store';


type THoverButtons = {
  isEditing: boolean;
  enterEdit: (cancel?: boolean) => void;
  copyToClipboard: (setIsCopied: React.Dispatch<React.SetStateAction<boolean>>) => void;
  conversation: TConversation | null;
  isSubmitting: boolean;
  message: TMessage;
  regenerate: () => void;
  handleContinue: (e: React.MouseEvent<HTMLButtonElement>) => void;
  latestMessageId?: string;
  isLast: boolean;
  index: number;
  handleFeedback?: ({ feedback }: { feedback: TFeedback | undefined }) => void;
};

type HoverButtonProps = {
  id?: string;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isVisible?: boolean;
  isDisabled?: boolean;
  isLast?: boolean;
  className?: string;
  buttonStyle?: string;
};

const extractMessageContent = (message: TMessage): string => {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (part == null) {
          return '';
        }
        if (typeof part === 'string') {
          return part;
        }
        if ('text' in part) {
          return part.text || '';
        }
        if ('think' in part) {
          const think = part.think;
          if (typeof think === 'string') {
            return think;
          }
          return think && 'text' in think ? think.text || '' : '';
        }
        return '';
      })
      .join('');
  }

  return message.text || '';
};

const HoverButton = memo(
  ({
    id,
    onClick,
    title,
    icon,
    isActive = false,
    isVisible = true,
    isDisabled = false,
    isLast = false,
    className = '',
  }: HoverButtonProps) => {
    const buttonStyle = cn(
      'hover-button rounded-lg p-1.5 text-text-secondary-alt',
      'hover:text-text-primary hover:bg-surface-hover',
      'md:group-hover:visible md:group-focus-within:visible md:group-[.final-completion]:visible',
      !isLast && 'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
      !isVisible && 'opacity-0',
      'focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none',
      isActive && isVisible && 'active text-text-primary bg-surface-hover',
      className,
    );

    return (
      <button
        id={id}
        className={buttonStyle}
        onClick={onClick}
        type="button"
        title={title}
        disabled={isDisabled}
      >
        {icon}
      </button>
    );
  },
);

HoverButton.displayName = 'HoverButton';

const stripMarkdown = (markdown: string): string => {
  return markdown
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove bold/italic markers
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove headings
    .replace(/^#+\s+/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove blockquotes
    .replace(/^\s*>\s+/gm, '')
    // Remove code block wrappers
    .replace(/```[a-z]*\n([\s\S]*?)\n```/g, '$1')
    .trim();
};

const HoverButtons = ({
  index,
  isEditing,
  enterEdit,
  copyToClipboard,
  conversation,
  isSubmitting,
  message,
  regenerate,
  handleContinue,
  latestMessageId,
  isLast,
  handleFeedback,
}: THoverButtons) => {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { navigateToConvo } = useNavigateToConvo();
  const { showToast } = useToastContext();
  const { newConversation } = useNewConvo();
  const deleteConvo = useDeleteConversationMutation({
    onSuccess: () => {
      newConversation();
      showToast({
        message: localize('com_ui_delete_success') || 'Conversación eliminada',
        status: 'success',
      });
    },
  });

  const [isCopied, setIsCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [TextToSpeech] = useRecoilState<boolean>(store.textToSpeech);

  const endpoint = useMemo(() => {
    if (!conversation) {
      return '';
    }
    return conversation.endpointType ?? conversation.endpoint;
  }, [conversation]);

  const generationCapabilities = useGenerationsByLatest({
    isEditing,
    isSubmitting,
    error: message.error,
    endpoint: endpoint ?? '',
    messageId: message.messageId,
    searchResult: message.searchResult,
    finish_reason: message.finish_reason,
    isCreatedByUser: message.isCreatedByUser,
    latestMessageId: latestMessageId,
  });

  const {
    hideEditButton,
    regenerateEnabled,
    continueSupported,
    forkingSupported,
    isEditableEndpoint,
  } = generationCapabilities;

  const forkConvo = useForkConvoMutation({
    onSuccess: (data) => {
      navigateToConvo(data.conversation);
      showToast({
        message: localize('com_ui_fork_success') || 'Bifurcación exitosa',
        status: 'success',
      });
    },
    onMutate: () => {
      showToast({
        message: localize('com_ui_fork_processing') || 'Procesando bifurcación...',
        status: 'info',
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_fork_error') || 'Error al bifurcar conversación',
        status: 'error',
      });
    },
  });

  if (!conversation) {
    return null;
  }

  const { isCreatedByUser, error } = message;

  if (error === true) {
    return (
      <div className="visible flex justify-center self-end lg:justify-start">
        {regenerateEnabled && (
          <HoverButton
            onClick={regenerate}
            title={localize('com_ui_regenerate')}
            icon={<RegenerateIcon size="19" />}
            isLast={isLast}
          />
        )}
      </div>
    );
  }

  const onEdit = () => {
    if (isEditing) {
      return enterEdit(true);
    }
    enterEdit();
  };

  const handleCopy = () => copyToClipboard(setIsCopied);

  const handleCopyMarkdown = () => {
    copyToClipboard((val) => {
      if (typeof val === 'function') {
        const newCopied = val(false);
        if (newCopied) {
          showToast({ message: localize('com_ui_copied_to_clipboard') || 'Copiado', status: 'success' });
        }
      } else {
        if (val) {
          showToast({ message: localize('com_ui_copied_to_clipboard') || 'Copiado', status: 'success' });
        }
      }
    });
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      localize('com_ui_delete_confirm') || '¿Estás seguro de que deseas eliminar este mensaje?'
    );
    if (!confirmed) return;

    try {
      // DIAGNOSTIC: Log the exact conversationId used for the cache key
      console.log('[HoverButtons handleDelete] cache key convoId:', conversation.conversationId);
      console.log('[HoverButtons handleDelete] deleting messageId:', message.messageId, 'parentMessageId:', message.parentMessageId);

      // Check if this is the last message before deleting
      const currentMessages = queryClient.getQueryData<TMessage[]>(
        [QueryKeys.messages, conversation.conversationId]
      ) || [];
      console.log('[HoverButtons handleDelete] currentMessages in cache:', currentMessages.length);
      const remainingCount = currentMessages.filter(
        (m) => m.messageId !== message.messageId
      ).length;
      console.log('[HoverButtons handleDelete] remainingCount after filter:', remainingCount);

      if (remainingCount === 0) {
        // Last message deleted — remove entire conversation and redirect to new chat
        deleteConvo.mutate({
          conversationId: conversation.conversationId!,
          source: 'button',
          });
        return;
      }

      // 1. Optimistic update: surgically remove from cache and re-link children INSTANTLY
      queryClient.setQueryData<TMessage[]>([QueryKeys.messages, conversation.conversationId], (prev) => {
        if (!prev) return prev;
        const parentId = message.parentMessageId || '00000000-0000-0000-0000-000000000000';
        const updated = prev
          .filter((m) => m.messageId !== message.messageId)
          .map((m) => {
            if (m.parentMessageId === message.messageId) {
              return { ...m, parentMessageId: parentId };
            }
            return m;
          });
        console.log('[HoverButtons handleDelete] setQueryData updated cache, new length:', updated.length);
        return updated;
      });

      // Show toast immediately so the user gets instant feedback
      showToast({
        message: localize('com_ui_delete_success') || 'Mensaje eliminado con éxito',
        status: 'success',
      });

      // 2. Delete on server in the background
      await request.delete(`/api/messages/${conversation.conversationId}/${message.messageId}`);
      console.log('[HoverButtons handleDelete] Server delete confirmed (204)');

      // 3. Invalidate queries in the background to ensure authoritative sync
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.messages, conversation.conversationId],
        refetchType: 'active',
      });
      console.log('[HoverButtons handleDelete] invalidateQueries triggered in background');
    } catch (err) {
      console.error('[HoverButtons handleDelete] Error deleting message:', err);
      showToast({
        message: localize('com_ui_delete_error') || 'Error al eliminar el mensaje',
        status: 'error',
      });
    }
  };

  const handleFork = () => {
    forkConvo.mutate({
      messageId: message.messageId,
      conversationId: conversation.conversationId || '',
      option: ForkOptions.DIRECT_PATH,
      splitAtTarget: false,
      latestMessageId,
    });
  };

  return (
    <div className="group visible flex justify-center gap-0.5 self-end focus-within:outline-none lg:justify-start">
      {/* Text to Speech */}
      {TextToSpeech && (
        <MessageAudio
          index={index}
          isLast={isLast}
          messageId={message.messageId}
          content={extractMessageContent(message)}
          renderButton={(props) => (
            <HoverButton
              onClick={props.onClick}
              title={props.title}
              icon={props.icon}
              isActive={props.isActive}
              isLast={isLast}
            />
          )}
        />
      )}

      {/* Copy Button */}
      <HoverButton
        onClick={handleCopy}
        title={
          isCopied ? localize('com_ui_copied_to_clipboard') : localize('com_ui_copy_to_clipboard')
        }
        icon={isCopied ? <CheckMark className="h-[18px] w-[18px]" /> : <Clipboard size="19" />}
        isLast={isLast}
        className={cn(
          'ml-0 flex items-center gap-1.5 text-xs',
          isSubmitting && isCreatedByUser ? 'md:opacity-0 md:group-hover:opacity-100' : '',
        )}
      />

      {/* Edit Button */}
      {isEditableEndpoint && (
        <HoverButton
          id={`edit-${message.messageId}`}
          onClick={onEdit}
          title={localize('com_ui_edit')}
          icon={<EditIcon size="19" />}
          isActive={isEditing}
          isVisible={!hideEditButton}
          isDisabled={hideEditButton}
          isLast={isLast}
          className={isCreatedByUser ? '' : 'active'}
        />
      )}

      {/* Feedback Buttons */}
      {!isCreatedByUser && handleFeedback != null && (
        <Feedback handleFeedback={handleFeedback} feedback={message.feedback} isLast={isLast} />
      )}

      {/* Regenerate Button */}
      {regenerateEnabled && (
        <HoverButton
          onClick={regenerate}
          title={localize('com_ui_regenerate')}
          icon={<RegenerateIcon size="19" />}
          isLast={isLast}
          className="active"
        />
      )}

      {/* Continue Button */}
      {continueSupported && (
        <HoverButton
          onClick={(e) => e && handleContinue(e)}
          title={localize('com_ui_continue')}
          icon={<ContinueIcon className="w-19 h-19 -rotate-180" />}
          isLast={isLast}
          className="active"
        />
      )}

      {/* Delete/Trash Button */}
      <HoverButton
        onClick={handleDelete}
        title={localize('com_ui_delete') || 'Eliminar'}
        icon={<Trash2 size="19" className="text-red-400 hover:text-red-500" />}
        isLast={isLast}
      />
    </div>
  );
};

export const MessageActionsDropdown = memo(({
  message,
  conversation,
  latestMessageId,
  copyToClipboard,
}: {
  message: TMessage;
  conversation: TConversation | null;
  latestMessageId?: string;
  copyToClipboard: (setIsCopied: React.Dispatch<React.SetStateAction<boolean>>) => void;
}) => {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { navigateToConvo } = useNavigateToConvo();
  const { showToast } = useToastContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { newConversation } = useNewConvo();
  const deleteConvo = useDeleteConversationMutation({
    onSuccess: () => {
      newConversation();
      showToast({
        message: localize('com_ui_delete_success') || 'Conversación eliminada',
        status: 'success',
      });
    },
  });

  const generationCapabilities = useGenerationsByLatest({
    isEditing: false,
    isSubmitting: false,
    error: message.error,
    endpoint: conversation?.endpointType ?? conversation?.endpoint ?? '',
    messageId: message.messageId,
    searchResult: message.searchResult,
    finish_reason: message.finish_reason,
    isCreatedByUser: message.isCreatedByUser,
    latestMessageId: latestMessageId,
  });

  const { forkingSupported } = generationCapabilities;

  const forkConvo = useForkConvoMutation({
    onSuccess: (data) => {
      navigateToConvo(data.conversation);
      showToast({
        message: localize('com_ui_fork_success') || 'Bifurcación exitosa',
        status: 'success',
      });
    },
    onMutate: () => {
      showToast({
        message: localize('com_ui_fork_processing') || 'Procesando bifurcación...',
        status: 'info',
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_fork_error') || 'Error al bifurcar conversación',
        status: 'error',
      });
    },
  });

  if (!conversation) {
    return null;
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      localize('com_ui_delete_confirm') || '¿Estás seguro de que deseas eliminar este mensaje?'
    );
    if (!confirmed) return;

    try {
      // DIAGNOSTIC: Log the exact conversationId used for the cache key
      console.log('[MessageActionsDropdown handleDelete] cache key convoId:', conversation.conversationId);
      console.log('[MessageActionsDropdown handleDelete] deleting messageId:', message.messageId, 'parentMessageId:', message.parentMessageId);

      // Check if this is the last message before deleting
      const currentMessages = queryClient.getQueryData<TMessage[]>(
        [QueryKeys.messages, conversation.conversationId]
      ) || [];
      console.log('[MessageActionsDropdown handleDelete] currentMessages in cache:', currentMessages.length);
      const remainingCount = currentMessages.filter(
        (m) => m.messageId !== message.messageId
      ).length;
      console.log('[MessageActionsDropdown handleDelete] remainingCount after filter:', remainingCount);

      if (remainingCount === 0) {
        // Last message deleted — remove entire conversation and redirect to new chat
        deleteConvo.mutate({
          conversationId: conversation.conversationId!,
          source: 'button',
        });
        return;
      }

      // 1. Optimistic update: surgically remove from cache and re-link children INSTANTLY
      queryClient.setQueryData<TMessage[]>([QueryKeys.messages, conversation.conversationId], (prev) => {
        if (!prev) return prev;
        const parentId = message.parentMessageId || '00000000-0000-0000-0000-000000000000';
        const updated = prev
          .filter((m) => m.messageId !== message.messageId)
          .map((m) => {
            if (m.parentMessageId === message.messageId) {
              return { ...m, parentMessageId: parentId };
            }
            return m;
          });
        console.log('[MessageActionsDropdown handleDelete] setQueryData updated cache, new length:', updated.length);
        return updated;
      });

      // Show toast immediately so the user gets instant feedback
      showToast({
        message: localize('com_ui_delete_success') || 'Mensaje eliminado con éxito',
        status: 'success',
      });

      // 2. Delete on server in the background
      await request.delete(`/api/messages/${conversation.conversationId}/${message.messageId}`);
      console.log('[MessageActionsDropdown handleDelete] Server delete confirmed (204)');

      // 3. Invalidate queries in the background to ensure authoritative sync
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.messages, conversation.conversationId],
        refetchType: 'active',
      });
      console.log('[MessageActionsDropdown handleDelete] invalidateQueries triggered in background');
    } catch (err) {
      console.error('[MessageActionsDropdown handleDelete] Error deleting message:', err);
      showToast({
        message: localize('com_ui_delete_error') || 'Error al eliminar el mensaje',
        status: 'error',
      });
    }
  };

  const handleCopyMarkdown = () => {
    copyToClipboard((val) => {
      if (typeof val === 'function') {
        const res = val(false);
        if (res) {
          showToast({ message: 'Copiar Markdown', status: 'success' });
        }
      } else if (val) {
        showToast({ message: 'Copiar Markdown', status: 'success' });
      }
    });
  };

  const handleFork = () => {
    forkConvo.mutate({
      messageId: message.messageId,
      conversationId: conversation.conversationId || '',
      option: ForkOptions.DIRECT_PATH,
      splitAtTarget: false,
      latestMessageId,
    });
  };

  return (
    <div className="absolute right-2 top-2 z-50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        title={localize('com_ui_more_actions') || 'More actions'}
        className={cn(
          'hover-button rounded-lg p-1.5 text-text-secondary-alt bg-[#202124]/90 dark:bg-[#1a1a1c]/95 border border-[#3c4043]/30 shadow-sm',
          'hover:text-text-primary hover:bg-surface-hover',
          'focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none',
          isMenuOpen && 'active text-text-primary bg-surface-hover'
        )}
        type="button"
      >
        <MoreHorizontal size="19" />
      </button>
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 w-40 rounded-md bg-[#1e1e20] border border-[#3c4043]/50 shadow-[0_8px_30px_rgba(0,0,0,0.6)] py-1.5 flex flex-col select-none">
            <button
              type="button"
              onClick={() => {
                handleDelete();
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2 text-[13px] text-red-400 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5 font-medium shrink-0"
            >
              <Trash2 size="15" className="shrink-0" />
              <span>Eliminar</span>
            </button>

            {forkingSupported && (
              <button
                type="button"
                onClick={() => {
                  handleFork();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[13px] text-text-primary hover:text-text-primary hover:bg-white/[0.06] transition-colors flex items-center gap-2.5 font-normal shrink-0"
              >
                <GitFork size="15" className="shrink-0" />
                <span>Bifurcar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleCopyMarkdown();
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2 text-[13px] text-text-primary hover:text-text-primary hover:bg-white/[0.06] transition-colors flex items-center gap-2.5 font-normal shrink-0"
            >
              <ClipboardType size="15" className="shrink-0" />
              <span>Copiar Markdown</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
});

MessageActionsDropdown.displayName = 'MessageActionsDropdown';

export default memo(HoverButtons);
