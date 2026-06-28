import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { visit } from 'unist-util-visit';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useLocation } from 'react-router-dom';
import type { Pluggable } from 'unified';
import type { Artifact } from '~/common';
import { useMessageContext, useArtifactContext } from '~/Providers';
import { logger, extractContent, isArtifactRoute } from '~/utils';
import { parsePatches, applyPatches, type ArtifactPatch as ArtifactPatchOp } from '~/utils/artifactPatch';
import { artifactsState, messagePatchesState, type PatchRecord } from '~/store/artifacts';
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

  const allArtifacts = useRecoilValue(artifactsState);
  const [, setArtifacts] = useRecoilState(artifactsState);
  const [messagePatches, setMessagePatches] = useRecoilState(messagePatchesState);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const lastAppliedKeyRef = useRef<string>('');

  const throttledUpdateRef = useRef(
    throttle((fn: () => void) => {
      fn();
    }, 50),
  );

  /** Pre-message base: most recent non-same-message artifact with this identifier. */
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

  /** Register this directive's raw body so peers in the same message can see it. */
  useEffect(() => {
    const rawBody = props.rawContent ?? extractContent(props.children);
    const identifier = props.identifier;
    if (!rawBody || !messageId || !identifier) {
      return;
    }
    setMessagePatches((prev) => {
      const list = prev[messageId] ?? [];
      const existingIdx = list.findIndex((p) => p.index === artifactIndex);
      const entry: PatchRecord = {
        index: artifactIndex,
        body: rawBody,
        identifier,
        title: props.title,
        type: props.type,
      };
      if (existingIdx >= 0) {
        const existing = list[existingIdx];
        if (
          existing.body === rawBody &&
          existing.identifier === identifier &&
          existing.title === props.title &&
          existing.type === props.type
        ) {
          return prev;
        }
        const next = list.slice();
        next[existingIdx] = entry;
        return { ...prev, [messageId]: next };
      }
      return { ...prev, [messageId]: [...list, entry] };
    });
  }, [
    props.rawContent,
    props.children,
    props.identifier,
    props.title,
    props.type,
    messageId,
    artifactIndex,
    setMessagePatches,
  ]);

  /** All same-identifier patches in this message, in document order. */
  const sameIdPatches = useMemo<PatchRecord[]>(() => {
    if (!messageId || !props.identifier) {
      return [];
    }
    const list = messagePatches[messageId] ?? [];
    return list
      .filter((p) => p.identifier === props.identifier)
      .slice()
      .sort((a, b) => a.index - b.index);
  }, [messagePatches, messageId, props.identifier]);

  /** Position of THIS directive in the same-identifier chain, and whether it's the tail. */
  const { chainPos, isTail } = useMemo(() => {
    const pos = sameIdPatches.findIndex((p) => p.index === artifactIndex);
    return {
      chainPos: pos,
      isTail: pos >= 0 && pos === sameIdPatches.length - 1,
    };
  }, [sameIdPatches, artifactIndex]);

  /** Apply every patch from the start of the chain up to and including this one. */
  const updatePatched = useCallback(() => {
    const identifier = props.identifier;
    if (!identifier || chainPos < 0) {
      return;
    }
    const previous = findPreviousArtifact(identifier);
    if (!previous || previous.content == null) {
      logger.log('artifacts', 'artifact-patch: no previous artifact found for', identifier);
      return;
    }
    const chainUpToSelf = sameIdPatches.slice(0, chainPos + 1);
    const flatOps: ArtifactPatchOp[] = [];
    for (const p of chainUpToSelf) {
      flatOps.push(...parsePatches(p.body));
    }
    if (flatOps.length === 0) {
      return;
    }

    const fingerprint = chainUpToSelf.map((p) => `${p.index}:${p.body}`).join('|');
    if (fingerprint === lastAppliedKeyRef.current) {
      return;
    }

    const result = applyPatches(previous.content, flatOps);
    if (result.applied === 0) {
      logger.log('artifacts', 'artifact-patch: no patches matched', { identifier });
      return;
    }
    lastAppliedKeyRef.current = fingerprint;

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
    props.identifier,
    props.title,
    props.type,
    chainPos,
    sameIdPatches,
    findPreviousArtifact,
    messageId,
    artifactIndex,
    location.pathname,
    setArtifacts,
  ]);

  useEffect(() => {
    updatePatched();
  }, [updatePatched]);

  // Only the last patch in the same-identifier chain renders the button —
  // earlier ones are intermediate steps now folded into the tail's result.
  if (!isTail) {
    return null;
  }

  return <ArtifactButton artifact={artifact} />;
}
