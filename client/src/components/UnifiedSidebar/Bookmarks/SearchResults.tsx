import { memo, useMemo } from 'react';
import { useConversationsInfiniteQuery } from '~/data-provider';
import ConvoRows from './ConvoRows';

function SearchResults({ query }: { query: string }) {
  const { data, refetch } = useConversationsInfiniteQuery(
    { search: query },
    { enabled: query.trim().length > 0 },
  );

  const conversations = useMemo(
    () => (data ? data.pages.flatMap((page) => page.conversations) : []),
    [data],
  );

  return (
    <div className="px-2">
      <ConvoRows conversations={conversations} refetch={refetch} emptyLabel="Sin resultados" />
    </div>
  );
}

export default memo(SearchResults);
