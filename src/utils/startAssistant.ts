// Assistant de départ (E6, TODO_SUIVI_PAIE.md) : au premier contact, l'admin répond à quelques questions et le site se règle (métier, paie par défaut,
// envoi par l'employé, retard). Règles PURES : aucun réseau, aucune donnée, aucune horloge. L'écran : components/StartAssistant.tsx.
// Ce que l'assistant NE fait PAS : il ne crée aucun employé, aucun tarif, aucun type de travail, et ne touche à rien d'autre que ces 4 réglages de « work ».
// Contrôle : npm run check:start-assistant
import { BUSINESS_MODELS, PAY_MODES, type PayMode } from './workTypes';

export const LATE_RULES = ['never', 'per_minute', 'per_15'] as const;
export type LateRule = typeof LATE_RULES[number];
export type Answers = { business_model?: string; pay_default?: string; employee_entry?: boolean; late_rule?: string };

/** Le site propose l'assistant seulement à l'admin, tant qu'aucun métier n'est choisi, et s'il ne l'a pas fermé sur cet appareil. */
export const shouldShowAssistant = (role: unknown, company: any, dismissed: boolean): boolean =>
  role === 'admin' && !dismissed && !(company && company.work && typeof company.work.business_model === 'string' && company.work.business_model !== '');

/** La paie proposée au départ pour un métier : celle de son premier type de travail ; « par mission » si le métier n'en a pas (comme le site d'origine). */
export function defaultPayFor(modelId: string | undefined): PayMode {
  const m = BUSINESS_MODELS.find(x => x.id === modelId);
  return (m && m.types[0] && m.types[0].pay) || 'mission';
}

/** Les réglages à enregistrer, ou une erreur. Seulement des valeurs connues : une réponse fausse est refusée, jamais gardée à moitié. */
export function startPatch(a: Answers): { ok: true; work: { business_model: string; pay_default: PayMode; employee_entry: boolean; late_rule: LateRule } } | { ok: false; error: 'business_model' | 'pay_default' | 'employee_entry' | 'late_rule' } {
  if (!a || !BUSINESS_MODELS.some(m => m.id === a.business_model)) return { ok: false, error: 'business_model' };
  if (!(PAY_MODES as readonly string[]).includes(a.pay_default as string)) return { ok: false, error: 'pay_default' };
  if (typeof a.employee_entry !== 'boolean') return { ok: false, error: 'employee_entry' };
  if (!(LATE_RULES as readonly string[]).includes(a.late_rule as string)) return { ok: false, error: 'late_rule' };
  return { ok: true, work: { business_model: a.business_model as string, pay_default: a.pay_default as PayMode, employee_entry: a.employee_entry, late_rule: a.late_rule as LateRule } };
}
