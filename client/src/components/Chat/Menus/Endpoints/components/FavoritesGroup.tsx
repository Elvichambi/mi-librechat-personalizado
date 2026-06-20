import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { isAgentsEndpoint } from 'librechat-data-provider';
import type { TModelSpec } from 'librechat-data-provider';
import type { Endpoint } from '~/common';
import { useModelSelectorContext } from '../ModelSelectorContext';
import { CustomMenuGroup } from '../CustomMenu';
import { ModelSpecItem } from './ModelSpecItem';
import { EndpointModelItem } from './EndpointModelItem';
import { useFavorites } from '~/hooks';

export function FavoritesGroup() {
  const { favorites } = useFavorites();
  const { modelSpecs, mappedEndpoints, selectedValues } = useModelSelectorContext();

  const specMap = useMemo(() => {
    const m = new Map<string, TModelSpec>();
    for (const spec of modelSpecs ?? []) {
      m.set(spec.name, spec);
    }
    return m;
  }, [modelSpecs]);

  const endpointMap = useMemo(() => {
    const m = new Map<string, Endpoint>();
    for (const ep of mappedEndpoints ?? []) {
      m.set(ep.value, ep);
    }
    return m;
  }, [mappedEndpoints]);

  const resolved = useMemo(() => {
    if (!favorites?.length) {
      return [];
    }

    const items: Array<
      | { type: 'spec'; spec: TModelSpec }
      | { type: 'model'; endpoint: Endpoint; modelId: string }
    > = [];

    for (const fav of favorites) {
      if (fav.spec) {
        const spec = specMap.get(fav.spec);
        if (spec) {
          items.push({ type: 'spec', spec });
        }
      } else if (fav.model && fav.endpoint) {
        const ep = endpointMap.get(fav.endpoint);
        if (ep) {
          items.push({ type: 'model', endpoint: ep, modelId: fav.model });
        }
      } else if (fav.agentId) {
        const agentsEp = Array.from(endpointMap.values()).find((ep) =>
          isAgentsEndpoint(ep.value),
        );
        if (agentsEp) {
          items.push({ type: 'model', endpoint: agentsEp, modelId: fav.agentId });
        }
      }
    }

    return items;
  }, [favorites, specMap, endpointMap]);

  if (resolved.length === 0) {
    return null;
  }

  return (
    <CustomMenuGroup
      label={
        <span className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
          Favoritos
        </span>
      }
    >
      {resolved.map((item, i) => {
        if (item.type === 'spec') {
          return (
            <ModelSpecItem
              key={`fav-spec-${item.spec.name}`}
              spec={item.spec}
              isSelected={selectedValues.modelSpec === item.spec.name}
            />
          );
        }
        return (
          <EndpointModelItem
            key={`fav-model-${item.endpoint.value}-${item.modelId}-${i}`}
            modelId={item.modelId}
            endpoint={item.endpoint}
          />
        );
      })}
    </CustomMenuGroup>
  );
}
