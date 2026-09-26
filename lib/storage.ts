import { z } from 'zod';
import { trainerSchema } from './validation';
import type { Trainer } from './ptu';

export const STORAGE_PREFIX = 'ptu-manager:trainer:v1:';
const recordSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/),
  name: z.string().max(200),
  state: trainerSchema,
  revision: z.number().int().positive(),
  updated_at: z.string().datetime(),
});
export type SavedTrainer = z.infer<typeof recordSchema>;

function browserStorage(): Storage {
  try { return window.localStorage; }
  catch { throw Error('El navegador bloquea el guardado. Puedes conservar tu ficha con Exportar.'); }
}

function parseRecord(raw: string, id: string): SavedTrainer {
  try {
    const record = recordSchema.parse(JSON.parse(raw));
    if (record.id !== id) throw Error('ID mismatch');
    return record;
  } catch {
    throw Error('Una ficha guardada no tiene un formato compatible. No se ha sobrescrito.');
  }
}

export function listTrainers(): SavedTrainer[] {
  const storage = browserStorage();
  const result: SavedTrainer[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    const raw = storage.getItem(key);
    if (raw !== null) result.push(parseRecord(raw, key.slice(STORAGE_PREFIX.length)));
  }
  return result.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function saveTrainer(id: string, revision: number, state: Trainer): Promise<SavedTrainer> {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id) || !Number.isSafeInteger(revision) || revision < 0) {
    throw Error('La ficha no tiene un identificador o una revisión válidos.');
  }
  const parsed = trainerSchema.safeParse(state);
  if (!parsed.success) throw Error('La ficha no tiene un formato compatible. Exporta una copia antes de continuar.');
  const persist = () => {
    const storage = browserStorage();
    const key = STORAGE_PREFIX + id;
    const raw = storage.getItem(key);
    const previous = raw === null ? null : parseRecord(raw, id);
    if ((previous?.revision ?? 0) !== revision) {
      throw Error('La ficha cambió en otra pestaña. Exporta tu borrador o vuelve a abrir la ficha guardada.');
    }
    const record: SavedTrainer = {
      id, name: parsed.data.name || 'Entrenador sin nombre', state: parsed.data,
      revision: revision + 1, updated_at: new Date().toISOString(),
    };
    try { storage.setItem(key, JSON.stringify(record)); }
    catch { throw Error('No se pudo guardar en este navegador. Exporta una copia para conservar los cambios.'); }
    return record;
  };
  // Serialise writes from tabs in browsers supporting Web Locks (including Pages HTTPS).
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(STORAGE_PREFIX + id, persist);
  }
  return persist();
}
