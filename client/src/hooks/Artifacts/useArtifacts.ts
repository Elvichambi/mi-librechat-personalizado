import { useMemo, useState, useEffect, useRef } from 'react';
import { Constants } from 'librechat-data-provider';
import { useRecoilState, useRecoilValue, useResetRecoilState } from 'recoil';
import { useArtifactsContext } from '~/Providers';
import { logger } from '~/utils';
import store from '~/store';

export default function useArtifacts() {
  const [activeTab, setActiveTab] = useState('preview');
  const { isSubmitting, latestMessageId, latestMessageText, conversationId } =
    useArtifactsContext();

  const artifacts = useRecoilValue(store.artifactsState);
  const resetArtifacts = useResetRecoilState(store.artifactsState);
  const resetCurrentArtifactId = useResetRecoilState(store.currentArtifactId);
  const [currentArtifactId, setCurrentArtifactId] = useRecoilState(store.currentArtifactId);

  const orderedArtifactIds = useMemo(() => {
    return Object.keys(artifacts ?? {}).sort(
      (a, b) => (artifacts?.[a]?.lastUpdateTime ?? 0) - (artifacts?.[b]?.lastUpdateTime ?? 0),
    );
  }, [artifacts]);

  /** All artifact keys, grouped by `identifier`, sorted chronologically inside
   *  each group. This is what powers the version picker — only artifacts that
   *  share an identifier should appear as versions of the same document. */
  const versionsByIdentifier = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const key of Object.keys(artifacts ?? {})) {
      const a = artifacts?.[key];
      const id = a?.identifier;
      if (!id) {
        continue;
      }
      if (!groups[id]) {
        groups[id] = [];
      }
      groups[id].push(key);
    }
    for (const id of Object.keys(groups)) {
      groups[id].sort(
        (a, b) =>
          (artifacts?.[a]?.lastUpdateTime ?? 0) - (artifacts?.[b]?.lastUpdateTime ?? 0),
      );
    }
    return groups;
  }, [artifacts]);

  /** Distinct documents in this conversation, ordered by the most recent
   *  version of each. Used by the document switcher in the panel header. */
  const orderedIdentifiers = useMemo(() => {
    return Object.keys(versionsByIdentifier).sort((a, b) => {
      const latestKeyA = versionsByIdentifier[a].at(-1);
      const latestKeyB = versionsByIdentifier[b].at(-1);
      const tA = latestKeyA ? (artifacts?.[latestKeyA]?.lastUpdateTime ?? 0) : 0;
      const tB = latestKeyB ? (artifacts?.[latestKeyB]?.lastUpdateTime ?? 0) : 0;
      return tA - tB;
    });
  }, [versionsByIdentifier, artifacts]);

  const prevIsSubmittingRef = useRef<boolean>(false);
  const lastContentRef = useRef<string | null>(null);
  const hasEnclosedArtifactRef = useRef<boolean>(false);
  const hasAutoSwitchedToCodeRef = useRef<boolean>(false);
  const lastRunMessageIdRef = useRef<string | null>(null);
  const prevConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const resetState = () => {
      resetArtifacts();
      resetCurrentArtifactId();
      prevConversationIdRef.current = conversationId;
      lastRunMessageIdRef.current = null;
      lastContentRef.current = null;
      hasEnclosedArtifactRef.current = false;
      hasAutoSwitchedToCodeRef.current = false;
    };
    if (conversationId !== prevConversationIdRef.current && prevConversationIdRef.current != null) {
      resetState();
    } else if (conversationId === Constants.NEW_CONVO) {
      resetState();
    }
    prevConversationIdRef.current = conversationId;
    /** Resets artifacts when unmounting */
    return () => {
      logger.log('artifacts_visibility', 'Unmounting artifacts');
      resetState();
    };
  }, [conversationId, resetArtifacts, resetCurrentArtifactId]);

  /**
   * Read currentArtifactId in effects without subscribing as a dependency.
   * Adding it to effect deps fires auto-select on every reset, breaking toggle-close.
   */
  const currentArtifactIdRef = useRef(currentArtifactId);
  currentArtifactIdRef.current = currentArtifactId;

  useEffect(() => {
    if (orderedArtifactIds.length === 0) return;
    const currentId = currentArtifactIdRef.current;
    if (currentId != null && orderedArtifactIds.includes(currentId)) return;
    setCurrentArtifactId(orderedArtifactIds[orderedArtifactIds.length - 1]);
  }, [orderedArtifactIds, setCurrentArtifactId]);

  /**
   * Manage artifact selection and code tab switching for non-enclosed artifacts
   * Runs when artifact content changes
   */
  useEffect(() => {
    // Check if we just finished submitting (transition from true to false)
    const justFinishedSubmitting = prevIsSubmittingRef.current && !isSubmitting;
    prevIsSubmittingRef.current = isSubmitting;

    // Only process during submission OR when just finished
    if (!isSubmitting && !justFinishedSubmitting) {
      return;
    }
    if (orderedArtifactIds.length === 0) {
      return;
    }
    if (latestMessageId == null) {
      return;
    }
    const latestArtifactId = orderedArtifactIds[orderedArtifactIds.length - 1];
    const latestArtifact = artifacts?.[latestArtifactId];
    if (latestArtifact?.content === lastContentRef.current && !justFinishedSubmitting) {
      return;
    }

    setCurrentArtifactId(latestArtifactId);
    lastContentRef.current = latestArtifact?.content ?? null;

    // Auto-switch to code tab disabled: we always stay on "preview" so the user sees
    // the artifact rendering live as it streams in, just like Claude / Open Canvas.
  }, [
    artifacts,
    isSubmitting,
    latestMessageId,
    latestMessageText,
    orderedArtifactIds,
    setCurrentArtifactId,
  ]);

  /**
   * Watch for enclosed artifact pattern during message generation
   * Optimized: Exits early if already detected, only checks during streaming
   */
  useEffect(() => {
    if (!isSubmitting || hasEnclosedArtifactRef.current) {
      return;
    }

    const hasEnclosedArtifact =
      /:::artifact(?:\{[^}]*\})?(?:\s|\n)*(?:```[\s\S]*?```(?:\s|\n)*)?:::/m.test(
        latestMessageText.trim(),
      );

    if (hasEnclosedArtifact) {
      logger.log('artifacts', 'Enclosed artifact detected during generation, switching to preview');
      setActiveTab('preview');
      hasEnclosedArtifactRef.current = true;
      hasAutoSwitchedToCodeRef.current = false;
    }
  }, [isSubmitting, latestMessageText]);

  useEffect(() => {
    if (latestMessageId !== lastRunMessageIdRef.current) {
      lastRunMessageIdRef.current = latestMessageId;
      hasEnclosedArtifactRef.current = false;
      hasAutoSwitchedToCodeRef.current = false;
    }
  }, [latestMessageId]);

  const currentArtifact = currentArtifactId != null ? artifacts?.[currentArtifactId] : null;

  /** Versions belonging to the SAME document as the one currently selected. */
  const currentVersionIds = useMemo(() => {
    const id = currentArtifact?.identifier;
    if (!id) {
      return [] as string[];
    }
    return versionsByIdentifier[id] ?? [];
  }, [currentArtifact?.identifier, versionsByIdentifier]);

  /** Index of the current version WITHIN its own identifier's version list. */
  const currentIndex = currentVersionIds.indexOf(currentArtifactId ?? '');

  return {
    activeTab,
    setActiveTab,
    currentIndex,
    currentArtifact,
    orderedArtifactIds,
    currentVersionIds,
    orderedIdentifiers,
    versionsByIdentifier,
    setCurrentArtifactId,
  };
}
