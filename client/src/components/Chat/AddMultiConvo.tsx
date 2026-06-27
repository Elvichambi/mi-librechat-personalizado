import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { ChevronDown, PlusCircle, Search, Star } from 'lucide-react';
import {
  Permissions,
  EModelEndpoint,
  PermissionTypes,
  isAgentsEndpoint,
  isAssistantsEndpoint,
} from 'librechat-data-provider';
import type { TConversation } from 'librechat-data-provider';
import type { Endpoint } from '~/common';
import {
  useGetEndpointsQuery,
  useGetStartupConfig,
  useListAgentsQuery,
} from '~/data-provider';
import { useAgentsMapContext, useAssistantsMapContext } from '~/Providers';
import {
  useAgentDefaultPermissionLevel,
  useEndpoints,
  useFavorites,
  useGetConversation,
  useHasAccess,
  useLocalize,
} from '~/hooks';
import { mainTextareaId } from '~/common';
import store from '~/store';

interface ModelOption {
  endpoint: Endpoint;
  modelName: string;
  displayName: string;
}

const LAST_USED_KEY = 'storylab:add-multi-convo-last';

type LastUsed = { endpoint: string; model: string } | null;

const readLastUsed = (): LastUsed => {
  try {
    const raw = localStorage.getItem(LAST_USED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.endpoint === 'string' && typeof parsed.model === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

function ModelRow({
  option,
  selected,
  onPick,
  highlight,
}: {
  option: ModelOption;
  selected?: boolean;
  onPick: () => void;
  highlight?: 'star' | 'history' | null;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
        selected
          ? 'bg-amber-500/10 text-text-primary'
          : 'text-text-primary hover:bg-surface-hover'
      }`}
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full">
        {option.endpoint.icon}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{option.displayName}</span>
      <span className="flex-shrink-0 truncate text-[10px] text-text-tertiary">
        {option.endpoint.label ?? option.endpoint.value}
      </span>
      {highlight === 'history' && (
        <span className="ml-1 flex-shrink-0 rounded bg-blue-500/15 px-1 text-[9px] font-semibold text-blue-500">
          último
        </span>
      )}
      {highlight === 'star' && (
        <Star className="h-3 w-3 flex-shrink-0 fill-amber-500 text-amber-500" aria-hidden="true" />
      )}
    </button>
  );
}

function AddMultiConvo() {
  const localize = useLocalize();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const getConversation = useGetConversation(0);
  const endpoint = useRecoilValue(store.conversationEndpointByIndex(0));
  const setAddedConvo = useSetRecoilState(store.conversationByIndex(1));

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lastUsed, setLastUsed] = useState<LastUsed>(readLastUsed);
  const [anchorPos, setAnchorPos] = useState<{ top: number; left: number } | null>(null);

  const { data: startupConfig } = useGetStartupConfig();
  const { data: endpointsConfig } = useGetEndpointsQuery();
  const agentsMap = useAgentsMapContext();
  const assistantsMap = useAssistantsMapContext();

  const hasAgentAccess = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.USE,
  });
  const permissionLevel = useAgentDefaultPermissionLevel();
  const { data: agents = null } = useListAgentsQuery(
    { requiredPermission: permissionLevel },
    { select: (data) => data?.data, enabled: hasAgentAccess },
  );

  const { mappedEndpoints } = useEndpoints({
    agents,
    assistantsMap,
    startupConfig,
    endpointsConfig: endpointsConfig ?? {},
  });

  const { favorites } = useFavorites();

  const allModels: ModelOption[] = useMemo(() => {
    const list: ModelOption[] = [];
    mappedEndpoints?.forEach((ep) => {
      if (!ep.hasModels || !ep.models) return;
      ep.models.forEach((m) => {
        const modelName = m.name;
        let displayName = modelName;
        if (isAgentsEndpoint(ep.value)) {
          displayName = ep.agentNames?.[modelName] ?? agentsMap?.[modelName]?.name ?? modelName;
        } else if (isAssistantsEndpoint(ep.value)) {
          displayName = ep.assistantNames?.[modelName] ?? modelName;
        }
        list.push({ endpoint: ep, modelName, displayName });
      });
    });
    return list;
  }, [mappedEndpoints, agentsMap]);

  const lastUsedOption = useMemo(() => {
    if (!lastUsed) return null;
    return (
      allModels.find(
        (m) => m.endpoint.value === lastUsed.endpoint && m.modelName === lastUsed.model,
      ) ?? null
    );
  }, [allModels, lastUsed]);

  const favoriteOptions: ModelOption[] = useMemo(() => {
    const seen = new Set<string>();
    const out: ModelOption[] = [];
    favorites.forEach((f) => {
      if (!f.model || !f.endpoint) return;
      const key = `${f.endpoint}|${f.model}`;
      if (seen.has(key)) return;
      seen.add(key);
      const opt = allModels.find(
        (m) => m.endpoint.value === f.endpoint && m.modelName === f.model,
      );
      if (opt) out.push(opt);
    });
    return out;
  }, [favorites, allModels]);

  const searchResults: ModelOption[] = useMemo(() => {
    if (!query.trim()) return [];
    const needle = query.toLowerCase();
    return allModels
      .filter(
        (m) =>
          m.modelName.toLowerCase().includes(needle) ||
          m.displayName.toLowerCase().includes(needle) ||
          (m.endpoint.label ?? '').toLowerCase().includes(needle),
      )
      .slice(0, 30);
  }, [query, allModels]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  const updateAnchorPos = useCallback(() => {
    const trigger = containerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const PANEL_WIDTH = 288; // matches the w-72 class on the panel
    const margin = 8;
    let left = rect.right - PANEL_WIDTH;
    if (left < margin) left = margin;
    if (left + PANEL_WIDTH + margin > window.innerWidth) {
      left = window.innerWidth - PANEL_WIDTH - margin;
    }
    setAnchorPos({ top: rect.bottom + 4, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setAnchorPos(null);
      return;
    }
    updateAnchorPos();
    const handle = () => updateAnchorPos();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open, updateAnchorPos]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open]);

  const focusTextarea = () => {
    const textarea = document.getElementById(mainTextareaId);
    textarea?.focus();
  };

  const setAddedFromBase = useCallback(
    (override: Partial<TConversation>) => {
      const base = getConversation();
      const { title: _t, ...rest } = base ?? ({} as TConversation);
      setAddedConvo({
        ...(rest as TConversation),
        ...override,
        title: '',
      } as TConversation);
    },
    [getConversation, setAddedConvo],
  );

  const persistLastUsed = useCallback((next: LastUsed) => {
    setLastUsed(next);
    if (next) {
      localStorage.setItem(LAST_USED_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(LAST_USED_KEY);
    }
  }, []);

  const addWithSame = useCallback(() => {
    setAddedFromBase({});
    focusTextarea();
  }, [setAddedFromBase]);

  const addWithModel = useCallback(
    (option: ModelOption) => {
      const epValue = option.endpoint.value as EModelEndpoint;
      const override: Partial<TConversation> = {
        endpoint: epValue,
        endpointType: epValue,
        model: option.modelName,
      };
      if (isAgentsEndpoint(epValue)) {
        override.agent_id = option.modelName;
        override.model =
          agentsMap?.[option.modelName]?.model ?? option.endpoint.agentNames?.[option.modelName] ?? '';
      } else if (isAssistantsEndpoint(epValue)) {
        override.assistant_id = option.modelName;
        override.model =
          assistantsMap?.[epValue]?.[option.modelName]?.model ?? option.modelName;
      }
      setAddedFromBase(override);
      persistLastUsed({ endpoint: epValue, model: option.modelName });
      close();
      focusTextarea();
    },
    [setAddedFromBase, persistLastUsed, close, agentsMap, assistantsMap],
  );

  const handleQuickAdd = useCallback(() => {
    if (lastUsedOption) {
      addWithModel(lastUsedOption);
    } else {
      addWithSame();
    }
  }, [lastUsedOption, addWithModel, addWithSame]);

  if (!endpoint) {
    return null;
  }

  if (isAssistantsEndpoint(endpoint)) {
    return null;
  }

  const hasFavorites = favoriteOptions.length > 0;
  const hasLastUsed = lastUsedOption != null;
  const showingSearch = query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative inline-flex">
      <div className="inline-flex items-stretch overflow-hidden rounded-xl border border-border-light bg-presentation text-text-primary">
        <button
          type="button"
          onClick={handleQuickAdd}
          aria-label={localize('com_ui_add_multi_conversation')}
          title={
            lastUsedOption
              ? `Añadir con: ${lastUsedOption.displayName}`
              : localize('com_ui_add_multi_conversation')
          }
          data-testid="add-multi-convo-button"
          className="flex h-9 items-center justify-center px-2 transition-all ease-in-out hover:bg-surface-tertiary"
        >
          <PlusCircle className="icon-sm" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Elegir modelo para la conversación añadida"
          title="Elegir modelo"
          aria-expanded={open}
          className={`flex h-9 w-5 items-center justify-center border-l border-border-light text-text-secondary transition-all ease-in-out hover:bg-surface-tertiary ${
            open ? 'bg-surface-tertiary' : ''
          }`}
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {open &&
        anchorPos &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{ top: anchorPos.top, left: anchorPos.left }}
            className="fixed z-[10000] w-72 overflow-hidden rounded-xl border border-border-light bg-surface-primary shadow-xl"
          >
            <div className="border-b border-border-light p-2">
              <div className="flex items-center gap-1.5 rounded-md border border-border-light bg-surface-secondary px-2 py-1">
                <Search className="h-3 w-3 text-text-tertiary" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar modelo…"
                  className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto px-2 py-2">
              {showingSearch ? (
                searchResults.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-text-tertiary">Sin resultados</p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {searchResults.map((opt) => (
                      <ModelRow
                        key={`s|${opt.endpoint.value}|${opt.modelName}`}
                        option={opt}
                        onPick={() => addWithModel(opt)}
                      />
                    ))}
                  </div>
                )
              ) : (
                <>
                  {hasLastUsed && (
                    <div className="mb-2">
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        Último usado
                      </p>
                      <ModelRow
                        option={lastUsedOption}
                        onPick={() => addWithModel(lastUsedOption)}
                        highlight="history"
                      />
                    </div>
                  )}

                  {hasFavorites && (
                    <div className="mb-2">
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        Favoritos
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {favoriteOptions.map((opt) => (
                          <ModelRow
                            key={`f|${opt.endpoint.value}|${opt.modelName}`}
                            option={opt}
                            onPick={() => addWithModel(opt)}
                            highlight="star"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasLastUsed && !hasFavorites && (
                    <p className="px-2 py-3 text-center text-xs text-text-tertiary">
                      Marca modelos como favoritos o busca uno abajo para empezar.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-border-light bg-surface-secondary/40 px-3 py-1.5 text-[10px] leading-snug text-text-tertiary">
              Click rápido al{' '}
              <span className="font-semibold text-text-secondary">+</span> añade con el último modelo.
              Solo 1 conversación añadida (límite nativo de LibreChat).
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default AddMultiConvo;
