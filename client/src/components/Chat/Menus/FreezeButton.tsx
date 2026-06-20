import { useCallback } from 'react';
import { Snowflake } from 'lucide-react';
import { useRecoilValue } from 'recoil';
import { Constants } from 'librechat-data-provider';
import { TooltipAnchor, Spinner, useToastContext } from '@librechat/client';
import type { FC } from 'react';
import { useDuplicateConversationMutation, useUpdateFrozenMutation } from '~/data-provider';
import { cn } from '~/utils';
import store from '~/store';

const FreezeButton: FC = () => {
  const { showToast } = useToastContext();
  const conversation = useRecoilValue(store.conversationByIndex(0)) || undefined;
  const conversationId = conversation?.conversationId ?? '';
  const isFrozen = conversation?.isFrozen === true;
  const isTemporary = conversation?.expiredAt != null;

  const freezeMutation = useUpdateFrozenMutation('');
  const duplicateAndFreeze = useDuplicateConversationMutation({
    onSuccess: (data) => {
      freezeMutation.mutate({
        conversationId: data.conversation.conversationId ?? '',
        isFrozen: true,
      });
      showToast({
        message: 'Copia congelada guardada en Congelados ❄️',
        status: 'success',
      });
    },
    onError: () => {
      showToast({ message: 'No se pudo congelar la copia', status: 'error' });
    },
  });

  const handleFreeze = useCallback(() => {
    if (!conversationId) {
      return;
    }
    duplicateAndFreeze.mutate({ conversationId });
  }, [conversationId, duplicateAndFreeze]);

  const isActiveConvo = Boolean(
    conversation &&
      conversationId &&
      conversationId !== Constants.NEW_CONVO &&
      conversationId !== 'search',
  );

  /** Hide on temporary chats and on a frozen copy (clone it from the in-chat banner instead) */
  if (!isActiveConvo || isTemporary || isFrozen) {
    return null;
  }

  const isLoading = duplicateAndFreeze.isLoading || freezeMutation.isLoading;

  return (
    <TooltipAnchor
      description="Congelar (guardar copia en Congelados)"
      render={
        <button
          type="button"
          aria-label="Congelar conversación (guardar copia)"
          onClick={handleFreeze}
          disabled={isLoading}
          className={cn(
            'flex size-9 flex-shrink-0 items-center justify-center rounded-xl border border-border-light bg-presentation text-sm transition-colors duration-200 hover:bg-surface-hover disabled:opacity-60',
          )}
          data-testid="freeze-button"
        >
          {isLoading ? (
            <Spinner aria-label="Spinner" />
          ) : (
            <Snowflake className="icon-md" aria-hidden="true" />
          )}
        </button>
      }
    />
  );
};

export default FreezeButton;
