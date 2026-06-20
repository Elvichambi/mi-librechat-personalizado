import { memo, useMemo, useState, useCallback } from 'react';
import { Snowflake } from 'lucide-react';
import { useConversationsInfiniteQuery } from '~/data-provider';
import ConvoRows from './ConvoRows';
import Folder from './Folder';

const PREVIEW_COUNT = 5;

function FrozenFolder() {
  const [showAll, setShowAll] = useState(false);
  const { data, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConversationsInfiniteQuery({ isFrozen: true });

  const conversations = useMemo(
    () =>
      data
        ? data.pages
            .flatMap((page) => page.conversations)
            .filter((convo) => convo.isFrozen === true)
        : [],
    [data],
  );

  const visible = showAll ? conversations : conversations.slice(0, PREVIEW_COUNT);
  const hiddenCount = conversations.length - PREVIEW_COUNT;

  const handleShowAll = useCallback(() => {
    setShowAll(true);
    if (hasNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage]);

  return (
    <Folder
      icon={Snowflake}
      label="Congelados"
      count={conversations.length}
      defaultOpen
      highlight
    >
      <ConvoRows
        conversations={visible}
        refetch={refetch}
        emptyLabel="Aún no tienes plantillas congeladas"
      />
      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={handleShowAll}
          className="px-3 py-1.5 text-left text-xs font-medium text-blue-500 transition-colors hover:underline"
        >
          Ver todos ({conversations.length})
        </button>
      )}
      {showAll && (hasNextPage || isFetchingNextPage) && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="px-3 py-1.5 text-left text-xs font-medium text-text-secondary transition-colors hover:underline disabled:opacity-60"
        >
          {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </Folder>
  );
}

export default memo(FrozenFolder);
