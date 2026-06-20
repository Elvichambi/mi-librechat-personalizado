import { memo, useState, useCallback } from 'react';
import { Snowflake, CopyPlus, Pen, AlertTriangle } from 'lucide-react';
import {
  Spinner,
  OGDialog,
  OGDialogTemplate,
  Button,
  useToastContext,
} from '@librechat/client';
import type { TConversation } from 'librechat-data-provider';
import { useDuplicateConversationMutation, useUpdateFrozenMutation } from '~/data-provider';
import { useNavigateToConvo } from '~/hooks';

function FrozenBanner({
  conversation,
  index = 0,
}: {
  conversation: TConversation | null;
  index?: number;
}) {
  const { showToast } = useToastContext();
  const { navigateToConvo } = useNavigateToConvo(index);
  const conversationId = conversation?.conversationId ?? '';
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);

  const updateFrozenMutation = useUpdateFrozenMutation(conversationId);

  const useTemplateMutation = useDuplicateConversationMutation({
    onSuccess: (data) => {
      navigateToConvo(data.conversation);
      showToast({
        message: 'Clon editable creado — la copia congelada sigue intacta ❄️',
        status: 'success',
      });
    },
    onError: () => {
      showToast({ message: 'No se pudo clonar', status: 'error' });
    },
  });

  const handleUse = useCallback(() => {
    if (!conversationId) {
      return;
    }
    useTemplateMutation.mutate({ conversationId });
  }, [conversationId, useTemplateMutation]);

  const handleConfirmEdit = useCallback(() => {
    if (!conversationId) {
      return;
    }
    updateFrozenMutation.mutate(
      { conversationId, isFrozen: false },
      {
        onSuccess: () => {
          setConfirmEditOpen(false);
          showToast({
            message: 'Plantilla descongelada — ya puedes editarla',
            status: 'success',
          });
        },
        onError: () => {
          showToast({ message: 'No se pudo descongelar', status: 'error' });
        },
      },
    );
  }, [conversationId, updateFrozenMutation, showToast]);

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Snowflake className="h-4 w-4 flex-shrink-0 text-blue-500" aria-hidden="true" />
        <span>Copia congelada (solo lectura) — protegida contra cambios. Clónala para continuar escribiendo.</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleUse}
          disabled={useTemplateMutation.isLoading}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {useTemplateMutation.isLoading ? (
            <Spinner className="size-4" />
          ) : (
            <CopyPlus className="h-4 w-4" aria-hidden="true" />
          )}
          Clonar para continuar
        </button>
        <button
          type="button"
          onClick={() => setConfirmEditOpen(true)}
          disabled={updateFrozenMutation.isLoading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-medium px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-60"
        >
          <Pen className="h-4 w-4" aria-hidden="true" />
          Editar (descongelar)
        </button>
      </div>

      <OGDialog open={confirmEditOpen} onOpenChange={setConfirmEditOpen}>
        <OGDialogTemplate
          title="¿Descongelar esta copia?"
          className="w-11/12 max-w-md"
          main={
            <div className="flex items-start gap-3 text-sm text-text-primary">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
                aria-hidden="true"
              />
              <div>
                Esta copia dejará de estar protegida y podrás <strong>modificarla</strong>. Perderás
                la garantía de que la plantilla queda intacta. Si solo quieres seguir el chat,
                pulsa <strong>Cancelar</strong> y usa <strong>Clonar para continuar</strong>.
              </div>
            </div>
          }
          buttons={
            <Button
              variant="destructive"
              onClick={handleConfirmEdit}
              disabled={updateFrozenMutation.isLoading}
            >
              {updateFrozenMutation.isLoading ? (
                <Spinner className="size-4" />
              ) : (
                'Sí, descongelar'
              )}
            </Button>
          }
        />
      </OGDialog>
    </div>
  );
}

export default memo(FrozenBanner);
