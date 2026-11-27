// « Envoyer ma journée » : règles pures de l'écran de l'employé (E5b). Lancer : npm run check:my-day
import { myDayTypes, myDayDates, myDayShows, myDayLine } from '../src/utils/myDay';
import { readFileSync } from 'node:fs';

let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log('ECHEC', m); } else console.log('OK   ', m); };
const T = (id: string, measure: string, pay: string, entry: string[]) => ({ id, name: { fr: id, en: id }, measure, pay, entry }) as any;
const all = [T('a', 'presence', 'day', ['employee', 'admin']), T('b', 'quantity', 'piece', ['employee']), T('c', 'sales', 'commission', ['employee']), T('d', 'presence', 'hour', ['admin']), T('e', 'proof', 'mission', ['employee']), T('f', 'tasks', 'mission', ['employee']), T('g', 'none', 'fixed', ['employee'])];
ok(myDayTypes(all).map(t => t.id).join() === 'a,b,c', 'seuls les types ouverts à l\'employé ET mesurés par présence, quantité ou montant vendu');
ok(myDayTypes([]).length === 0, 'aucun type ouvert : liste vide (l\'écran le dit)');
ok(myDayDates('2026-11-05').join() === '2026-11-05,2026-11-04' && myDayDates('2026-03-01').join() === '2026-03-01,2026-02-28' && myDayDates('2026-01-01').join() === '2026-01-01,2025-12-31', 'aujourd\'hui et hier, même en début de mois et d\'année');
ok(myDayDates('pas une date').length === 1, 'date illisible : seulement « aujourd\'hui »');
const s = (t: any) => JSON.stringify(myDayShows(t));
ok(s(T('x', 'presence', 'day', [])) === '{"presence":true,"hours":false,"quantity":false,"sales":false}' && s(T('x', 'presence', 'hour', [])) === '{"presence":true,"hours":true,"quantity":false,"sales":false}' && s(T('x', 'quantity', 'piece', [])) === '{"presence":false,"hours":false,"quantity":true,"sales":false}' && s(T('x', 'sales', 'commission', [])) === '{"presence":false,"hours":false,"quantity":false,"sales":true}', 'champs montrés selon la mesure et la paie');
const full = { presence: 'present', hours: '7,5', quantity: '40', rejected: '3', sales: '20000' };
ok(JSON.stringify(myDayLine('e1', T('a', 'presence', 'day', []), full)) === '{"employee_id":"e1","work_type":"a","presence":"present"}', 'présence payée au jour : seulement la présence (les heures ne partent pas)');
ok(JSON.stringify(myDayLine('e1', T('d', 'presence', 'hour', []), full)) === '{"employee_id":"e1","work_type":"d","presence":"present","hours":"7,5"}', 'présence payée à l\'heure : présence et heures');
ok(JSON.stringify(myDayLine('e1', T('b', 'quantity', 'piece', []), full)) === '{"employee_id":"e1","work_type":"b","quantity":"40","rejected":"3"}', 'quantité : faites et refusées seulement');
ok(JSON.stringify(myDayLine('e1', T('c', 'sales', 'commission', []), full)) === '{"employee_id":"e1","work_type":"c","sales_ar":"20000"}', 'montant vendu : seulement le montant');
ok(myDayLine('e1', T('b', 'quantity', 'piece', []), { quantity: '  ', rejected: '' }).quantity === undefined && myDayLine('e1', T('b', 'quantity', 'piece', []), {}).rejected === undefined, 'cases vides : rien n\'est envoyé (jamais « 0 » inventé)');
ok(myDayLine('moi', T('b', 'quantity', 'piece', []), full).employee_id === 'moi', 'la ligne est toujours pour l\'employé qui envoie');
const src = readFileSync('src/utils/myDay.ts', 'utf8');
ok(!/fetch\(|XMLHttpRequest|localStorage|Date\.now\(\)|new Date\(\)\b(?!\s*;)|setTimeout|Math\.random/.test(src.replace(/new Date\(today \+/g, '')), 'règles pures : aucun réseau, aucune donnée, aucune horloge');
// L'écran : une carte sur la page « Ma mission » de l'employé (aucune nouvelle entrée de menu), visible seulement si l'entreprise l'a permis
const card = readFileSync('src/components/MyDayCard.tsx', 'utf8');
const dash = readFileSync('src/views/employee/EmployeeDashboard.tsx', 'utf8');
ok(/me\.role !== 'employee' \|\| company\.work\.employee_entry !== true\) return null/.test(card), 'écran : rien du tout pour un autre rôle, ni quand l\'entreprise n\'a pas permis l\'envoi');
ok(card.lastIndexOf('useState(') < card.indexOf('return null') && card.lastIndexOf('useMemo(') < card.indexOf('return null') && card.lastIndexOf('useEffect(') < card.indexOf('return null'), 'écran : tous les « hooks » avant le retour anticipé (sinon React plante)');
ok(/db\.addWorkEntries\(\{ date, type_label: type\.name\.fr, lines: \[myDayLine\(me\.id, type, f\)\] \}\)/.test(card), 'écran : une seule ligne, construite par myDayLine pour l\'employé connecté');
ok(/r\.queued/.test(card) && /SHEET_QUEUED_TEXT/.test(card) && /<SheetOutboxBanner \/>/.test(card), 'écran : sans réseau, la journée est gardée sur le téléphone, avec le bandeau « Envoyer maintenant »');
ok(/import \{ MyDayCard \}/.test(dash) && /<MyDayCard \/>/.test(dash), 'la carte est sur la page de l\'employé');
ok(!/my-day/.test(readFileSync('src/utils/menuGroups.ts', 'utf8')), 'aucune nouvelle entrée de menu (les contrôles de menu restent comme avant)');
console.log(fails ? `\n${fails} échec(s)` : '\nTout est bon.');
if (fails) process.exit(1);
