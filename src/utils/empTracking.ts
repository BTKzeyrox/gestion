// Fiche de suivi par employé (E9) : règles pures, sans écran ni réseau.
// Utilisé par : components/EmpTrackingSheet.tsx (calendrier global du responsable, page « Validations de mon équipe » du chef d'équipe). Contrôlé par : npm run check:emp-tracking.
// Pour modifier : qui voit qui vient de roles.ts (sameTeam, isOperator) ; les compteurs de présence viennent de globalSummary (même règle que le calendrier) ; la paie n'est JAMAIS calculée ici pour un non-admin.
import type { AppSettings, PostSession, User } from '../types';
import { globalSummary, firstActivityOf, type CalCtx } from './calendarGlobal';
import { hmMada } from './dayDetail';
import { isWorkLine, payModeFor } from './postPay';
import { isOperator, sameTeam } from './roles';
import type { PayMode } from './workTypes';

const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n: number): number => Math.round(n * 100) / 100;
const isPending = (p: any): boolean => p && (p.status === 'pending_start' || p.status === 'pending_end');

/** Les employés qu'une personne peut suivre : le responsable voit tous les opérateurs ; le chef d'équipe seulement ceux de SON équipe (jamais lui-même) ; les autres rôles personne. */
export function trackedEmployees(viewer: any, users: User[]): User[] {
  if (!viewer || !Array.isArray(users)) return [];
  const ops = users.filter(u => isOperator(u.role));
  if (viewer.role === 'admin') return ops;
  if (viewer.role === 'team_lead') return ops.filter(u => u.id !== viewer.id && sameTeam(viewer, u));
  return [];
}

/** Seul le responsable voit les salaires et les montants. Le chef d'équipe, le comptable et les opérateurs : jamais. */
export const canSeeTrackingPay = (viewer: any): boolean => !!viewer && viewer.role === 'admin';

export interface TypeMeasure {
  type: string; lines: number; validated: number;
  presenceDays: number; hours: number; quantity: number; rejected: number; salesAr: number;
}
export interface EmpTrackingRow {
  id: string; name: string; payMode: PayMode;
  workedDays: number; absences: number; lateDays: number; leaveDays: number;
  missions: number; missionsValidated: number; missionsRefused: number;
  /** Validations en attente, TOUS mois confondus (ce qui bloque vraiment l'employé). */
  pendingMissions: number; pendingLines: number;
  /** Ce que l'employé a fait avec la feuille du jour ce mois-ci, type par type (lignes validées seulement pour les totaux). */
  measures: TypeMeasure[];
  /** Dernière ligne ou mission envoyée / validée du mois (HH:MM, heure de Madagascar) ; null si aucune. */
  lastSent: string | null; lastValidated: string | null;
  /** null = non visible pour ce rôle (jamais 0 : « caché » n'est pas « zéro »). */
  pay: number | null;
}

const stampOf = (p: any, key: string): string | null => {
  const v = p && p[key];
  return typeof v === 'string' && v && Number.isFinite(Date.parse(v)) ? v : null;
};
/** Plus récent des horodatages donnés (ISO) ; null si aucun. */
const latest = (list: (string | null)[]): string | null => list.filter((x): x is string => !!x).sort().slice(-1)[0] || null;

/** Les lignes de la feuille d'un employé pour un mois, regroupées par type de travail. Seules les lignes VALIDÉES entrent dans les heures et quantités (une ligne en attente n'est pas encore du travail reconnu). */
export function measuresFor(posts: PostSession[], empId: string, prefix: string): TypeMeasure[] {
  const by = new Map<string, TypeMeasure>();
  for (const p of posts) {
    if (p.employee_id !== empId || !isWorkLine(p) || !String(p.date).startsWith(prefix)) continue;
    if (p.status === 'rejected') continue; // refusée : ne compte nulle part
    const key = String(p.client_name || (p as any).work_type || '');
    const m = by.get(key) || { type: key, lines: 0, validated: 0, presenceDays: 0, hours: 0, quantity: 0, rejected: 0, salesAr: 0 };
    m.lines++;
    if (p.status === 'completed') {
      m.validated++;
      const a = p as any;
      if (a.presence === 'present' || a.presence === 'late' || a.presence === 'half') m.presenceDays++;
      m.hours += num(a.hours); m.quantity += num(a.quantity); m.rejected += num(a.rejected); m.salesAr += num(a.sales_ar);
    }
    by.set(key, m);
  }
  return [...by.values()].map(m => ({ ...m, hours: r2(m.hours), quantity: r2(m.quantity), rejected: r2(m.rejected), salesAr: Math.round(m.salesAr) })).sort((a, b) => a.type.localeCompare(b.type));
}

/** La fiche de suivi de chaque employé que `viewer` a le droit de voir, pour un mois. Triée : le plus de validations en attente d'abord, puis par nom. */
export function trackingRows(viewer: any, users: User[], posts: PostSession[], year: number, month: number, ctx: CalCtx, settings: AppSettings | any): EmpTrackingRow[] {
  const emps = trackedEmployees(viewer, users);
  if (emps.length === 0) return [];
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const first = firstActivityOf(posts);
  const sum = globalSummary(year, month, emps, { ...ctx, posts, clientFilter: 'all' }, first);
  const seePay = canSeeTrackingPay(viewer);
  const rows = sum.rows.map(r => {
    const emp = emps.find(e => e.id === r.id)!;
    const mine = posts.filter(p => p.employee_id === r.id);
    const month_ = mine.filter(p => String(p.date).startsWith(prefix));
    return {
      id: r.id, name: r.name, payMode: payModeFor(emp, settings),
      workedDays: r.workedDays, absences: r.absences, lateDays: r.lateDays, leaveDays: r.leaveDays,
      missions: r.missions, missionsValidated: r.validated, missionsRefused: r.refused,
      pendingMissions: mine.filter(p => !isWorkLine(p) && isPending(p)).length,
      pendingLines: mine.filter(p => isWorkLine(p) && isPending(p)).length,
      measures: measuresFor(posts, r.id, prefix),
      lastSent: ((): string | null => { const s = latest(month_.map(p => stampOf(p, 'end_sent_at') || stampOf(p, 'start_sent_at'))); return s ? hmMada(s) : null; })(),
      lastValidated: ((): string | null => { const s = latest(month_.map(p => stampOf(p, 'end_validated_at') || stampOf(p, 'start_validated_at'))); return s ? hmMada(s) : null; })(),
      pay: seePay ? r.pay : null,
    } as EmpTrackingRow;
  });
  return rows.sort((a, b) => (b.pendingMissions + b.pendingLines) - (a.pendingMissions + a.pendingLines) || a.name.localeCompare(b.name));
}

/** Une phrase courte pour une mesure : « 3 lignes · 24 h · 120 faites (4 refusées) ». Vide si rien. */
export function measureText(m: TypeMeasure): string {
  const fmt = (n: number) => String(n).replace('.', ',');
  const out: string[] = [`${m.lines} ligne${m.lines > 1 ? 's' : ''}`];
  if (m.presenceDays > 0) out.push(`${m.presenceDays} jour${m.presenceDays > 1 ? 's' : ''} de présence`);
  if (m.hours > 0) out.push(`${fmt(m.hours)} h`);
  if (m.quantity > 0) out.push(`${fmt(m.quantity)} faite${m.quantity > 1 ? 's' : ''}${m.rejected > 0 ? ` (${fmt(m.rejected)} refusée${m.rejected > 1 ? 's' : ''})` : ''}`);
  if (m.salesAr > 0) out.push(`${m.salesAr.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')} Ar vendus`);
  return out.join(' · ');
}
