// Lien facultatif entre le travail validé et le stock (E8, TODO_SUIVI_PAIE.md). Règles PURES : aucun réseau, aucune donnée, aucune horloge.
// Chaque entreprise règle ce lien type de travail par type de travail (`stock` du type) ; par défaut il n'y a AUCUN lien.
// Jamais bloquant (une raison de ne rien faire est rendue, la validation de la ligne n'est jamais retardée) et jamais en double
// (le mouvement garde l'identifiant de la ligne : `work_post_id`). Contrôle : npm run check:work-stock
import { BUSINESS_MODELS, type WorkType } from './workTypes';

export type WorkStockSkip = 'not_line' | 'not_validated' | 'none' | 'already' | 'product' | 'empty';
export type WorkStockMove = { product_id: string; type: 'in' | 'out'; qty: number; date: string; note: string; work_post_id: string };
export type WorkStockResult = { move: WorkStockMove } | { skip: WorkStockSkip };

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

/** Le type d'un travail : d'abord ceux de l'entreprise (créés à la main), puis ceux des modèles. */
export function findWorkTypeById(id: unknown, custom: WorkType[] = []): WorkType | undefined {
  if (typeof id !== 'string' || !id) return undefined;
  return custom.find(t => t.id === id) || BUSINESS_MODELS.flatMap(m => m.types).find(t => t.id === id);
}

/**
 * Faut-il écrire un mouvement de stock pour cette ligne de travail ? « in » : la production fait monter le stock (pièces faites moins refusées,
 * fois la quantité par unité) ; « out » : le travail consomme un produit (même calcul, le stock baisse). « gap » = seulement un signal, aucun mouvement.
 */
export function workStockMove(post: any, type: WorkType | undefined, productIds: Set<string>, moves: { work_post_id?: string }[]): WorkStockResult {
  if (!post || typeof post.work_type !== 'string' || !post.work_type) return { skip: 'not_line' };
  if (post.status !== 'completed') return { skip: 'not_validated' };
  const link = type?.stock;
  if (!link || link.mode === 'gap') return { skip: 'none' };
  if (moves.some(m => m.work_post_id === post.id)) return { skip: 'already' };
  if (!productIds.has(link.product_id)) return { skip: 'product' };
  const accepted = Math.max(0, num(post.quantity) - num(post.rejected));
  const qty = Math.round(accepted * link.per_unit * 100) / 100;
  if (!(qty > 0)) return { skip: 'empty' };
  const date = typeof post.date === 'string' ? post.date : '';
  return { move: { product_id: link.product_id, type: link.mode, qty, date, note: `Travail validé : ${type!.name.fr}`.slice(0, 120), work_post_id: String(post.id) } };
}
