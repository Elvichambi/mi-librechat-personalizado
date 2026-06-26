import React, { useState, useMemo, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { ChevronLeft, ChevronRight, Search, Star, Key, CheckCircle, HelpCircle, Trash2, ChevronDown, ChevronUp, List, ArrowLeft, Save, Plus, Folder, FolderPlus, Pencil } from 'lucide-react';
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
  /** Compact render used on the Favoritos tab — small row, no description / context / cutoff. */
  compact?: boolean;
}

function ModelCard({ modelId, endpoint, isSelected, onSelect, favoriteClick, isFavorite, compact = false }: ModelCardProps) {
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

  if (compact) {
    return (
      <div
        onClick={onSelect}
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-all duration-150 cursor-pointer ${
          isSelected
            ? 'border-blue-500 bg-blue-500/5'
            : 'border-border-light bg-surface-secondary hover:bg-surface-hover hover:border-border-medium'
        }`}
      >
        {endpoint.icon && React.isValidElement(endpoint.icon) && (
          <div className="h-5 w-5 shrink-0 flex items-center justify-center overflow-hidden rounded-full">
            {endpoint.icon}
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[13px] font-medium text-text-primary truncate">{modelId}</span>
          <span className="text-[10px] text-text-tertiary font-mono truncate">{endpoint.value}</span>
        </div>
        {isSelected && (
          <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        )}
        {requiresKey && (
          <button
            onClick={handleKeyBadgeClick}
            className={`flex items-center justify-center h-5 w-5 rounded text-[9px] font-bold border transition-colors shrink-0 ${
              hasKey
                ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
            title={hasKey ? 'API key set' : 'Set API key'}
          >
            <Key className="h-2.5 w-2.5" />
          </button>
        )}
        <button
          onClick={favoriteClick}
          className={`p-1 rounded shrink-0 hover:bg-surface-hover transition-colors ${
            isFavorite ? 'text-amber-500' : 'text-text-tertiary hover:text-text-secondary'
          }`}
          title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    );
  }

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
  const [selectedTab, setSelectedTab] = useState(() => {
    return localStorage.getItem('storylab:selected-model-tab') || 'all';
  });
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
        const isFavorite = isFavoriteModel(modelId, ep.value);
        
        if (selectedTab === 'favorites') {
          if (!isFavorite) {
            return;
          }
        } else if (selectedTab !== 'all' && selectedTab !== ep.value) {
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

        list.push({ modelId, endpoint: ep, isSelected, isFavorite });
      });
    });

    return list;
  }, [mappedEndpoints, selectedTab, searchQuery, selectedValues, isFavoriteModel]);

  return (
    <div 
      className={`flex h-full flex-shrink-0 flex-col border-l border-border-light bg-surface-primary z-[9999] fixed right-0 top-0 shadow-2xl ${
        isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
      style={{
        width: panelWidth,
        transition: isResizing ? 'none' : 'width 0.15s ease',
        zIndex: 9999,
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
          onClick={() => {
            setSelectedTab('all');
            localStorage.setItem('storylab:selected-model-tab', 'all');
          }}
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 border ${
            selectedTab === 'all'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-surface-secondary text-text-secondary border-border-light hover:bg-surface-hover hover:text-text-primary'
          }`}
        >
          All
        </button>
        <button
          onClick={() => {
            setSelectedTab('favorites');
            localStorage.setItem('storylab:selected-model-tab', 'favorites');
          }}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 border ${
            selectedTab === 'favorites'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-surface-secondary text-text-secondary border-border-light hover:bg-surface-hover hover:text-text-primary'
          }`}
        >
          <Star className="h-3 w-3 shrink-0 fill-current text-amber-500" />
          <span>Favoritos</span>
        </button>
        {mappedEndpoints?.map((ep) => (
          <button
            key={ep.value}
            onClick={() => {
              setSelectedTab(ep.value);
              localStorage.setItem('storylab:selected-model-tab', ep.value);
            }}
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
              compact={selectedTab === 'favorites'}
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

interface InstructionTemplate {
  id: string;
  title: string;
  description: string;
  text: string;
  category?: string;
}

const defaultTemplates: InstructionTemplate[] = [
  {
    id: 'default-general',
    title: 'General Assistant',
    description: 'Default multipurpose assistant for general queries',
    text: 'You are a helpful, polite, and honest assistant. Provide clear, accurate, and concise answers.'
  },
  {
    id: 'creative-writer',
    title: 'Creative Writer',
    description: 'Specialized in storytelling, content creation, and copywriting',
    text: 'You are a professional creative writer and editor. Your style is engaging, descriptive, and rich. Focus on creating high-quality prose, brainstorm vivid ideas, and maintain a compelling narrative flow.'
  },
  {
    id: 'expert-coder',
    title: 'Expert Coder',
    description: 'Expert in writing clean, optimized, and documented code',
    text: 'You are an expert senior software engineer. Focus on writing clean, robust, and optimized code following industry best practices. Provide explanations for architectural choices, avoid placeholders, and ensure code is fully functional.'
  }
];

function SystemInstructionsSidebar({ onClose, panelWidth, isResizing, handleResizeStart, isClosing = false }: SelectionSidebarProps) {
  const { conversation } = useChatContext();
  const { setOption } = useSetIndexOptions();

  // State controls for views
  const [showListView, setShowListView] = useState(false);
  const [showSaveMetadata, setShowSaveMetadata] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [tempCategory, setTempCategory] = useState('');
  const [tempCategorySelect, setTempCategorySelect] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  // Ref for dropdown positioning (fixed position to avoid clipping by parent overflow)
  const dropdownAreaRef = React.useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{top: number; left: number; width: number} | null>(null);

  useEffect(() => {
    if (isDropdownOpen && dropdownAreaRef.current) {
      const rect = dropdownAreaRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    } else {
      setDropdownPos(null);
    }
  }, [isDropdownOpen]);

  // Load instructions list from localStorage
  const [instructions, setInstructions] = useState<InstructionTemplate[]>(() => {
    const saved = localStorage.getItem('storylab:system-instructions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => ({
            id: item.id || String(Date.now()),
            title: item.title || 'Untitled Prompt',
            description: item.description || '',
            text: item.text || '',
            category: item.category
          }));
        }
      } catch {
        // Fail-safe
      }
    }
    return defaultTemplates;
  });


  const recentTemplates = useMemo(() => {
    return instructions.slice(0, 4);
  }, [instructions]);

  const handleMoveToFolder = (id: string, folderName: string) => {
    const updated = instructions.map(item => {
      if (item.id === id) {
        return {
          ...item,
          category: folderName === 'Sin clasificar' ? undefined : folderName
        };
      }
      return item;
    });
    setInstructions(updated);
    localStorage.setItem('storylab:system-instructions', JSON.stringify(updated));
  };

  const toggleFolderCollapse = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const [emptyFolders, setEmptyFolders] = useState<string[]>(() => {
    const saved = localStorage.getItem('storylab:empty-folders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fail-safe
      }
    }
    return [];
  });

  const allFolders = useMemo(() => {
    const cats = new Set<string>();
    instructions.forEach(item => {
      if (item.category && item.category.trim() !== '') {
        cats.add(item.category.trim());
      }
    });
    emptyFolders.forEach(folder => {
      if (folder && folder.trim() !== '') {
        cats.add(folder.trim());
      }
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [instructions, emptyFolders]);

  const handleConfirmCreateFolder = () => {
    const cleanName = newFolderNameInput.trim();
    if (!cleanName) return;
    if (cleanName.toLowerCase() === 'recientes' || cleanName.toLowerCase() === 'sin clasificar') {
      window.alert('Este nombre de carpeta está reservado.');
      return;
    }
    if (allFolders.includes(cleanName)) {
      window.alert('La carpeta ya existe.');
      return;
    }
    const updated = [...emptyFolders, cleanName];
    setEmptyFolders(updated);
    localStorage.setItem('storylab:empty-folders', JSON.stringify(updated));
    setShowNewFolderInput(false);
    setNewFolderNameInput('');
  };

  const handleConfirmRenameFolder = (oldName: string) => {
    const cleanName = renameFolderValue.trim();
    if (!cleanName || cleanName === oldName) {
      setRenamingFolder(null);
      return;
    }

    if (cleanName.toLowerCase() === 'recientes' || cleanName.toLowerCase() === 'sin clasificar') {
      window.alert('Este nombre de carpeta está reservado.');
      return;
    }

    if (allFolders.includes(cleanName) && cleanName !== oldName) {
      window.alert('Ya existe una carpeta con ese nombre.');
      return;
    }

    // Update in emptyFolders if it was there
    let updatedEmpty = [...emptyFolders];
    if (updatedEmpty.includes(oldName)) {
      updatedEmpty = updatedEmpty.map(f => f === oldName ? cleanName : f);
      setEmptyFolders(updatedEmpty);
      localStorage.setItem('storylab:empty-folders', JSON.stringify(updatedEmpty));
    }

    // Update the templates themselves
    const updatedInstructions = instructions.map(item => {
      if (item.category === oldName) {
        return { ...item, category: cleanName };
      }
      return item;
    });
    setInstructions(updatedInstructions);
    localStorage.setItem('storylab:system-instructions', JSON.stringify(updatedInstructions));
    setRenamingFolder(null);
  };

  const handleDeleteFolder = (folderName: string) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la carpeta "${folderName}"?\n\nLos prompts dentro de ella no se borrarán, sino que se moverán a "Sin clasificar".`
    );
    if (!confirmDelete) return;

    // Remove from emptyFolders
    const updatedEmpty = emptyFolders.filter(f => f !== folderName);
    setEmptyFolders(updatedEmpty);
    localStorage.setItem('storylab:empty-folders', JSON.stringify(updatedEmpty));

    // Update templates (remove category)
    const updatedInstructions = instructions.map(item => {
      if (item.category === folderName) {
        return { ...item, category: undefined };
      }
      return item;
    });
    setInstructions(updatedInstructions);
    localStorage.setItem('storylab:system-instructions', JSON.stringify(updatedInstructions));
  };


  const {
    promptPrefix = '',
    system = '',
  } = conversation || {};

  const systemText = promptPrefix || system || '';

  // Active selected ID in templates dropdown (initializes as 'empty' so it starts empty/blank by default)
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (!systemText) {
      return 'empty';
    }
    const found = instructions.find(item => item.text === systemText);
    return found ? found.id : 'custom';
  });

  // Local draft inputs
  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [tempText, setTempText] = useState('');

  // Ref to track whether the title was typed by the user (vs set programmatically)
  const userEditedTitleRef = React.useRef(false);

  // Sync inputs when selectedId changes or instructions load
  // AND sync the prompt to the active conversation so the chat actually uses it
  useEffect(() => {
    userEditedTitleRef.current = false; // Reset on programmatic changes
    if (selectedId === 'custom') {
      setTempTitle('Custom Instructions');
      setTempDescription('');
      setTempText(systemText);
      setTempCategory('');
      setTempCategorySelect('');
      // systemText is already the active prompt, no need to re-sync
    } else if (selectedId === 'create-new' || selectedId === 'empty') {
      setTempTitle('');
      setTempDescription('');
      setTempText('');
      setTempCategory('');
      setTempCategorySelect('');
      // Clear prompt from active conversation
      setOption('promptPrefix')('');
      setOption('system')('');
    } else {
      const found = instructions.find(item => item.id === selectedId);
      if (found) {
        setTempTitle(found.title);
        setTempDescription(found.description || '');
        setTempText(found.text);
        setTempCategory(found.category || '');
        setTempCategorySelect(found.category || '');
        // Apply selected template to the active conversation
        setOption('promptPrefix')(found.text);
        setOption('system')(found.text);
      }
    }
  }, [selectedId, instructions]);

  // Auto-save preset to localStorage when the USER manually types a title and there is prompt text
  // Uses a debounce so it doesn't fire on every keystroke
  // Only triggers when userEditedTitleRef is true (user typed it, not set by useEffect)
  useEffect(() => {
    if (!userEditedTitleRef.current) {
      return; // Skip if title was set programmatically (e.g. selecting a template)
    }
    if (!tempTitle.trim() || !tempText.trim()) {
      return; // Don't auto-save if title or text is empty
    }
    const debounceTimer = setTimeout(() => {
      let updatedList: InstructionTemplate[];
      let newId = selectedId;
      const categoryVal = tempCategory.trim();

      if (selectedId === 'custom' || selectedId === 'create-new' || selectedId === 'empty') {
        newId = String(Date.now());
        const newPreset: InstructionTemplate = {
          id: newId,
          title: tempTitle.trim(),
          description: tempDescription.trim(),
          text: tempText,
          category: categoryVal || undefined
        };
        updatedList = [newPreset, ...instructions];
      } else {
        updatedList = instructions.map(item => {
          if (item.id === selectedId) {
            return {
              ...item,
              title: tempTitle.trim(),
              description: tempDescription.trim(),
              text: tempText,
              category: categoryVal || undefined
            };
          }
          return item;
        });
      }

      setInstructions(updatedList);
      localStorage.setItem('storylab:system-instructions', JSON.stringify(updatedList));
      setSelectedId(newId);
      userEditedTitleRef.current = false; // Reset after save
    }, 800); // 800ms debounce

    return () => clearTimeout(debounceTimer);
  }, [tempTitle]);

  const handleCreateNew = () => {
    setSelectedId('create-new');
    setTempTitle('');
    setTempDescription('');
    setTempText('');
    setTempCategory('');
    setTempCategorySelect('');
    setOption('promptPrefix')('');
    setOption('system')('');
    setShowListView(false);
  };

  // Delete with confirmation - opens the confirm dialog
  const handleRequestDelete = (idToDelete?: string) => {
    const targetId = idToDelete || selectedId;
    if (targetId === 'custom' || targetId === 'create-new' || targetId === 'empty') {
      // For drafts, just clear directly (no saved data to lose)
      setTempTitle('');
      setTempDescription('');
      setTempText('');
      setOption('promptPrefix')('');
      setOption('system')('');
      setSelectedId('empty');
      return;
    }
    setConfirmDeleteId(targetId);
  };

  // Actually perform the delete after confirmation
  const handleConfirmDelete = () => {
    if (!confirmDeleteId) return;

    let updated: InstructionTemplate[];
    if (instructions.length <= 1) {
      updated = [{ id: 'default-general', title: 'General Assistant', description: 'Default multipurpose assistant', text: 'You are a helpful assistant.' }];
    } else {
      updated = instructions.filter(item => item.id !== confirmDeleteId);
    }
    setInstructions(updated);
    localStorage.setItem('storylab:system-instructions', JSON.stringify(updated));

    // If we deleted the currently active one, reset to empty
    if (selectedId === confirmDeleteId) {
      setSelectedId('empty');
      setTempTitle('');
      setTempDescription('');
      setTempText('');
      setOption('promptPrefix')('');
      setOption('system')('');
    }
    setConfirmDeleteId(null);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    userEditedTitleRef.current = true; // Mark as user-typed
    setTempTitle(e.target.value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempDescription(e.target.value);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTempText(val);
    // Sync in real time with LibreChat active conversation so user can test immediately
    setOption('promptPrefix')(val);
    setOption('system')(val);
  };

  const handleSavePreset = () => {
    if (!tempTitle.trim()) {
      alert('Por favor, ingresa un título para guardar esta plantilla.');
      return;
    }

    let updatedList: InstructionTemplate[];
    let newId = selectedId;
    const categoryVal = tempCategory.trim();

    if (selectedId === 'custom' || selectedId === 'create-new' || selectedId === 'empty') {
      newId = String(Date.now());
      const newPreset: InstructionTemplate = {
        id: newId,
        title: tempTitle.trim(),
        description: tempDescription.trim(),
        text: tempText,
        category: categoryVal || undefined
      };
      updatedList = [newPreset, ...instructions];
    } else {
      updatedList = instructions.map(item => {
        if (item.id === selectedId) {
          return {
            ...item,
            title: tempTitle.trim(),
            description: tempDescription.trim(),
            text: tempText,
            category: categoryVal || undefined
          };
        }
        return item;
      });
    }

    setInstructions(updatedList);
    localStorage.setItem('storylab:system-instructions', JSON.stringify(updatedList));
    setSelectedId(newId);
    setShowSaveMetadata(false);
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredInstructions = useMemo(() => {
    if (!searchQuery) {
      return instructions;
    }
    const q = searchQuery.toLowerCase();
    return instructions.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.text.toLowerCase().includes(q)
    );
  }, [instructions, searchQuery]);

  const renderTemplateCard = (item: InstructionTemplate) => {
    const isExpanded = !!expandedIds[item.id];
    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', item.id);
        }}
        className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing select-none ${
          selectedId === item.id
            ? 'border-border-medium bg-surface-hover shadow-sm'
            : 'border-border-light bg-surface-secondary hover:bg-surface-hover hover:border-border-medium'
        }`}
        onClick={() => {
          setSelectedId(item.id);
          setShowListView(false);
        }}
      >
        <div className="flex items-center justify-between w-full">
          <span className="font-bold text-xs text-text-primary">{item.title || 'Untitled Prompt'}</span>
          <div className="flex items-center gap-1.5">
            {item.text && (
              <span
                onClick={(e) => toggleExpand(e, item.id)}
                className="text-xs text-text-secondary hover:text-text-primary shrink-0 font-semibold px-2 py-0.5 rounded bg-surface-tertiary/50 hover:bg-surface-tertiary select-none flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>{isExpanded ? 'Ocultar' : 'Mostrar'}</span>
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRequestDelete(item.id);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 cursor-pointer"
              aria-label={`Delete ${item.title}`}
              title="Eliminar plantilla"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {selectedId === item.id && (
              <CheckCircle className="h-4 w-4 text-text-secondary shrink-0" />
            )}
          </div>
        </div>
        {item.description && (
          <span className="text-[10px] text-text-secondary leading-relaxed line-clamp-2">{item.description}</span>
        )}
        {isExpanded && item.text && (
          <pre className="text-xs font-sans text-text-primary dark:text-neutral-100 whitespace-pre-wrap break-all bg-surface-primary/75 p-3.5 rounded-xl border border-border-light/50 border-l-4 border-l-border-medium mt-1 max-h-36 overflow-y-auto w-full leading-relaxed select-text cursor-text">
            {item.text}
          </pre>
        )}
      </div>
    );
  };

  const renderDropdownItem = (item: InstructionTemplate) => {
    const isSelected = selectedId === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setSelectedId(item.id);
          setIsDropdownOpen(false);
        }}
        className={`w-full text-left px-3.5 py-2 text-[14px] transition-colors truncate rounded-md shrink-0 ${
          isSelected 
            ? 'bg-white/[0.16] text-white font-semibold' 
            : 'text-[#ccc] hover:text-white hover:bg-white/[0.08] font-normal'
        }`}
      >
        {item.title || 'Untitled'}
      </button>
    );
  };

  return (
    <div 
      className={`flex h-full flex-shrink-0 flex-col border-l border-border-light bg-surface-primary dark:bg-[#131314] z-[9999] fixed right-0 top-0 shadow-2xl ${
        isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
      style={{
        width: panelWidth,
        transition: isResizing ? 'none' : 'width 0.15s ease',
        zIndex: 9999,
      }}
    >
      {/* Resizable handle */}
      <div
        role="separator"
        aria-label="Resize sidebar"
        className="absolute left-0 top-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors"
        onMouseDown={handleResizeStart}
      />

      {/* VIEW A: Premium List View */}
      {showListView ? (
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border-light px-4 py-3.5">
            <button
              onClick={() => setShowListView(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all shrink-0"
              aria-label="Back to instructions editor"
              title="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider truncate">Seleccionar Plantilla de Prompt</h2>
          </div>

          {/* Search box and folder creation */}
          <div className="px-4 pt-3 pb-1.5 shrink-0 flex gap-2 items-center">
            <div className="relative flex-grow flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="Buscar prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border-light bg-surface-secondary text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setShowNewFolderInput(!showNewFolderInput);
                if (!showNewFolderInput) setNewFolderNameInput('');
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border border-border-light text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all shrink-0 cursor-pointer ${showNewFolderInput ? 'bg-surface-hover text-text-primary' : ''}`}
              title="Nueva carpeta"
            >
              <FolderPlus className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Inline Folder Creation Form */}
          {showNewFolderInput && (
            <div className="mx-4 mt-2 px-3.5 py-2 flex gap-2 items-center bg-surface-secondary border border-border-light rounded-xl animate-fade-in shrink-0">
              <input
                type="text"
                placeholder="Nombre de la carpeta..."
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                className="flex-grow bg-surface-primary border border-border-light text-xs rounded-lg px-2.5 py-1 text-text-primary focus:border-blue-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmCreateFolder();
                  if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderNameInput(''); }
                }}
              />
              <button
                type="button"
                onClick={handleConfirmCreateFolder}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => { setShowNewFolderInput(false); setNewFolderNameInput(''); }}
                className="text-text-secondary hover:text-text-primary text-xs font-semibold px-2 py-1.5 cursor-pointer shrink-0"
              >
                No
              </button>
            </div>
          )}

          {/* Scrollable Templates List */}
          <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
            {filteredInstructions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-text-tertiary">
                <HelpCircle className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-xs">No se encontraron plantillas coincidentes</p>
              </div>
            ) : searchQuery ? (
              // Search active: render flat list
              filteredInstructions.map(item => renderTemplateCard(item))
            ) : (
              // Grouped by folders view
              <div className="flex flex-col gap-4">
                {/* Recientes Folder */}
                {recentTemplates.length > 0 && (() => {
                  const isCollapsed = collapsedFolders['Recientes'] !== undefined ? collapsedFolders['Recientes'] : false;
                  return (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleFolderCollapse('Recientes')}
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-border-light bg-surface-secondary hover:bg-surface-hover text-text-primary hover:border-border-medium transition-all select-none text-left"
                      >
                        {!isCollapsed ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <Star className="h-4 w-4 text-amber-500 fill-current shrink-0" />
                        <span className="flex-grow">Recientes</span>
                        <span className="text-[11px] font-bold text-text-secondary bg-white/10 dark:bg-white/[0.08] px-2.5 py-0.5 rounded-full border border-white/5">{recentTemplates.length}</span>
                      </button>
                      {!isCollapsed && (
                        <div className="flex flex-col gap-2 pl-3 mt-1 border-l border-border-light/30 ml-3.5">
                          {recentTemplates.map(item => renderTemplateCard(item))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Sin clasificar Folder */}
                {(() => {
                  const uncategorized = instructions.filter(item => !item.category || item.category.trim() === '');
                  if (uncategorized.length === 0 && allFolders.length === 0) return null;
                  const isCollapsed = collapsedFolders['Sin clasificar'] !== undefined ? collapsedFolders['Sin clasificar'] : true;
                  return (
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-500/10'); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('bg-blue-500/10'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('bg-blue-500/10');
                        const id = e.dataTransfer.getData('text/plain');
                        if (id) handleMoveToFolder(id, 'Sin clasificar');
                      }}
                      className="flex flex-col gap-2 rounded-lg transition-all"
                    >
                      <button
                        onClick={() => toggleFolderCollapse('Sin clasificar')}
                        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-border-light bg-surface-secondary hover:bg-surface-hover text-text-primary hover:border-border-medium transition-all select-none text-left"
                      >
                        {!isCollapsed ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <Folder className="h-4 w-4 text-text-secondary shrink-0" />
                        <span className="flex-grow">Sin clasificar</span>
                        <span className="text-[11px] font-bold text-text-secondary bg-white/10 dark:bg-white/[0.08] px-2.5 py-0.5 rounded-full border border-white/5">{uncategorized.length}</span>
                      </button>
                      {!isCollapsed && (
                        <div className="flex flex-col gap-2 pl-3 mt-1 border-l border-border-light/30 ml-3.5">
                          {uncategorized.length === 0 ? (
                            <div className="text-[11px] text-text-tertiary italic py-1 pl-2">
                              Carpeta vacía
                            </div>
                          ) : (
                            uncategorized.map(item => renderTemplateCard(item))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* User Folders */}
                {allFolders.map(cat => {
                  const catItems = instructions.filter(item => item.category && item.category.trim() === cat);
                  const isCollapsed = collapsedFolders[cat] !== undefined ? collapsedFolders[cat] : true;
                  return (
                    <div
                      key={cat}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-500/10'); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('bg-blue-500/10'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('bg-blue-500/10');
                        const id = e.dataTransfer.getData('text/plain');
                        if (id) handleMoveToFolder(id, cat);
                      }}
                      className="flex flex-col gap-2 rounded-lg transition-all"
                    >
                      <div className="w-full flex items-center justify-between group px-3.5 py-2.5 rounded-xl border border-border-light bg-surface-secondary hover:bg-surface-hover hover:border-border-medium transition-all">
                        {renamingFolder === cat ? (
                          <div className="flex w-full gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={renameFolderValue}
                              onChange={(e) => setRenameFolderValue(e.target.value)}
                              className="flex-grow bg-surface-primary border border-border-light text-xs rounded-lg px-2 py-1 text-text-primary focus:border-blue-500 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmRenameFolder(cat);
                                if (e.key === 'Escape') setRenamingFolder(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleConfirmRenameFolder(cat)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer shrink-0"
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingFolder(null)}
                              className="text-text-secondary hover:text-text-primary text-[11px] font-semibold px-1.5 py-1 cursor-pointer shrink-0"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleFolderCollapse(cat)}
                              className="flex items-center gap-2 text-xs font-bold text-text-primary select-none flex-grow text-left"
                            >
                              {!isCollapsed ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                              <Folder className="h-4 w-4 text-blue-500 shrink-0" />
                              <span className="truncate flex-grow">{cat}</span>
                              <span className="text-[11px] font-bold text-text-secondary bg-white/10 dark:bg-white/[0.08] px-2.5 py-0.5 rounded-full border border-white/5">{catItems.length}</span>
                            </button>
                            
                            {/* Hover action buttons for Custom Folders */}
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 items-center transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingFolder(cat);
                                  setRenameFolderValue(cat);
                                }}
                                className="p-1 hover:text-text-primary text-text-tertiary rounded transition-colors cursor-pointer"
                                title="Editar nombre"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(cat);
                                }}
                                className="p-1 hover:text-red-500 text-text-tertiary rounded transition-colors cursor-pointer"
                                title="Eliminar carpeta"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {!isCollapsed && (
                        <div className="flex flex-col gap-2 pl-3 mt-1 border-l border-border-light/30 ml-3.5">
                          {catItems.length === 0 ? (
                            <div className="text-[11px] text-text-tertiary italic py-1 pl-2">
                              Carpeta vacía (arrastra prompts aquí)
                            </div>
                          ) : (
                            catItems.map(item => renderTemplateCard(item))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>)}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-border-light bg-surface-secondary">
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-surface-tertiary text-text-primary hover:bg-surface-hover transition-all text-center border border-border-light"
            >
              + Crear nueva instrucción
            </button>
          </div>
        </div>
      ) : (
        /* VIEW B: Cozy instructions textarea editor view */
        <div className="flex flex-col h-full min-h-0 relative">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light px-4 py-3.5">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Instrucciones del sistema</h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              aria-label="Close"
              title="Cerrar instrucciones"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-grow px-4 py-3 flex flex-col gap-3 min-h-0">
            {/* Custom Dropdown Selector & List Button — AI Studio style */}
            <div ref={dropdownAreaRef}>
              <div className="flex gap-2">
                <div className="flex-grow min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full pl-4 pr-10 py-2 text-[14px] font-normal text-left rounded-full border border-[#444] bg-transparent text-text-primary focus:outline-none flex items-center cursor-pointer transition-all hover:bg-white/[0.04] relative"
                  >
                    <span className="truncate flex-grow">
                      {selectedId === 'empty' || selectedId === 'create-new'
                        ? '+ Crear nueva instrucción'
                        : selectedId === 'custom'
                        ? 'Instrucciones personalizadas'
                        : instructions.find(item => item.id === selectedId)?.title || 'Instrucción sin título'}
                    </span>
                    <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* List View Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowListView(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#444] bg-transparent text-text-secondary hover:bg-white/[0.04] hover:text-text-primary transition-all shrink-0"
                  aria-label="View template lists with descriptions"
                  title="Ver lista con descripciones"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Dropdown popup — fixed position to avoid clipping */}
            {isDropdownOpen && dropdownPos && (
              <>
                <div className="fixed inset-0 z-[9998] bg-transparent" onClick={() => setIsDropdownOpen(false)} />
                
                <div 
                  className="fixed z-[9999] rounded-md bg-[#1e1e20] border border-[#3c4043]/50 shadow-[0_8px_30px_rgba(0,0,0,0.6)] py-1.5 flex flex-col"
                  style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                >
                  {/* Create New — always visible at top like AI Studio */}
                  <div className="px-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        handleCreateNew();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-[14px] text-text-primary hover:bg-white/[0.10] font-normal transition-colors flex items-center gap-2 rounded-md shrink-0"
                    >
                      <Plus className="h-4 w-4 text-text-tertiary shrink-0" />
                      <span>+ Crear nueva instrucción</span>
                    </button>
                  </div>

                  {/* Scrollable list with visible scrollbar */}
                  <div className="max-h-[50vh] overflow-y-auto flex flex-col px-1.5 custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.16) transparent' }}>
                    {/* Uncategorized first */}
                    {(() => {
                      const uncategorized = instructions.filter(item => !item.category || item.category.trim() === '');
                      if (uncategorized.length === 0) return null;
                      return (
                        <>
                          <div className="px-3.5 py-1 text-[10px] font-bold text-text-tertiary uppercase tracking-wider bg-black/10 select-none rounded-md">
                            Sin clasificar
                          </div>
                          {uncategorized.map(item => renderDropdownItem(item))}
                        </>
                      );
                    })()}
                    {/* Unique Categories */}
                    {allFolders.map(cat => {
                      const catItems = instructions.filter(item => item.category && item.category.trim() === cat);
                      if (catItems.length === 0) return null;
                      return (
                        <React.Fragment key={cat}>
                          <div className="px-3.5 py-1 text-[10px] font-bold text-text-tertiary uppercase tracking-wider bg-black/10 select-none rounded-md mt-1">
                            {cat}
                          </div>
                          {catItems.map(item => renderDropdownItem(item))}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Title Input & Action Row */}
            <div className="flex items-center gap-2">
              <div className="flex-grow min-w-0">
                <input
                  type="text"
                  placeholder="Title"
                  value={tempTitle}
                  onChange={handleTitleChange}
                  className="w-full px-3.5 py-1.5 text-xs font-semibold rounded-md border border-border-light bg-surface-secondary dark:bg-[#1a1a1c] text-text-primary focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/60"
                />
              </div>
              
              {/* Trash/Delete Button (with confirmation) */}
              <button
                type="button"
                onClick={() => handleRequestDelete()}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-md border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                aria-label="Delete active template"
                title="Delete active template"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* Save Button */}
              <button
                type="button"
                onClick={() => setShowSaveMetadata(true)}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/5 text-blue-500 hover:bg-blue-500/10 transition-all shrink-0"
                aria-label="Save template details"
                title="Save details"
              >
                <Save className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Cozy TextArea input space */}
            <div className="flex-grow flex flex-col gap-1.5 min-h-0">
              <textarea
                className="w-full flex-grow resize-none rounded-md border border-border-medium bg-surface-secondary dark:bg-[#131314] p-3.5 text-[15px] text-text-primary leading-relaxed focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/60"
                placeholder="Optional tone and style instructions for the model"
                value={tempText}
                onChange={handleTextChange}
                autoFocus
              />
            </div>

            {/* Bottom Footer Note */}
            <div className="text-center py-1">
              <span className="text-[10px] text-text-tertiary">Instructions are saved in local storage.</span>
            </div>
          </div>

          {/* Premium Popover slide-up card to edit Title + Description */}
          {showSaveMetadata && (
            <>
              {/* Dark backdrop overlay inside the sidebar context (without blur to prevent hardware-accelerated stacking bugs) */}
              <div 
                className="absolute inset-0 z-30 bg-black/60 animate-fade-in" 
                onClick={() => setShowSaveMetadata(false)} 
              />
              
              {/* Slide up dialog card */}
              <div className="absolute inset-x-0 bottom-0 z-50 bg-surface-primary dark:bg-[#131314] border-t border-border-light shadow-2xl p-4 flex flex-col gap-3.5 animate-slide-in-up rounded-t-xl border border-border-medium/20">
                <div className="flex items-center justify-between border-b border-border-light pb-2">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Guardar Plantilla de Instrucción</h3>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">Título de la instrucción</label>
                  <input
                    type="text"
                    placeholder="Instrucción sin título"
                    value={tempTitle}
                    onChange={handleTitleChange}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-md border border-border-light bg-surface-secondary dark:bg-[#1a1a1c] text-text-primary focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/60"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">Descripción de la instrucción</label>
                  <input
                    type="text"
                    placeholder="Breve descripción del propósito de la instrucción"
                    value={tempDescription}
                    onChange={handleDescriptionChange}
                    className="w-full px-3.5 py-2 text-xs font-semibold rounded-md border border-border-light bg-surface-secondary dark:bg-[#1a1a1c] text-text-primary focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/60"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">Categoría / Carpeta</label>
                  <div className="flex gap-2">
                    <select
                      value={tempCategorySelect}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTempCategorySelect(val);
                        if (val !== 'new') {
                          setTempCategory(val);
                        } else {
                          setTempCategory('');
                        }
                      }}
                      className="bg-surface-secondary text-text-primary text-xs rounded-md border border-border-light px-2.5 py-1.5 focus:border-white/60 focus:outline-none"
                    >
                      <option value="">Sin carpeta</option>
                      {allFolders.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="new">+ Crear nueva carpeta...</option>
                    </select>
                    {(tempCategorySelect === 'new' || tempCategorySelect === '') && (
                      <input
                        type="text"
                        placeholder="Nombre de la carpeta"
                        value={tempCategory}
                        onChange={(e) => setTempCategory(e.target.value)}
                        className="flex-grow px-3.5 py-2 text-xs font-semibold rounded-md border border-border-light bg-surface-secondary dark:bg-[#1a1a1c] text-text-primary focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/60"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveMetadata(false)}
                    className="flex-1 py-2 rounded-md text-xs font-bold border border-border-light bg-surface-secondary text-text-secondary hover:bg-surface-hover transition-all"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    className="flex-1 py-2 rounded-md text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog — rendered at sidebar level so it works in BOTH list view and editor view */}
      {confirmDeleteId && (
        <>
          <div 
            className="fixed inset-0 z-[9999] bg-black/60 animate-fade-in" 
            onClick={() => setConfirmDeleteId(null)} 
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
            <div className="bg-surface-primary rounded-2xl shadow-2xl p-6 max-w-xs w-full border border-border-medium animate-slide-in-up">
              <h3 className="text-sm font-bold text-text-primary mb-1.5">¿Eliminar instrucción del sistema?</h3>
              <p className="text-xs text-text-secondary mb-5">Esta acción no se puede deshacer.</p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-surface-hover transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-surface-tertiary text-text-primary hover:bg-surface-hover transition-all border border-border-light"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
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
                if (panelWidth < 540) {
                  setPanelWidth(540);
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

  // Collapsed: no visible bar — just a discreet chevron button pinned to the top edge.
  if (collapsed) {
    return (
      <div className="flex h-full w-7 flex-col items-center bg-transparent pt-3">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary opacity-40 transition-all hover:bg-surface-hover hover:text-text-primary hover:opacity-100"
          aria-label="Expand settings"
          title="Expand settings"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Expanded: RunSettingsContent manages its own width + drag-to-resize handle, so we
  // render it bare. Just placed at the right edge of the layout (handled by ChatView).
  return (
    <ModelSelectorChatProvider>
      <ModelSelectorProvider startupConfig={startupConfig}>
        <RunSettingsContent setCollapsed={setCollapsed} />
      </ModelSelectorProvider>
    </ModelSelectorChatProvider>
  );
}
