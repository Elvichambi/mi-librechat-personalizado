/**
 * Surgical-edit patches for text artifacts (Aider-style SEARCH/REPLACE blocks).
 *
 * Patch format inside an `:::artifact-patch{identifier="..."}` directive body:
 *
 *   <<<<<<< SEARCH
 *   exact text from the current artifact
 *   =======
 *   new replacement text
 *   >>>>>>> REPLACE
 *
 * Multiple blocks may appear in one directive; they are applied in order against
 * the running result. Matching is intentionally simple: exact substring first,
 * then a per-line whitespace-trim fallback so minor indent drift doesn't break
 * the patch. Ambiguous SEARCH text (more than one match) uses the FIRST hit.
 */

export interface ArtifactPatch {
  search: string;
  replace: string;
}

export interface ApplyPatchResult {
  content: string;
  applied: number;
  failed: ArtifactPatch[];
}

const PATCH_BLOCK_REGEX =
  /<{5,}\s*SEARCH\s*\r?\n([\s\S]*?)\r?\n={5,}\s*\r?\n([\s\S]*?)\r?\n>{5,}\s*REPLACE/g;

export function parsePatches(source: string): ArtifactPatch[] {
  if (!source) {
    return [];
  }
  const patches: ArtifactPatch[] = [];
  PATCH_BLOCK_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PATCH_BLOCK_REGEX.exec(source)) !== null) {
    patches.push({ search: match[1], replace: match[2] });
  }
  return patches;
}

function normalizeForLooseMatch(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, '').replace(/^\s+/, ''))
    .join('\n')
    .trim();
}

function findLooseMatchIndex(haystack: string, needle: string): number {
  const normalizedNeedle = normalizeForLooseMatch(needle);
  if (!normalizedNeedle) {
    return -1;
  }
  const lines = haystack.split(/\r?\n/);
  const needleLines = normalizedNeedle.split('\n');
  for (let i = 0; i <= lines.length - needleLines.length; i++) {
    const window = lines.slice(i, i + needleLines.length).join('\n');
    if (normalizeForLooseMatch(window) === normalizedNeedle) {
      const before = lines.slice(0, i).join('\n');
      return before.length + (i > 0 ? 1 : 0);
    }
  }
  return -1;
}

function applySinglePatch(content: string, patch: ArtifactPatch): string | null {
  if (!patch.search) {
    return null;
  }
  const exactIdx = content.indexOf(patch.search);
  if (exactIdx !== -1) {
    return content.slice(0, exactIdx) + patch.replace + content.slice(exactIdx + patch.search.length);
  }
  const looseIdx = findLooseMatchIndex(content, patch.search);
  if (looseIdx === -1) {
    return null;
  }
  const needleLines = patch.search.split(/\r?\n/).length;
  const tail = content.slice(looseIdx).split(/\r?\n/);
  const consumed = tail.slice(0, needleLines).join('\n').length;
  return content.slice(0, looseIdx) + patch.replace + content.slice(looseIdx + consumed);
}

export function applyPatches(content: string, patches: ArtifactPatch[]): ApplyPatchResult {
  let current = content;
  let applied = 0;
  const failed: ArtifactPatch[] = [];
  for (const patch of patches) {
    const next = applySinglePatch(current, patch);
    if (next === null) {
      failed.push(patch);
      continue;
    }
    current = next;
    applied += 1;
  }
  return { content: current, applied, failed };
}
