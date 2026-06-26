import React, { useEffect, useCallback, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { visit } from 'unist-util-visit';
import { useSetRecoilState } from 'recoil';
import { useLocation } from 'react-router-dom';
import type { Pluggable } from 'unified';
import type { Artifact } from '~/common';
import { useMessageContext, useArtifactContext } from '~/Providers';
import { logger, extractContent, isArtifactRoute } from '~/utils';
import { artifactsState } from '~/store/artifacts';
import ArtifactButton from './ArtifactButton';

export const artifactPlugin: Pluggable = () => {
  return (tree, file) => {
    /** Source markdown — used to recover the artifact's RAW content. Without this, when
     *  a model (e.g. Gemini) emits the directive WITHOUT wrapping the body in triple
     *  backticks, remark parses the body's prose into child nodes and `extractContent`
     *  later concatenates their text without separators ("HeadingTextoH2"). Reading the
     *  raw slice between `:::artifact{...}\n` and `\n:::` preserves all formatting and
     *  works for both with-backticks and without-backticks styles. */
    const source = typeof file?.value === 'string' ? file.value : null;

    visit(tree, ['textDirective', 'leafDirective', 'containerDirective'], (node, index, parent) => {
      if (node.type === 'textDirective') {
        const replacementText = `:${node.name}`;
        if (parent && Array.isArray(parent.children) && typeof index === 'number') {
          parent.children[index] = {
            type: 'text',
            value: replacementText,
          };
        }
      }
      if (node.name !== 'artifact') {
        return;
      }

      if (source && node.position?.start?.offset != null && node.position?.end?.offset != null) {
        const raw = source.slice(node.position.start.offset, node.position.end.offset);
        const match = raw.match(/^:::artifact[^\n]*\n([\s\S]*?)\n:::\s*$/);
        if (match) {
          let content = match[1];
          const fenceMatch = content.match(/^```[\w-]*\n([\s\S]*?)\n```\s*$/);
          if (fenceMatch) {
            content = fenceMatch[1];
          }
          // Replace parsed sub-tree with a single raw-text child so extractContent
          // returns the original markdown verbatim (preserving newlines).
          (node as { children?: unknown }).children = [{ type: 'text', value: content }];
        }
      }

      node.data = {
        hName: node.name,
        hProperties: node.attributes,
        ...node.data,
      };
      return node;
    });
  };
};

const defaultTitle = 'untitled';
const defaultType = 'unknown';
const defaultIdentifier = 'lc-no-identifier';

export function Artifact({
  node: _node,
  ...props
}: Artifact & {
  children: React.ReactNode | { props: { children: React.ReactNode } };
  node: unknown;
}) {
  const location = useLocation();
  const { messageId } = useMessageContext();
  const { getNextIndex, resetCounter } = useArtifactContext();
  const artifactIndex = useRef(getNextIndex(false)).current;

  const setArtifacts = useSetRecoilState(artifactsState);
  const [artifact, setArtifact] = useState<Artifact | null>(null);

  const throttledUpdateRef = useRef(
    throttle((updateFn: () => void) => {
      updateFn();
    }, 25),
  );

  const updateArtifact = useCallback(() => {
    const content = extractContent(props.children);
    logger.log('artifacts', 'updateArtifact: content.length', content.length);

    const title = props.title ?? defaultTitle;
    const type = props.type ?? defaultType;
    const identifier = props.identifier ?? defaultIdentifier;
    const artifactKey = `${identifier}_${type}_${title}_${messageId}`
      .replace(/\s+/g, '_')
      .toLowerCase();

    throttledUpdateRef.current(() => {
      const now = Date.now();
      if (artifactKey === `${defaultIdentifier}_${defaultType}_${defaultTitle}_${messageId}`) {
        return;
      }

      const currentArtifact: Artifact = {
        id: artifactKey,
        identifier,
        title,
        type,
        content,
        messageId,
        index: artifactIndex,
        lastUpdateTime: now,
      };

      if (!isArtifactRoute(location.pathname)) {
        return setArtifact(currentArtifact);
      }

      setArtifacts((prevArtifacts) => {
        if (
          prevArtifacts?.[artifactKey] != null &&
          prevArtifacts[artifactKey]?.content === content
        ) {
          return prevArtifacts;
        }

        return {
          ...prevArtifacts,
          [artifactKey]: currentArtifact,
        };
      });

      setArtifact(currentArtifact);
    });
  }, [
    props.type,
    props.title,
    setArtifacts,
    props.children,
    props.identifier,
    messageId,
    artifactIndex,
    location.pathname,
  ]);

  useEffect(() => {
    resetCounter();
    updateArtifact();
  }, [updateArtifact, resetCounter]);

  return <ArtifactButton artifact={artifact} />;
}
