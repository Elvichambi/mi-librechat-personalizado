import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import keyBy from 'lodash/keyBy';
import { RotateCcw, Trash2 } from 'lucide-react';
import {
  excludedKeys,
  paramSettings,
  getSettingsKeys,
  getEndpointField,
  SettingDefinition,
  tConvoUpdateSchema,
} from 'librechat-data-provider';
import type { TPreset } from 'librechat-data-provider';
import { SaveAsPresetDialog } from '~/components/Endpoints';
import { useSetIndexOptions, useLocalize } from '~/hooks';
import { useGetEndpointsQuery } from '~/data-provider';
import { componentMapping } from './components';
import { useChatContext } from '~/Providers';
import { logger } from '~/utils';
import store from '~/store';

export default function Parameters() {
  const localize = useLocalize();
  const { conversation, setConversation } = useChatContext();
  const { setOption } = useSetIndexOptions();
  const storyLabUI = useRecoilValue(store.storyLabUI);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [preset, setPreset] = useState<TPreset | null>(null);

  const { data: endpointsConfig = {} } = useGetEndpointsQuery();
  const provider = conversation?.endpoint ?? '';
  const model = conversation?.model ?? '';

  const bedrockRegions = useMemo(() => {
    return endpointsConfig?.[conversation?.endpoint ?? '']?.availableRegions ?? [];
  }, [endpointsConfig, conversation?.endpoint]);

  const endpointType = useMemo(
    () => getEndpointField(endpointsConfig, conversation?.endpoint, 'type'),
    [conversation?.endpoint, endpointsConfig],
  );

  const parameters = useMemo((): SettingDefinition[] => {
    const customParams = endpointsConfig[provider]?.customParams ?? {};
    const [combinedKey, endpointKey] = getSettingsKeys(endpointType ?? provider, model);
    const overriddenEndpointKey = customParams.defaultParamsEndpoint ?? endpointKey;
    const defaultParams = paramSettings[combinedKey] ?? paramSettings[overriddenEndpointKey] ?? [];
    const overriddenParams = endpointsConfig[provider]?.customParams?.paramDefinitions ?? [];
    const overriddenParamsMap = keyBy(overriddenParams, 'key');
    return defaultParams
      .filter((param) => param != null)
      .map((param) => (overriddenParamsMap[param.key] as SettingDefinition) ?? param);
  }, [endpointType, endpointsConfig, model, provider]);

  useEffect(() => {
    if (!parameters) {
      return;
    }

    // const defaultValueMap = new Map();
    // const paramKeys = new Set(
    //   parameters.map((setting) => {
    //     if (setting.default != null) {
    //       defaultValueMap.set(setting.key, setting.default);
    //     }
    //     return setting.key;
    //   }),
    // );
    const paramKeys = new Set(
      parameters.filter((setting) => setting != null).map((setting) => setting.key),
    );
    setConversation((prev) => {
      if (!prev) {
        return prev;
      }

      const updatedConversation = { ...prev };

      const conversationKeys = Object.keys(updatedConversation);
      const updatedKeys: string[] = [];
      conversationKeys.forEach((key) => {
        // const defaultValue = defaultValueMap.get(key);
        // if (paramKeys.has(key) && defaultValue != null && prev[key] != null) {
        //   updatedKeys.push(key);
        //   updatedConversation[key] = defaultValue;
        //   return;
        // }

        if (paramKeys.has(key)) {
          return;
        }

        if (excludedKeys.has(key)) {
          return;
        }

        if (prev[key] != null) {
          updatedKeys.push(key);
          delete updatedConversation[key];
        }
      });

      logger.log('parameters', 'parameters effect, updated keys:', updatedKeys);

      return updatedConversation;
    });
  }, [parameters, setConversation]);

  const resetParameters = useCallback(() => {
    setConversation((prev) => {
      if (!prev) {
        return prev;
      }

      const updatedConversation = { ...prev };
      const resetKeys: string[] = [];

      Object.keys(updatedConversation).forEach((key) => {
        if (excludedKeys.has(key)) {
          return;
        }

        if (updatedConversation[key] !== undefined) {
          resetKeys.push(key);
          delete updatedConversation[key];
        }
      });

      logger.log('parameters', 'parameters reset, affected keys:', resetKeys);
      return updatedConversation;
    });
  }, [setConversation]);

  const extractParamValues = useCallback((
    convo: any,
    defs: SettingDefinition[]
  ): Record<string, unknown> => {
    const extracted: Record<string, unknown> = {};
    if (!convo || !defs) {
      return extracted;
    }
    defs.forEach((param) => {
      if (param && param.key && convo[param.key] !== undefined) {
        extracted[param.key] = convo[param.key];
      }
    });
    return extracted;
  }, []);

  const [savedConfigs, setSavedConfigs] = useState<Array<{ id: string; name: string; params: Record<string, any> }>>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  const configKey = useMemo(() => `storylab_configs:${provider}:${model}`, [provider, model]);

  useEffect(() => {
    if (!provider || !model) {
      setSavedConfigs([]);
      setSelectedConfigId('');
      return;
    }
    try {
      const saved = localStorage.getItem(configKey);
      setSavedConfigs(saved ? JSON.parse(saved) : []);
      setSelectedConfigId('');
    } catch {
      setSavedConfigs([]);
      setSelectedConfigId('');
    }
  }, [configKey, provider, model]);

  const handleSaveConfig = useCallback(() => {
    setShowSaveInput(prev => !prev);
    setPresetNameInput('');
  }, []);

  const handleConfirmSaveConfig = useCallback(() => {
    if (!conversation || !parameters) return;
    
    const cleanName = presetNameInput.trim();
    const configName = cleanName || `Configuración ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    const currentParams = extractParamValues(conversation, parameters);
    
    const newConfig = {
      id: Date.now().toString(),
      name: configName,
      params: currentParams,
    };
    
    const updated = [...savedConfigs, newConfig];
    setSavedConfigs(updated);
    localStorage.setItem(configKey, JSON.stringify(updated));
    setSelectedConfigId(newConfig.id);
    setShowSaveInput(false);
    setPresetNameInput('');
  }, [conversation, parameters, savedConfigs, configKey, extractParamValues, presetNameInput]);

  const handleLoadConfig = useCallback((id: string) => {
    setSelectedConfigId(id);
    if (!id) {
      resetParameters();
      return;
    }
    const found = savedConfigs.find(cfg => cfg.id === id);
    if (found) {
      setConversation((prev) => {
        if (!prev) return prev;
        const cleanConvo = { ...prev };
        parameters.forEach((p) => {
          if (p && p.key) {
            delete cleanConvo[p.key];
          }
        });
        return { ...cleanConvo, ...found.params };
      });
    }
  }, [savedConfigs, resetParameters, setConversation, parameters]);

  const handleDeleteConfig = useCallback(() => {
    if (!selectedConfigId) return;
    const updated = savedConfigs.filter(cfg => cfg.id !== selectedConfigId);
    setSavedConfigs(updated);
    localStorage.setItem(configKey, JSON.stringify(updated));
    setSelectedConfigId('');
  }, [selectedConfigId, savedConfigs, configKey]);

  const openDialog = useCallback(() => {
    const newPreset = tConvoUpdateSchema.parse({
      ...conversation,
    }) as TPreset;
    setPreset(newPreset);
    setIsDialogOpen(true);
  }, [conversation]);

  if (!parameters) {
    return null;
  }

  return (
    <div className="h-auto max-w-full px-3.5 pb-4 pt-2">
      {storyLabUI && (
        <div className="flex flex-col gap-2 mb-4 pb-3 border-b border-border-light/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-grow min-w-0">
              <select
                value={selectedConfigId}
                onChange={(e) => handleLoadConfig(e.target.value)}
                className="w-full bg-surface-secondary text-text-primary text-xs rounded-lg border border-border-light px-2.5 py-1.5 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Configuraciones anteriores...</option>
                {savedConfigs.map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1.5 shrink-0 items-center">
              <button
                type="button"
                onClick={handleSaveConfig}
                className={`bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${showSaveInput ? 'bg-blue-800' : ''}`}
              >
                Guardar Parámetros
              </button>
              {selectedConfigId && (
                <button
                  type="button"
                  onClick={handleDeleteConfig}
                  className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg hover:bg-surface-hover transition-all"
                  title="Eliminar configuración"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {showSaveInput && (
            <div className="flex gap-2 items-center bg-surface-secondary p-2 rounded-lg border border-border-light animate-fade-in">
              <input
                type="text"
                placeholder="Nombre de la configuración..."
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                className="flex-grow bg-surface-primary border border-border-light text-xs rounded-lg px-2 py-1 text-text-primary focus:border-blue-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmSaveConfig();
                  if (e.key === 'Escape') { setShowSaveInput(false); setPresetNameInput(''); }
                }}
              />
              <button
                type="button"
                onClick={handleConfirmSaveConfig}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded transition-colors cursor-pointer shrink-0"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => { setShowSaveInput(false); setPresetNameInput(''); }}
                className="text-text-secondary hover:text-text-primary text-xs font-semibold px-2 py-1 cursor-pointer shrink-0"
              >
                No
              </button>
            </div>
          )}
        </div>
      )}
      <div className={storyLabUI ? "flex flex-col gap-4" : "grid grid-cols-2 gap-4"}>
        {' '}
        {/* This is the parent element containing all settings */}
        {/* Below is an example of an applied dynamic setting, each be contained by a div with the column span specified */}
        {parameters
          .filter((setting) => {
            if (!storyLabUI) {
              return true;
            }
            return (
              setting.key !== 'promptPrefix' &&
              setting.key !== 'chatGptLabel' &&
              setting.key !== 'modelLabel' &&
              setting.key !== 'system'
            );
          })
          .map((setting) => {
            const Component = componentMapping[setting.component];
            if (!Component) {
              return null;
            }
            const { key, default: defaultValue, ...rest } = setting;

            if (key === 'region' && bedrockRegions.length) {
              rest.options = bedrockRegions;
            }

            if (storyLabUI) {
              return (
                <div 
                  key={key} 
                  className="pb-4.5 border-b border-[#ffffff0a] last:border-b-0"
                >
                  <Component
                    settingKey={key}
                    defaultValue={defaultValue}
                    {...rest}
                    setOption={setOption}
                    conversation={conversation}
                  />
                </div>
              );
            }

            return (
              <Component
                key={key}
                settingKey={key}
                defaultValue={defaultValue}
                {...rest}
                setOption={setOption}
                conversation={conversation}
              />
            );
          })}
      </div>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={resetParameters}
          className="btn btn-neutral flex w-full items-center justify-center gap-2 px-4 py-2 text-sm"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {localize('com_ui_reset_var', { 0: localize('com_ui_model_parameters') })}
        </button>
      </div>
      <div className="mt-2 flex justify-center">
        <button
          onClick={openDialog}
          className="btn btn-primary focus:shadow-outline flex w-full items-center justify-center px-4 py-2 font-semibold text-white hover:bg-green-600 focus:border-green-500"
          type="button"
        >
          {localize('com_endpoint_save_as_preset')}
        </button>
      </div>
      {preset && (
        <SaveAsPresetDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} preset={preset} />
      )}
    </div>
  );
}
