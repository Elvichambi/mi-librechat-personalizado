import {
  getStoryLabEditorPrompt,
  setStoryLabEditorPromptOverride,
  STORYLAB_EDITOR_TEMPLATE_ID,
} from './storyLabEditorPrompt';

/**
 * Editable "hidden" prompts surfaced in the 📁 Oculto folder of RunSettings.
 * Each has a built-in default and a per-prompt localStorage override the user
 * can edit. Two flavors:
 *   - The editor prompt (injected into the conversation as a system prompt).
 *   - The "Enviar todo" instructions for the AnnotationsPanel: one for
 *     notebooks (full-text edit) and one for artifacts (surgical patch).
 */

function readOverride(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(key);
    return v && v.trim().length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

function writeOverride(key: string, text: string | null) {
  try {
    if (text == null || text.trim().length === 0) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, text);
  } catch {
    /* noop */
  }
}

/* ---------------------------------------------------------------- Notebook */

export const NOTEBOOK_PROMPT_TEMPLATE_ID = 'storylab-notebook-prompt';
const NOTEBOOK_OVERRIDE_KEY = 'storylab:notebook-instruction-override';

export const NOTEBOOK_INSTRUCTION_DEFAULT = `IMPORTANTE — Aplica los cambios que te pedí arriba y devuélveme el DOCUMENTO COMPLETO ya corregido, en texto normal (sin bloques de búsqueda/reemplazo ni ningún formato especial).

Reglas:
- Integra cada corrección señalada en el lugar que corresponde.
- Conserva TODO lo demás tal como está: no reescribas, no resumas ni quites nada que no te haya pedido cambiar.
- Donde un comentario pida mejorar (por ejemplo "hazlo más intrigante" o "dale un arco"), tienes libertad para reescribir esa parte concreta respetando la voz, el tono y el resto del texto.
- Entrega solo el texto final editado, listo para leer.`;

export function getNotebookInstruction(): string {
  return readOverride(NOTEBOOK_OVERRIDE_KEY, NOTEBOOK_INSTRUCTION_DEFAULT);
}

export function setNotebookInstructionOverride(text: string | null) {
  writeOverride(NOTEBOOK_OVERRIDE_KEY, text);
}

/* ------------------------------------------------------------------- Patch */

export const PATCH_PROMPT_TEMPLATE_ID = 'storylab-patch-prompt';
const PATCH_OVERRIDE_KEY = 'storylab:patch-instruction-override';

export const PATCH_INSTRUCTION_DEFAULT = `IMPORTANTE — NO reescribas el documento completo. Devuelve SOLO los fragmentos que cambian usando el siguiente bloque (edición quirúrgica tipo parche):

:::artifact-patch{identifier="{IDENTIFIER}"}
<<<<<<< SEARCH
texto exacto a buscar en el documento actual
=======
texto nuevo que lo reemplaza
>>>>>>> REPLACE
:::

Reglas estrictas:
- Usa exactamente los marcadores \`<<<<<<< SEARCH\`, \`=======\` y \`>>>>>>> REPLACE\` (siete signos).
- El texto entre SEARCH y ======= debe aparecer textualmente en el documento (sin abreviar, sin "...").
- Puedes incluir varios bloques SEARCH/REPLACE dentro del mismo \`:::artifact-patch{...}:::\` para aplicar varios cambios.
- Mantén el \`identifier\` igual al del artifact original: "{IDENTIFIER}".
- Antes y/o después del bloque de parche puedes añadir un comentario breve en prosa explicando qué cambiaste, pero NO incluyas el documento completo.`;

/** Editable template (keeps the {IDENTIFIER} placeholder). */
export function getPatchInstructionTemplate(): string {
  return readOverride(PATCH_OVERRIDE_KEY, PATCH_INSTRUCTION_DEFAULT);
}

/** Ready-to-send instruction with the real identifier substituted in. */
export function getPatchInstruction(identifier: string): string {
  return getPatchInstructionTemplate().split('{IDENTIFIER}').join(identifier);
}

export function setPatchInstructionOverride(text: string | null) {
  writeOverride(PATCH_OVERRIDE_KEY, text);
}

/* ---------------------------------------------------------------- Registry */

export interface HiddenPrompt {
  id: string;
  title: string;
  description: string;
  get: () => string;
  setOverride: (text: string | null) => void;
  /** Editor prompt is also injected into the conversation; the others aren't. */
  appliesToConversation: boolean;
}

export const HIDDEN_PROMPTS: HiddenPrompt[] = [
  {
    id: STORYLAB_EDITOR_TEMPLATE_ID,
    title: '🔒 StoryLab Editor',
    description: 'Prompt interno del modo Artefactos (se inyecta como system prompt). Edítalo si quieres ajustarlo.',
    get: getStoryLabEditorPrompt,
    setOverride: setStoryLabEditorPromptOverride,
    appliesToConversation: true,
  },
  {
    id: NOTEBOOK_PROMPT_TEMPLATE_ID,
    title: '🔒 Prompt del Cuaderno',
    description: 'Se envía al pulsar "Enviar todo" desde un cuaderno: edición normal del texto, conservando lo demás.',
    get: getNotebookInstruction,
    setOverride: setNotebookInstructionOverride,
    appliesToConversation: false,
  },
  {
    id: PATCH_PROMPT_TEMPLATE_ID,
    title: '🔒 Prompt de Parche (Artifact)',
    description: 'Se envía al pulsar "Enviar todo" desde un artifact: edición quirúrgica por parches. {IDENTIFIER} se reemplaza solo.',
    get: getPatchInstructionTemplate,
    setOverride: setPatchInstructionOverride,
    appliesToConversation: false,
  },
];

export function getHiddenPrompt(id: string): HiddenPrompt | undefined {
  return HIDDEN_PROMPTS.find((p) => p.id === id);
}
