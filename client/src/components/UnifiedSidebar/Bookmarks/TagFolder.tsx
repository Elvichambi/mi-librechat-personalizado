import { memo, useMemo, useState, useCallback } from 'react';
import { Folder as FolderIcon, Pen, Trash } from 'lucide-react';
import { OGDialog, OGDialogTemplate, Button, useToastContext } from '@librechat/client';
import type { TConversationTag } from 'librechat-data-provider';
import { useConversationsInfiniteQuery, useDeleteConversationTagMutation } from '~/data-provider';
import BookmarkEditDialog from '~/components/Bookmarks/BookmarkEditDialog';
import ConvoRows from './ConvoRows';
import Folder from './Folder';

function TagFolder({ tag }: { tag: TConversationTag }) {
  const { showToast } = useToastContext();
  const [isOpen, setIsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, refetch } = useConversationsInfiniteQuery(
    { tags: [tag.tag] },
    { enabled: isOpen },
  );

  const conversations = useMemo(
    () => (data ? data.pages.flatMap((page) => page.conversations) : []),
    [data],
  );

  const deleteMutation = useDeleteConversationTagMutation({
    onSuccess: () => {
      showToast({ message: `Carpeta "${tag.tag}" eliminada`, status: 'success' });
      setConfirmOpen(false);
    },
    onError: () => {
      showToast({ message: 'No se pudo eliminar la carpeta', status: 'error' });
    },
  });

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(tag.tag);
  }, [deleteMutation, tag.tag]);

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <>
      <Folder
        icon={FolderIcon}
        label={tag.tag}
        count={tag.count}
        onOpenChange={setIsOpen}
        headerRight={
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/folder:opacity-100">
            <button
              type="button"
              aria-label="Renombrar carpeta"
              onClick={(e) => {
                stop(e);
                setEditOpen(true);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary hover:bg-surface-active-alt hover:text-text-primary"
            >
              <Pen className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Eliminar carpeta"
              onClick={(e) => {
                stop(e);
                setConfirmOpen(true);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary hover:bg-surface-active-alt hover:text-red-500"
            >
              <Trash className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        }
      >
        <ConvoRows
          conversations={conversations}
          refetch={refetch}
          emptyLabel="Carpeta vacía"
        />
      </Folder>

      <BookmarkEditDialog
        context="TagFolder"
        bookmark={tag}
        open={editOpen}
        setOpen={setEditOpen}
      />

      <OGDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <OGDialogTemplate
          title="Eliminar carpeta"
          className="w-11/12 max-w-md"
          main={
            <div className="text-sm text-text-primary">
              ¿Seguro que quieres eliminar la carpeta <strong>{tag.tag}</strong>? Los chats no se
              borran, solo se quita la etiqueta.
            </div>
          }
          buttons={
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isLoading}
            >
              Eliminar
            </Button>
          }
        />
      </OGDialog>
    </>
  );
}

export default memo(TagFolder);
