import React, { useEffect, useCallback, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { visit } from 'unist-util-visit';
import { useRecoilState } from 'recoil';
import { useLocation } from 'react-router-dom';
import type { Pluggable } from 'unified';
import type { Artifact } from '~/common';
import { useMessageContext, useArtifactContext } from '~/Providers';
import { logger, extractContent, isArtifactRoute } from '~/utils';
import { parsePatches, applyPatches } from '~/utils/artifactPatch';
import { artifactsState } from '~/store/artifacts';
import ArtifactButton from './ArtifactButton';

/**
 * Captures the raw body of `:::artifact-patch{...}` directives so SEARCH/REPLACE
 * blocks survive remark's parsing intact (same approach as `artifactPlugin`).
 */
export const artifactPatchPlugin: Pluggable = () => {
  return (tree, file) => {
    const source = typeof file?.value === 'string' ? file.value : null;
    visit(tree, ['containerDirective'], (node) => {
      if (node.name !== 'artifact-patch') {
        return;
      }
      let rawContent: string | undefined;
      if (source && node.position?.start?.offset != null && node.position?.end?.offset != null) {
        const raw = source.slice(node.position.start.offset, node.position.end.offset);
        const match = raw.match(/^:::artifact-patch[^\n]*\n([\s\S]*?)\n:::\s*$/);
        if (match) {
          let body = match[1];
          // Match the tolerance of the main artifact plugin: 3+ backticks or
          // tildes (backreference-matched), language tag, trailing whitespace,
          // blank lines, CRLF.
          const fenceMatch = body.match(
            /^\s*(`{3,}|~{3,})[\w-]*[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\1[ \t]*\s*$/,
          );
          if (fenceMatch) {
            body = fenceMatch[2];
          }
          (node as { children?: unknown }).children = [{ type: 'text', value: body }];
          rawContent = body;
        }
      }
      node.data = {
        hName: node.name,
        // See Artifact.tsx: react-markdown strips per-line leading whitespace from
        // rendered text, which would corrupt the SEARCH/REPLACE blocks. Read the
        // verbatim patch body from this prop instead of props.children.
        hProperties: rawContent != null ? { ...node.attributes, rawContent } : node.attributes,
        ...node.data,
      };
      return node;
    });
  };
};

const defaultTitle = 'untitled';
const defaultType = 'text/markdown';

type ArtifactPatchProps = {
  identifier?: string;
  title?: string;
  type?: string;
  children: React.ReactNode | { props: { children: React.ReactNode } };
  node: unknown;
  rawContent?: string;
};

export function ArtifactPatch({ node: _node, ...props }: ArtifactPatchProps) {
  const location = useLocation();
  const { messageId } = useMessageContext();
  const { getNextIndex } = useArtifactContext();
  const artifactIndex = useRef(getNextIndex(false)).current;

  const [allArtifacts, setArtifacts] = useRecoilState(artifactsState);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const lastAppliedRef = useRef<string>('');

  const throttledUpdateRef = useRef(
    throttle((fn: () => void) => {
      fn();
    }, 50),
  );

  const findPreviousArtifact = useCallback(
    (identifier: string): Artifact | null => {
      if (!allArtifacts) {
        return null;
      }
      let best: Artifact | null = null;
      for (const key of Object.keys(allArtifacts)) {
        const candidate = allArtifacts[key];
        if (!candidate || candidate.identifier !== identifier) {
          continue;
        }
        if (candidate.messageId === messageId) {
          continue;
        }
        if (!best || (candidate.lastUpdateTime ?? 0) > (best.lastUpdateTime ?? 0)) {
          best = candidate;
        }
      }
      return best;
    },
    [allArtifacts, messageId],
  );

  const updatePatched = useCallback(() => {
    const rawBody = props.rawContent ?? extractContent(props.children);
    if (!rawBody || rawBody === lastAppliedRef.current) {
      return;
    }
    const identifier = props.identifier;
    if (!identifier) {
      logger.log('artifacts', 'artifact-patch missing identifier; skipping');
      return;
    }
    const previous = findPreviousArtifact(identifier);
    if (!previous || previous.content == null) {
      logger.log('artifacts', 'artifact-patch: no previous artifact found for', identifier);
      return;
    }
    const patches = parsePatches(rawBody);
    if (patches.length === 0) {
      return;
    }
    const result = applyPatches(previous.content, patches);
    if (result.applied === 0) {
      logger.log('artifacts', 'artifact-patch: no patches matched', { identifier });
      return;
    }
    lastAppliedRef.current = rawBody;

    const title = props.title ?? previous.title ?? defaultTitle;
    const type = props.type ?? previous.type ?? defaultType;
    const artifactKey = `${identifier}_${type}_${title}_${messageId}`
      .replace(/\s+/g, '_')
      .toLowerCase();

    throttledUpdateRef.current(() => {
      const now = Date.now();
      const patchedArtifact: Artifact = {
        id: artifactKey,
        identifier,
        title,
        type,
        content: result.content,
        messageId,
        index: artifactIndex,
        lastUpdateTime: now,
      };

      setArtifact(patchedArtifact);

      if (!isArtifactRoute(location.pathname)) {
        return;
      }

      setArtifacts((prev) => {
        if (prev?.[artifactKey]?.content === result.content) {
          return prev;
        }
        return { ...prev, [artifactKey]: patchedArtifact };
      });
    });
  }, [
    props.children,
    props.rawContent,
    props.identifier,
    props.title,
    props.type,
    findPreviousArtifact,
    messageId,
    artifactIndex,
    location.pathname,
    setArtifacts,
  ]);

  useEffect(() => {
    updatePatched();
  }, [updatePatched]);

  return <ArtifactButton artifact={artifact} />;
}
