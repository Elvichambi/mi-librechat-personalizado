import { useState } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { Send, Trash2, MessageSquare, ChevronDown, ChevronUp, Pencil, Locate, Check } from 'lucide-react';
import { Button } from '@librechat/client';
import type { Artifact } from '~/common';
import {
  pendingAnnotationsState,
  generalCommentState,
  focusedAnnotationState,
  type Annotation,
} from '~/store/artifacts';
import { useSubmitMessage } from '~/hooks';

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

interface RowProps {
  annotation: Annotation;
  onEdit: (id: string, comment: string) => void;
  onDelete: (id: string) => void;
  onLocate: (text: string) => void;
}

function AnnotationRow({ annotation: ann, onEdit, onDelete, onLocate }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ann.comment);

  const quote = ann.type === 'selection' ? ann.selectedText : (ann.paragraphText ?? '');

  const save = () => {
    const v = draft.trim();
    if (v) {
      onEdit(ann.id, v);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-1.5 rounded-md border border-border-light bg-surface-secondary px-2 py-1 text-xs">
      <button
        type="button"
        onClick={() => onLocate(quote)}
        className="mt-0.5 p-0.5 text-text-secondary transition-colors hover:text-amber-500"
        title="Ubicar en el texto"
        aria-label="Ubicar en el texto"
      >
        <Locate className="size-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        {quote && (
          <span className="line-clamp-1 italic text-text-secondary">"{truncate(quote, 70)}"</span>
        )}
        {editing ? (
          <textarea
            value={draft}
            autoFocus
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                save();
              } else if (e.key === 'Escape') {
                setDraft(ann.comment);
                setEditing(false);
              }
            }}
            className="mt-0.5 w-full resize-none rounded border border-border-medium bg-surface-primary px-1 py-0.5 font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        ) : (
          <p className="break-words font-medium leading-tight">{ann.comment}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => (editing ? save() : setEditing(true))}
        className="mt-0.5 p-0.5 text-text-secondary transition-colors hover:text-amber-500"
        title={editing ? 'Guardar' : 'Editar'}
        aria-label={editing ? 'Guardar' : 'Editar'}
      >
        {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => onDelete(ann.id)}
        className="mt-0.5 p-0.5 text-text-secondary transition-colors hover:text-red-500"
        title="Eliminar"
        aria-label="Eliminar anotación"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export default function AnnotationsPanel({ artifact }: { artifact: Artifact }) {
  const [pendingAnnotations, setPendingAnnotations] = useRecoilState(pendingAnnotationsState);
  const [generalComment, setGeneralComment] = useRecoilState(generalCommentState);
  const setFocused = useSetRecoilState(focusedAnnotationState);
  const [collapsed, setCollapsed] = useState(false);
  const { submitMessage } = useSubmitMessage();

  if (pendingAnnotations.length === 0) {
    return null;
  }

  const clearAll = () => {
    setPendingAnnotations([]);
    setGeneralComment('');
  };

  const editAnnotation = (id: string, comment: string) => {
    setPendingAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, comment } : a)));
  };

  const deleteAnnotation = (id: string) => {
    setPendingAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const locateAnnotation = (text: string) => {
    if (text) {
      setFocused({ text, ts: Date.now() });
    }
  };

  const sendAll = () => {
    const title = artifact.title ?? 'sin título';
    let prompt = `Aplica estas correcciones al documento "${title}":\n\n`;
    pendingAnnotations.forEach((ann, index) => {
      const quote = ann.type === 'selection' ? ann.selectedText : (ann.paragraphText ?? '');
      prompt += `${index + 1}. Sobre: "${truncate(quote, 200)}"\n   → ${ann.comment}\n\n`;
    });
    if (generalComment.trim()) {
      prompt += `Comentario general: ${generalComment.trim()}\n\n`;
    }
    prompt +=
      'Reescribe el documento completo aplicando todos estos cambios y devuélvelo como el artifact actualizado.';

    submitMessage({ text: prompt });
    clearAll();
  };

  return (
    <div className="flex flex-shrink-0 flex-col border-t border-border-light bg-surface-primary-alt text-text-primary">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-surface-hover"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <MessageSquare className="size-4 text-amber-500" aria-hidden="true" />
          Correcciones marcadas ({pendingAnnotations.length})
        </span>
        <span className="flex items-center gap-2">
          {!collapsed && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  clearAll();
                }
              }}
              className="text-xs text-text-secondary transition-colors hover:text-red-500"
            >
              Limpiar todo
            </span>
          )}
          {collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
            {pendingAnnotations.map((ann) => (
              <AnnotationRow
                key={ann.id}
                annotation={ann}
                onEdit={editAnnotation}
                onDelete={deleteAnnotation}
                onLocate={locateAnnotation}
              />
            ))}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value)}
              placeholder="Comentario general (opcional)…"
              rows={1}
              className="h-9 max-h-20 flex-1 resize-none rounded-lg border border-border-light bg-surface-secondary p-2 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-border-medium"
            />
            <Button
              onClick={sendAll}
              className="flex h-9 items-center gap-1.5 bg-amber-600 px-4 font-semibold text-white hover:bg-amber-700"
            >
              <Send className="size-3.5" aria-hidden="true" />
              Enviar todo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
