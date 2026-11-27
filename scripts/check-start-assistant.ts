// Assistant de départ : règles pures (E6). Lancer : npm run check:start-assistant
import { shouldShowAssistant, defaultPayFor, startPatch, LATE_RULES } from '../src/utils/startAssistant';
import { BUSINESS_MODELS, PAY_MODES } from '../src/utils/workTypes';
import { readCompany, cleanCompany, COMPANY_DEFAULTS } from '../src/utils/companyRules';
import { readFileSync } from 'node:fs';

let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log('ECHEC', m); } else console.log('OK   ', m); };
const none = readCompany(undefined);
const chosen = readCompany({ work: { business_model: 'shop' } });

ok(shouldShowAssistant('admin', none, false) === true, 'l\'admin sans métier choisi : l\'assistant est proposé');
ok(shouldShowAssistant('admin', chosen, false) === false, 'dès qu\'un métier est choisi : plus d\'assistant (il ne revient jamais)');
ok(shouldShowAssistant('admin', none, true) === false, 'fermé sur cet appareil : il ne revient pas');
ok(['employee', 'team_lead', 'accountant', undefined, null, 'x'].every(r => shouldShowAssistant(r, none, false) === false), 'jamais pour un autre rôle que l\'admin');
ok(shouldShowAssistant('admin', null, false) === true && shouldShowAssistant('admin', {}, false) === true && shouldShowAssistant('admin', { work: {} }, false) === true, 'réglages absents ou vides : proposé (jamais de plantage)');

ok(BUSINESS_MODELS.every(m => PAY_MODES.includes(defaultPayFor(m.id))), 'chaque métier propose une paie connue');
ok(defaultPayFor('workshop') === 'piece' && defaultPayFor('office') === 'fixed' && defaultPayFor('other') === 'mission' && defaultPayFor(undefined) === 'mission' && defaultPayFor('inconnu') === 'mission', 'paie proposée : atelier à la pièce, bureau en salaire fixe, autre ou inconnu par mission');

const good = { business_model: 'workshop', pay_default: 'piece', employee_entry: true, late_rule: 'per_15' };
const p = startPatch(good) as any;
ok(p.ok && JSON.stringify(p.work) === JSON.stringify(good), 'réponses valides : exactement les 4 réglages, rien d\'autre');
ok(!(startPatch({ ...good, business_model: 'nimporte' }) as any).ok && (startPatch({ ...good, business_model: 'nimporte' }) as any).error === 'business_model' && (startPatch({} as any) as any).error === 'business_model', 'métier inconnu ou absent : refusé');
ok((startPatch({ ...good, pay_default: 'gratuit' }) as any).error === 'pay_default' && (startPatch({ ...good, pay_default: undefined }) as any).error === 'pay_default', 'paie inconnue : refusée');
ok((startPatch({ ...good, employee_entry: 'oui' as any }) as any).error === 'employee_entry' && (startPatch({ ...good, employee_entry: undefined }) as any).error === 'employee_entry', 'oui/non : seulement vrai ou faux');
ok((startPatch({ ...good, late_rule: 'toujours' }) as any).error === 'late_rule', 'règle de retard inconnue : refusée');
ok(startPatch(null as any).ok === false, 'réponses absentes : refusées sans plantage');
ok(PAY_MODES.every(pm => (startPatch({ ...good, pay_default: pm }) as any).ok) && LATE_RULES.every(lr => (startPatch({ ...good, late_rule: lr }) as any).ok) && BUSINESS_MODELS.every(m => (startPatch({ ...good, business_model: m.id }) as any).ok), 'tous les modes, retards et métiers du site passent');

// Le résultat passe le filtre des réglages de l'entreprise (le même que le serveur) et ne change RIEN d'autre
const cur = readCompany({ identity: { name: 'Mon entreprise' }, work: { rate_day_ar: 12000, stock_gap_pct: 15 } });
const next = { ...cur, work: { ...cur.work, ...p.work } };
const r = cleanCompany(next, cur);
ok(r.errors.length === 0 && r.value.work.business_model === 'workshop' && r.value.work.pay_default === 'piece' && r.value.work.employee_entry === true && r.value.work.late_rule === 'per_15', 'le filtre des réglages accepte le résultat');
ok(r.value.work.rate_day_ar === 12000 && r.value.work.stock_gap_pct === 15 && r.value.identity.name === 'Mon entreprise', 'les tarifs, le seuil de stock et l\'identité déjà réglés ne bougent pas');
ok(COMPANY_DEFAULTS.work.employee_entry === false && COMPANY_DEFAULTS.work.business_model === '', 'valeurs de départ : aucun métier, l\'envoi par l\'employé éteint');

const src = readFileSync('src/utils/startAssistant.ts', 'utf8');
ok(!/fetch\(|XMLHttpRequest|localStorage|Date\.now\(\)|new Date\(\)|setTimeout|Math\.random/.test(src), 'règles pures : aucun réseau, aucune donnée, aucune horloge');
// L'écran : une carte sur le tableau de bord de l'admin, qui n'enregistre que les 4 réglages, avec le même filtre que les Conditions
const card = readFileSync('src/components/StartAssistant.tsx', 'utf8');
const dash = readFileSync('src/views/admin/AdminDashboard.tsx', 'utf8');
ok(/shouldShowAssistant\(me\?\.role, company, closed\)\) return null/.test(card) && card.lastIndexOf('useState(') < card.indexOf('return null') && card.lastIndexOf('useEffect(') < card.indexOf('return null'), 'écran : rien si les règles disent non ; tous les « hooks » avant le retour anticipé');
ok(/startPatch\(a\)/.test(card) && /cleanCompany\(\{ \.\.\.cur, work: \{ \.\.\.cur\.work, \.\.\.p\.work \} \}, cur\)/.test(card) && /db\.updateSettings\(\{ company: r\.value \}\)/.test(card), 'écran : « Appliquer » = les 4 réglages fusionnés dans les réglages actuels, filtrés comme les Conditions, puis enregistrés');
ok(/data-start-later/.test(card) && /localStorage\.setItem\(KEY, '1'\)/.test(card) && /data-start-back/.test(card), 'écran : « Plus tard » ferme sur cet appareil, « Retour » existe');
ok(/import \{ StartAssistant \}/.test(dash) && /\{!isValidations && <StartAssistant \/>\}/.test(dash), 'la carte est sur le tableau de bord de l\'admin (pas sur la page Validations)');
ok(!/start-assistant|StartAssistant/.test(readFileSync('src/utils/menuGroups.ts', 'utf8')), 'aucune nouvelle entrée de menu');
console.log(fails ? `\n${fails} échec(s)` : '\nTout est bon.');
if (fails) process.exit(1);
