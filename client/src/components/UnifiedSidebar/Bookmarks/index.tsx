import { memo, useState } from 'react';
import { Bookmark, Plus, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useHasAccess } from '~/hooks';
import { useGetConversationTags } from '~/data-provider';
import BookmarkEditDialog from '~/components/Bookmarks/BookmarkEditDialog';
import SearchResults from './SearchResults';
import FrozenFolder from './FrozenFolder';
import TagFolder from './TagFolder';
import { cn } from '~/utils';

function BookmarksSection() {
  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const { data: tags } = useGetConversationTags(undefined);
  const isSearching = search.trim().length > 0;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="flex flex-col border-t border-border-light">
      <div className="flex h-8 items-center gap-1 px-3 text-xs font-semibold uppercase tracking-wider text-text-secondary transition-colors hover:bg-surface-hover">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left uppercase"
        >
          <span>Marcadores</span>
          <Bookmark className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Buscar chats"
          title="Buscar chats"
          onClick={(e) => {
            stop(e);
            setExpanded(true);
            setSearchOpen((prev) => !prev);
            if (searchOpen) {
              setSearch('');
            }
          }}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-surface-active-alt hover:text-text-primary',
            searchOpen && 'text-blue-500',
          )}
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {hasAccess && (
          <button
            type="button"
            aria-label="Nueva carpeta"
            title="Nueva carpeta"
            onClick={(e) => {
              stop(e);
              setCreateOpen(true);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-surface-active-alt hover:text-text-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          aria-label={expanded ? 'Contraer' : 'Desplegar'}
          onClick={() => setExpanded((prev) => !prev)}
          className="flex h-6 items-center text-text-secondary transition-colors hover:text-text-primary"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="flex max-h-80 flex-col overflow-y-auto overflow-x-hidden pb-2">
          {searchOpen && (
            <div className="px-3 pb-2">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar chats…"
                className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {isSearching ? (
            <SearchResults query={search} />
          ) : (
            <div className="px-2">
              <FrozenFolder />
              {hasAccess && (tags ?? []).map((tag) => <TagFolder key={tag.tag} tag={tag} />)}
            </div>
          )}
        </div>
      )}

      {hasAccess && (
        <BookmarkEditDialog context="BookmarksSection" open={createOpen} setOpen={setCreateOpen} />
      )}
    </div>
  );
}

export default memo(BookmarksSection);
