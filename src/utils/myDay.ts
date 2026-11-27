// « Envoyer ma journée » (E5b, TODO_SUIVI_PAIE.md) : l'employé envoie lui-même sa ligne ; elle attend la validation du chef d'équipe ou du responsable.
// Règles PURES : aucun réseau, aucune donnée, aucune horloge. Le serveur refait toutes les vérifications (utils/workEntry.ts = bloc WORKENTRY de df-api).
// Contrôle : npm run check:my-day
import type { WorkType } from './workTypes';

export type MyDayFields = { presence?: string; hours?: string; quantity?: string; rejected?: string; sales?: string };

/** Les types que l'employé peut envoyer lui-même : ceux dont « qui saisit » contient l'employé, et qui se mesurent par la présence, une quantité ou un montant vendu. */
export const myDayTypes = (types: WorkType[]): WorkType[] => types.filter(t => (t.measure === 'presence' || t.measure === 'quantity' || t.measure === 'sales') && t.entry.includes('employee'));

/** Aujourd'hui et hier (l'employé ne peut pas aller plus loin en arrière : même limite que le serveur). */
export function myDayDates(today: string): string[] {
  const d = new Date(today + 'T00:00:00Z');
  if (isNaN(d.getTime())) return [today];
  d.setUTCDate(d.getUTCDate() - 1);
  return [today, d.toISOString().slice(0, 10)];
}

/** Les champs que l'écran montre pour un type : seulement ce qui compte pour sa mesure. */
export const myDayShows = (t: WorkType) => ({
  presence: t.measure === 'presence',
  hours: t.measure === 'presence' && t.pay === 'hour',
  quantity: t.measure === 'quantity',
  sales: t.measure === 'sales',
});

const clean = (v: unknown): string | undefined => { const s = String(v ?? '').trim(); return s === '' ? undefined : s; };

/** La ligne envoyée au serveur : POUR LUI SEUL, et seulement les champs de la mesure du type (jamais un champ caché). */
export function myDayLine(meId: string, t: WorkType, f: MyDayFields) {
  const show = myDayShows(t);
  return {
    employee_id: meId, work_type: t.id,
    ...(show.presence ? { presence: clean(f.presence) } : {}),
    ...(show.hours ? { hours: clean(f.hours) } : {}),
    ...(show.quantity ? { quantity: clean(f.quantity), rejected: clean(f.rejected) } : {}),
    ...(show.sales ? { sales_ar: clean(f.sales) } : {}),
  };
}
