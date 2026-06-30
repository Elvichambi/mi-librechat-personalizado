import type { TMessage } from 'librechat-data-provider';
import type { Artifact } from '~/common';
import type { Annotation } from '~/store/artifacts';

/**
 * "Cuaderno" — turns a chat message (or accumulated selections) into an
 * in-memory `text/markdown` artifact so the existing artifact side panel and
 * its annotation system (select / comment / locate) work on plain chat
 * content, with no round-trip to the model and no Artefactos toggle.
 */

const NOTEBOOK_TYPE = 'text/markdown';

export const NOTEBOOK_IDENTIFIER_PREFIX = 'notebook-';

function makeKey(identifier: string, type: string, title: string, messageId: string): string {
  return `${identifier}_${type}_${title}_${messageId}`.replace(/\s+/g, '_').toLowerCase();
}

/**
 * Markdown of a message's FINAL answer only — reasoning / thinking parts are
 * skipped, so they never end up in the cuaderno. This does NOT affect the chat:
 * the function is used only when building a cuaderno from a message.
 */
export function extractMessageMarkdown(message: TMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (part == null) {
          return '';
        }
        if (typeof part === 'string') {
          return part;
        }
        if ('think' in part) {
          return '';
        }
        if ('text' in part) {
          const text = part.text;
          if (typeof text === 'string') {
            return text;
          }
          return text && typeof text === 'object' && 'value' in text ? (text.value ?? '') : '';
        }
        return '';
      })
      .join('');
  }
  return message.text || '';
}

/**
 * True when a message's markdown looks like a substantial text block worth
 * sending to the cuaderno — a long answer, or a document-like one with several
 * headings / list items (scripts, synopses, outlines). Used to surface the
 * notebook button prominently instead of only on hover.
 */
export function isLargeTextBlock(markdown: string): boolean {
  if (!markdown) {
    return false;
  }
  const trimmed = markdown.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  if (words >= 200) {
    return true;
  }
  const headings = (trimmed.match(/^#{1,6}\s/gm) ?? []).length;
  const listItems = (trimmed.match(/^[ \t]*([-*+]|\d+\.)\s/gm) ?? []).length;
  return words >= 120 && (headings >= 2 || listItems >= 4);
}

/** Whole-message notebook: one document per source message. */
export function buildNotebookArtifact(
  messageId: string,
  markdown: string,
  label = '📓 Cuaderno',
): Artifact {
  const identifier = `${NOTEBOOK_IDENTIFIER_PREFIX}${messageId}`;
  return {
    id: makeKey(identifier, NOTEBOOK_TYPE, label, messageId),
    identifier,
    title: label,
    type: NOTEBOOK_TYPE,
    content: markdown,
    messageId,
    index: 0,
    lastUpdateTime: Date.now(),
  };
}

/** True for any artifact created by the Cuaderno feature (not a real model artifact). */
export function isNotebookArtifact(artifact: Pick<Artifact, 'identifier'> | null | undefined): boolean {
  const id = artifact?.identifier ?? '';
  return id.startsWith(NOTEBOOK_IDENTIFIER_PREFIX);
}

/**
 * Plain-text export for pasting into another AI. Opens with an instruction so
 * any model recognizes the structure, then the full text, then each marked
 * fragment with its comment using the same `→` arrow notation as the in-app
 * editor, then the general comment.
 */
export function buildNotebookClipboard(opts: {
  content: string;
  annotations: Annotation[];
  generalComment: string;
}): string {
  const { content, annotations, generalComment } = opts;
  const parts: string[] = [
    'Soy escritor y necesito tu ayuda como editor. Abajo va mi TEXTO completo, luego mis SEÑALIZACIONES (cada fragmento con mi comentario tras la flecha →) y un COMENTARIO GENERAL. Aplica mis indicaciones y devuélveme el texto mejorado.',
    '',
    '===== TEXTO =====',
    content.trim(),
    '',
  ];

  if (annotations.length > 0) {
    parts.push('===== SEÑALIZACIONES =====');
    annotations.forEach((ann, i) => {
      const quote = ann.type === 'selection' ? ann.selectedText : (ann.paragraphText ?? '');
      parts.push(`${i + 1}. Sobre: "${quote.trim()}"`, `   → ${ann.comment.trim()}`, '');
    });
  }

  if (generalComment.trim()) {
    parts.push('===== COMENTARIO GENERAL =====', generalComment.trim(), '');
  }

  return parts.join('\n').trim();
}
