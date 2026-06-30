import { atom } from 'recoil';
import { logger } from '~/utils';
import { atomWithLocalStorage } from './utils';
import type { Artifact } from '~/common';

/**
 * Raw `:::artifact-patch` bodies emitted within a single assistant message,
 * keyed by messageId. Lets ArtifactPatch components chain multiple patches
 * for the same `identifier` so each one applies on top of the previous —
 * required when the model emits more than one `:::artifact-patch` block per
 * message instead of bundling SEARCH/REPLACE blocks into a single directive.
 */
export interface PatchRecord {
  /** Render order of this directive in the message (artifactIndex). */
  index: number;
  /** Raw patch body (the SEARCH/REPLACE blocks, unparsed). */
  body: string;
  identifier: string;
  title?: string;
  type?: string;
}

export const messagePatchesState = atom<Record<string, PatchRecord[]>>({
  key: 'messagePatchesState',
  default: {},
});

export const artifactsState = atom<Record<string, Artifact | undefined> | null>({
  key: 'artifactsState',
  default: null,
  effects: [
    ({ onSet, node }) => {
      onSet(async (newValue) => {
        logger.log('artifacts', 'Recoil Effect: Setting artifactsState', {
          key: node.key,
          newValue,
        });
      });
    },
  ] as const,
});

export const currentArtifactId = atom<string | null>({
  key: 'currentArtifactId',
  default: null,
  effects: [
    ({ onSet, node }) => {
      onSet(async (newValue) => {
        logger.log('artifacts', 'Recoil Effect: Setting currentArtifactId', {
          key: node.key,
          newValue,
        });
      });
    },
  ] as const,
});

export const artifactsVisibility = atom<boolean>({
  key: 'artifactsVisibility',
  default: true,
  effects: [
    ({ onSet, node }) => {
      onSet(async (newValue) => {
        logger.log('artifacts', 'Recoil Effect: Setting artifactsVisibility', {
          key: node.key,
          newValue,
        });
      });
    },
  ] as const,
});

export const visibleArtifacts = atom<Record<string, Artifact | undefined> | null>({
  key: 'visibleArtifacts',
  default: null,
  effects: [
    ({ onSet, node }) => {
      onSet(async (newValue) => {
        logger.log('artifacts', 'Recoil Effect: Setting `visibleArtifacts`', {
          key: node.key,
          newValue,
        });
      });
    },
  ] as const,
});

export interface Annotation {
  id: string;
  type: 'selection' | 'paragraph';
  selectedText: string;
  paragraphText?: string;
  comment: string;
}

/**
 * Annotations the user has marked but not yet sent. Persisted to localStorage
 * so a page refresh, a hung request, or closing the tab never loses the work —
 * they're only cleared when the user sends or clears them.
 */
export const pendingAnnotationsState = atomWithLocalStorage<Annotation[]>(
  'storylab:pending-annotations',
  [],
);

/** Optional general comment sent alongside the annotations. Also persisted. */
export const generalCommentState = atomWithLocalStorage<string>(
  'storylab:general-comment',
  '',
);

/** Ephemeral focus signal: artifact renderer flashes whatever annotation text is here.
 *  Set to a {text, ts} pair; the timestamp forces re-trigger when clicking the same item. */
export const focusedAnnotationState = atom<{ text: string; ts: number } | null>({
  key: 'focusedAnnotationState',
  default: null,
});
