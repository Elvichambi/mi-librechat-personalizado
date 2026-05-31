import React, { useState, useMemo, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { ChevronLeft, ChevronRight, Search, Star, Key, CheckCircle, HelpCircle, Trash2, ChevronDown } from 'lucide-react';
import { useSetIndexOptions } from '~/hooks/Conversations';
import { useChatContext } from '~/Providers';
import Parameters from '~/components/SidePanel/Parameters/Panel';
import '~/components/Chat/StoryLabStyles.css';
import store from '~/store';
import { useGetStartupConfig } from '~/data-provider';
import { ModelSelectorProvider, useModelSelectorContext } from '../Chat/Menus/Endpoints/ModelSelectorContext';
import { ModelSelectorChatProvider } from '../Chat/Menus/Endpoints/ModelSelectorChatContext';
import { getSelectedIcon, getDisplayValue } from '../Chat/Menus/Endpoints/utils';
import { useLocalize, useFavorites } from '~/hooks';
import useUserKey from '~/hooks/Input/useUserKey';
import DialogManager from '../Chat/Menus/Endpoints/DialogManager';
import { getModelInfo } from '~/utils/modelInfo';
import { EModelEndpoint } from 'librechat-data-provider';

interface ModelCardProps {
  modelId: string;
  endpoint: any;
  isSelected: boolean;
  onSelect: () => void;
  favoriteClick: (e: React.MouseEvent) => void;
  isFavorite: boolean;
}

function ModelCard({ modelId, endpoint, isSelected, onSelect, favoriteClick, isFavorite }: ModelCardProps) {
  const { endpointRequiresUserKey, handleOpenKeyDialog } = useModelSelectorContext();
  const requiresKey = endpointRequiresUserKey(endpoint.value);
  const { checkExpiry } = useUserKey(endpoint.value);
  
  const hasKey = useMemo(() => {
    if (!requiresKey) {
      return true;
    }
    try {
      return checkExpiry();
    } catch {
      return false;
    }
  }, [requiresKey, checkExpiry]);

  const modelInfo = useMemo(() => getModelInfo(modelId), [modelId]);

  const handleKeyBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleOpenKeyDialog(endpoint.value as EModelEndpoint, e);
  };

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col relative group ${
        isSelected
          ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
          : 'border-border-light bg-surface-secondary hover:bg-surface-hover hover:border-border-medium'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-text-primary truncate">
              {modelId}
            </span>
            {isSelected && (
              <CheckCircle className="h-4 w-4 text-blue-500 shrink-0 animate-fade-in" />
            )}
          </div>
          <span className="text-[10px] text-text-tertiary font-mono truncate">
            {endpoint.value}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {requiresKey && (
            <button
              onClick={handleKeyBadgeClick}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                hasKey
                  ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              <Key className="h-2.5 w-2.5" />
              <span>{hasKey ? 'Key Set' : 'Set Key'}</span>
            </button>
          )}
          <button
            onClick={favoriteClick}
            className={`p-1 rounded hover:bg-surface-hover transition-colors ${
              isFavorite ? 'text-amber-500' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed mb-2 line-clamp-2">
        {modelInfo.description}
      </p>
      <div className="flex gap-3 text-[10px] text-text-tertiary border-t border-border-light/50 pt-1.5">
        {modelInfo.contextWindow && (
          <span>
            <strong className="text-text-tertiary">Context:</strong> {modelInfo.contextWindow}
          </span>
        )}
        {modelInfo.knowledgeCutoff && (
          <span>
            <strong className="text-text-tertiary">Cutoff:</strong> {modelInfo.knowledgeCutoff}
          </span>
        )}
      </div>
    </div>
  );
}

interface SelectionSidebarProps {
  onClose: () => void;
  panelWidth: number;
  isResizing: boolean;
  handleResizeStart: (e: React.MouseEvent) => void;
  isClosing?: boolean;
}

function ModelSelectionSidebar({ onClose, panelWidth, isResizing, handleResizeStart, isClosing = false }: SelectionSidebarProps) {
  const localize = useLocalize();
  const { mappedEndpoints, selectedValues, handleSelectModel } = useModelSelectorContext();
  const { isFavoriteModel, toggleFavoriteModel } = useFavorites();
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allModelCards = useMemo(() => {
    const list: Array<{ modelId: string; endpoint: any; isSelected: boolean; isFavorite: boolean }> = [];
    if (!mappedEndpoints) {
      return list;
    }

    mappedEndpoints.forEach((ep) => {
      if (!ep.hasModels || !ep.models) {
        return;
      }

      ep.models.forEach((m) => {
        const modelId = m.name;
        
        if (selectedTab !== 'all' && selectedTab !== ep.value) {
          return;
        }

        if (
          searchQuery &&
          !modelId.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !ep.value.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return;
        }

        const isSelected =
          !selectedValues.modelSpec &&
          selectedValues.endpoint === ep.value &&
          selectedValues.model === modelId;

        const isFavorite = isFavoriteModel(modelId, ep.value);

        list.push({ modelId, endpoint: ep, isSelected, isFavorite });
      });
    });

    return list;
  }, [mappedEndpoints, selectedTab, searchQuery, selectedValues, isFavoriteModel]);

  return (
    <div 
      className={`flex h-full flex-shrink-0 flex-col border-l border-border-light bg-surface-primary z-50 fixed right-0 top-0 shadow-2xl ${
        isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
      style={{
        width: panelWidth,
        transition: isResizing ? 'none' : 'width 0.15s ease',
      }}
    >
      {/* Resizable handle */}
      <div
        role="separator"
        aria-label="Resize sidebar"
        className="absolute left-0 top-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors"
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3.5">
        <h2 className="text-sm font-semibold text-text-primary">Model selection</h2>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label="Close"
          title="Close model selection"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 pt-3 pb-1.5">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search for a model or agent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border-light bg-surface-secondary text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Wrapped Tab pills - Google AI Studio style */}
      <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-border-light">
        <button
          onClick={() => setSelectedTab('all')}
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 border ${
            selectedTab === 'all'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-surface-secondary text-text-secondary border-border-light hover:bg-surface-hover hover:text-text-primary'
          }`}
        >
          All
        </button>
        {mappedEndpoints?.map((ep) => (
          <button
            key={ep.value}
            onClick={() => setSelectedTab(ep.value)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 border ${
              selectedTab === ep.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-surface-secondary text-text-secondary border-border-light hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            {ep.icon && React.isValidElement(ep.icon) && (
              <div className="h-3 w-3 shrink-0 flex items-center justify-center overflow-hidden rounded-full">
                {ep.icon}
              </div>
            )}
            <span>{ep.label}</span>
          </button>
        ))}
      </div>

      {/* Scrollable Model Cards */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {allModelCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-text-tertiary">
            <HelpCircle className="h-10 w-10 mb-2 opacity-55 animate-pulse" />
            <p className="text-xs">No models or agents found</p>
          </div>
        ) : (
          allModelCards.map((card) => (
            <ModelCard
              key={`${card.endpoint.value}-${card.modelId}`}
              modelId={card.modelId}
              endpoint={card.endpoint}
              isSelected={card.isSelected}
              onSelect={() => {
                handleSelectModel(card.endpoint, card.modelId);
                onClose();
              }}
              isFavorite={card.isFavorite}
              favoriteClick={(e) => {
                e.stopPropagation();
                toggleFavoriteModel({ model: card.modelId, endpoint: card.endpoint.value });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SystemInstructionsSidebar({ onClose, panelWidth, isResizing, handleResizeStart, isClosing = false }: SelectionSidebarProps) {
  const { conversation } = useChatContext();
  const { setOption } = useSetIndexOptions();

  // Load instructions list from localStorage
  const [instructions, setInstructions] = useState<Array<{ id: string; title: string; text: string }>>(() => {
    const saved = localStorage.getItem('storylab:system-instructions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fail-safe
      }
    }
    return [{ id: 'default', title: 'Untitled', text: '' }];
  });

  const {
    promptPrefix = '',
    system = '',
  } = conversation || {};

  const systemText = promptPrefix || system || '';

  // Active selected ID in selector dropdown
  const [selectedId, setSelectedId] = useState<string>(() => {
    const found = instructions.find(item => item.text === systemText);
    return found ? found.id : (instructions[0]?.id || 'default');
  });

  // Save instructions helper
  const saveToLocalStorage = (list: Array<{ id: string; title: string; text: string }>) => {
    setInstructions(list);
    localStorage.setItem('storylab:system-instructions', JSON.stringify(list));
  };

  const handleCreateNew = () => {
    const newId = String(Date.now());
    const newItem = { id: newId, title: 'Untitled', text: '' };
    const updated = [newItem, ...instructions];
    saveToLocalStorage(updated);
    setSelectedId(newId);

    // Clear active system instruction in LibreChat conversation
    setOption('promptPrefix')('');
    setOption('system')('');
  };

  const handleDeleteActive = () => {
    if (instructions.length <= 1) {
      const updated = [{ id: 'default', title: 'Untitled', text: '' }];
      saveToLocalStorage(updated);
      setSelectedId('default');
      setOption('promptPrefix')('');
      setOption('system')('');
      return;
    }

    const updated = instructions.filter(item => item.id !== selectedId);
    saveToLocalStorage(updated);
    
    // Select the first remaining item
    const nextItem = updated[0];
    setSelectedId(nextItem.id);
    setOption('promptPrefix')(nextItem.text);
    setOption('system')(nextItem.text);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const updated = instructions.map(item => {
      if (item.id === selectedId) {
        return { ...item, title: val };
      }
      return item;
    });
    saveToLocalStorage(updated);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const updated = instructions.map(item => {
      if (item.id === selectedId) {
        return { ...item, text: val };
      }
      return item;
    });
    saveToLocalStorage(updated);

    // Sync in real time with LibreChat active conversation
    setOption('promptPrefix')(val);
    setOption('system')(val);
  };

  // Find the active instruction item
  const activeItem = useMemo(() => {
    return instructions.find(item => item.id === selectedId) || { id: 'default', title: 'Untitled', text: '' };
  }, [instructions, selectedId]);

  return (
    <div 
      className={`flex h-full flex-shrink-0 flex-col border-l border-border-light bg-surface-primary z-50 fixed right-0 top-0 shadow-2xl ${
        isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
      style={{
        width: panelWidth,
        transition: isResizing ? 'none' : 'width 0.15s ease',
      }}
    >
      {/* Resizable handle */}
      <div
        role="separator"
        aria-label="Resize sidebar"
        className="absolute left-0 top-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors"
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3.5 select-none">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">System instructions</h2>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label="Close"
          title="Close instructions"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-grow p-5 flex flex-col gap-4 min-h-0 select-none">
        {/* Selector Dropdown / Select box */}
        <div className="relative">
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">Select Instruction Template</label>
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => {
                const id = e.target.value;
                if (id === 'create-new') {
                  handleCreateNew();
                  return;
                }
                setSelectedId(id);
                const found = instructions.find(item => item.id === id);
                if (found) {
                  setOption('promptPrefix')(found.text);
                  setOption('system')(found.text);
                }
              }}
              className="w-full pl-3 pr-10 py-2 text-xs font-semibold rounded-xl border border-border-light bg-surface-secondary text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              {instructions.map(item => (
                <option key={item.id} value={item.id}>
                  {item.title || 'Untitled'}
                </option>
              ))}
              <option value="create-new" className="text-blue-500 font-bold border-t border-border-light">+ Create new instruction</option>
            </select>
            <ChevronDown className="absolute right-3 top-2 h-4 w-4 text-text-tertiary pointer-events-none" />
          </div>
        </div>

        {/* Title Field with Trash Can */}
        <div className="flex items-center gap-3">
          <div className="flex-grow min-w-0">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">Instruction Title</label>
            <input
              type="text"
              placeholder="Untitled"
              value={activeItem.title}
              onChange={handleTitleChange}
              className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-border-light bg-surface-secondary text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleDeleteActive}
            className="flex h-8 w-8 mt-4.5 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 transition-all hover:bg-red-500/20 active:scale-95 shrink-0"
            aria-label="Delete instruction"
            title="Delete instruction"
            style={{ marginTop: '18px' }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Massive comfortable input space */}
        <div className="flex-grow flex flex-col gap-1.5 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Instructions</span>
            <span className="text-[10px] text-text-tertiary">Instructions are saved in local storage</span>
          </div>
          
          <textarea
            className="w-full flex-grow resize-none rounded-2xl border border-border-medium bg-surface-secondary p-5 text-sm text-text-primary leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Optional tone and style instructions for the model"
            value={activeItem.text}
            onChange={handleTextChange}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

function RunSettingsContent({ setCollapsed }: { setCollapsed: (val: boolean) => void }) {
  const localize = useLocalize();
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [showSystemInstructions, setShowSystemInstructions] = useState(false);
  const { conversation } = useChatContext();
  const { setOption } = useSetIndexOptions();

  // Closing animation states
  const [isClosingModelSelection, setIsClosingModelSelection] = useState(false);
  const [isClosingSystemInstructions, setIsClosingSystemInstructions] = useState(false);
  const [isClosingOverlay, setIsClosingOverlay] = useState(false);

  // Width and resize state
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('run-settings:width');
    return saved ? parseInt(saved, 10) : 320;
  });
  const [lastNormalWidth, setLastNormalWidth] = useState(panelWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(window.innerWidth - moveEvent.clientX, 650));
      setPanelWidth(newWidth);
      localStorage.setItem('run-settings:width', String(newWidth));
      
      // If we are dragging in normal settings view, save it as the last normal width
      if (!showModelSelection && !showSystemInstructions) {
        setLastNormalWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCloseModelSelection = () => {
    setIsClosingOverlay(true);
    setIsClosingModelSelection(true);
    setTimeout(() => {
      setShowModelSelection(false);
      setIsClosingModelSelection(false);
      setIsClosingOverlay(false);
      setPanelWidth(lastNormalWidth);
    }, 280);
  };

  const handleCloseSystemInstructions = () => {
    setIsClosingOverlay(true);
    setIsClosingSystemInstructions(true);
    setTimeout(() => {
      setShowSystemInstructions(false);
      setIsClosingSystemInstructions(false);
      setIsClosingOverlay(false);
      setPanelWidth(lastNormalWidth);
    }, 280);
  };

  const handleCloseAll = () => {
    if (showModelSelection) {
      handleCloseModelSelection();
    } else if (showSystemInstructions) {
      handleCloseSystemInstructions();
    }
  };

  const {
    mappedEndpoints,
    selectedValues,
    modelSpecs,
    endpointsConfig,
    keyDialogOpen,
    onOpenChange,
    keyDialogEndpoint,
  } = useModelSelectorContext();

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

  const modelInfo = useMemo(() => getModelInfo(selectedValues.model || ''), [selectedValues.model]);

  if (!conversation) {
    return null;
  }

  const {
    promptPrefix = '',
    system = '',
  } = conversation;

  const systemText = promptPrefix || system || '';

  return (
    <>
      {/* Blurred Backdrop Overlay */}
      {(showModelSelection || showSystemInstructions) && (
        <div 
          className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2.5px] ${
            isClosingOverlay ? 'animate-fade-out' : 'animate-fade-in'
          }`} 
          onClick={handleCloseAll}
        />
      )}

      {/* Render selected Sidebar Drawer */}
      {showModelSelection ? (
        <ModelSelectionSidebar 
          onClose={handleCloseModelSelection} 
          panelWidth={panelWidth}
          isResizing={isResizing}
          handleResizeStart={handleResizeStart}
          isClosing={isClosingModelSelection}
        />
      ) : showSystemInstructions ? (
        <SystemInstructionsSidebar 
          onClose={handleCloseSystemInstructions} 
          panelWidth={panelWidth}
          isResizing={isResizing}
          handleResizeStart={handleResizeStart}
          isClosing={isClosingSystemInstructions}
        />
      ) : (
        /* Normal Settings View */
        <div 
          className="relative flex h-full flex-shrink-0 flex-col border-l border-border-light bg-surface-primary"
          style={{
            width: panelWidth,
            transition: isResizing ? 'none' : 'width 0.15s ease',
          }}
        >
          {/* Resizable handle */}
          <div
            role="separator"
            aria-label="Resize settings"
            className="absolute left-0 top-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-blue-500/25 active:bg-blue-500/40 transition-colors"
            onMouseDown={handleResizeStart}
          />

          {/* Header — sticky */}
          <div className="flex items-center gap-2 border-b border-border-light px-3 py-3 select-none">
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              aria-label="Collapse settings"
              data-testid="collapse-run-settings"
              title="Collapse panel"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold text-text-primary">Run settings</h2>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            
            {/* Active Model Card — Google AI Studio style */}
            <div 
              onClick={() => {
                setLastNormalWidth(panelWidth);
                if (panelWidth < 450) {
                  setPanelWidth(450);
                }
                setShowModelSelection(true);
              }}
              className="mx-4 mt-4 p-4 rounded-2xl border border-border-light bg-surface-secondary hover:bg-surface-hover hover:border-border-medium hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] cursor-pointer transition-all duration-200 ease-in-out group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedIcon && React.isValidElement(selectedIcon) && (
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-primary p-0.5 border border-border-light">
                      {selectedIcon}
                    </div>
                  )}
                  <span className="text-xs font-bold text-text-primary group-hover:text-blue-500 transition-colors truncate">
                    {selectedDisplayValue}
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-text-tertiary group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
              <p className="text-[10px] text-text-tertiary font-mono mb-2 truncate">{selectedValues.model}</p>
              <p className="text-xs text-text-secondary leading-relaxed mb-3 line-clamp-3">
                {modelInfo.description}
              </p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10px] text-text-secondary border-t border-border-light/50 pt-2.5">
                {modelInfo.contextWindow && (
                  <div>
                    <span className="font-semibold block text-text-tertiary">Context size</span>
                    <span className="text-text-primary font-medium">{modelInfo.contextWindow}</span>
                  </div>
                )}
                {modelInfo.knowledgeCutoff && (
                  <div>
                    <span className="font-semibold block text-text-tertiary">Knowledge cutoff</span>
                    <span className="text-text-primary font-medium">{modelInfo.knowledgeCutoff}</span>
                  </div>
                )}
              </div>
            </div>

            {/* System Instructions — Card style leading to wide editor */}
            <div 
              onClick={() => {
                setLastNormalWidth(panelWidth);
                if (panelWidth < 480) {
                  setPanelWidth(480);
                }
                setShowSystemInstructions(true);
              }}
              className="mx-4 mt-4 p-4 rounded-2xl border border-border-light bg-surface-secondary hover:bg-surface-hover hover:border-border-medium hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] cursor-pointer transition-all duration-200 ease-in-out group"
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-text-primary uppercase tracking-wider cursor-pointer">System instructions</label>
                <ChevronRight className="h-3.5 w-3.5 text-text-tertiary group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                {systemText || "Optional tone and style instructions for the model"}
              </p>
            </div>

            {/* Dynamic Parameters — from original LibreChat */}
            <Parameters />
          </div>
        </div>
      )}
      
      <DialogManager
        keyDialogOpen={keyDialogOpen}
        onOpenChange={onOpenChange}
        endpointsConfig={endpointsConfig || {}}
        keyDialogEndpoint={keyDialogEndpoint || undefined}
      />
    </>
  );
}

export default function RunSettings() {
  const { data: startupConfig } = useGetStartupConfig();
  const [collapsed, setCollapsed] = useRecoilState(store.runSettingsCollapsed);

  // Collapsed: show a thin strip with expand button
  if (collapsed) {
    return (
      <div className="flex h-full w-10 flex-col items-center border-l border-border-light bg-surface-primary pt-3">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label="Expand settings"
          title="Expand settings"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <ModelSelectorChatProvider>
      <ModelSelectorProvider startupConfig={startupConfig}>
        <RunSettingsContent setCollapsed={setCollapsed} />
      </ModelSelectorProvider>
    </ModelSelectorChatProvider>
  );
}
