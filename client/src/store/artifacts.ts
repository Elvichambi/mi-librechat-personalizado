import { atom } from 'recoil';
import { logger } from '~/utils';
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

/** Annotations the user has marked on a text artifact but not yet sent to the model. */
export const pendingAnnotationsState = atom<Annotation[]>({
  key: 'pendingAnnotationsState',
  default: [],
});

/** Optional general comment sent alongside the accumulated annotations. */
export const generalCommentState = atom<string>({
  key: 'generalCommentState',
  default: '',
});

/** Ephemeral focus signal: artifact renderer flashes whatever annotation text is here.
 *  Set to a {text, ts} pair; the timestamp forces re-trigger when clicking the same item. */
export const focusedAnnotationState = atom<{ text: string; ts: number } | null>({
  key: 'focusedAnnotationState',
  default: null,
});
