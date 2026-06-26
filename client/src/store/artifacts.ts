import { atom } from 'recoil';
import { logger } from '~/utils';
import type { Artifact } from '~/common';

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
