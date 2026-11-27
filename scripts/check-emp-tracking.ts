// Contrôle E9 (fiche de suivi par employé) et reste de E3 (mot « Présent » ou « Objectif atteint » selon le type de paie). Règles pures + câblage des écrans.
import { readFileSync } from 'node:fs';
import { trackedEmployees, canSeeTrackingPay, trackingRows, measuresFor, measureText } from '../src/utils/empTracking';
import { objectiveWord } from '../src/utils/dayStatus';
let fails = 0, n = 0;
const ok = (c: boolean, m: string) => { n++; if (!c) { fails++; console.log('ECHEC', m); } else console.log('OK   ', m); };

const U = (id: string, role: string, team?: string, extra: any = {}) => ({ id, name: id.toUpperCase(), username: id, role, team, shift: 'day', ...extra }) as any;
const admin = U('adm', 'admin'), lead = U('lead', 'team_lead', 'Atelier'), lead2 = U('lead2', 'team_lead', 'Autre'), acc = U('acc', 'accountant');
const a = U('a', 'employee', 'Atelier'), b = U('b', 'employee', 'atelier', { pay_mode: 'hour' }), c = U('c', 'employee', 'Autre'), d = U('d', 'employee');
const users = [admin, lead, lead2, acc, a, b, c, d];

// --- qui voit qui ---
ok(trackedEmployees(admin, users).map(u => u.id).join() === 'a,b,c,d', 'le responsable suit tous les opérateurs (pas les chefs ni le comptable)');
ok(trackedEmployees(lead, users).map(u => u.id).join() === 'a,b', 'le chef d\'équipe suit seulement son équipe (majuscules sans effet)');
ok(trackedEmployees(lead2, users).map(u => u.id).join() === 'c', 'un autre chef ne voit que son équipe');
ok(trackedEmployees(acc, users).length === 0 && trackedEmployees(a, users).length === 0 && trackedEmployees(null, users).length === 0, 'comptable, opérateur, personne : aucun employé');
ok(trackedEmployees({ ...lead, team: '' }, users).length === 0, 'chef sans équipe : personne');
ok(canSeeTrackingPay(admin) && !canSeeTrackingPay(lead) && !canSeeTrackingPay(acc) && !canSeeTrackingPay(a), 'seul le responsable voit les salaires');

// --- les chiffres ---
const P = (id: string, emp: string, date: string, status: string, extra: any = {}) => ({ id, employee_id: emp, employee_name: emp, client_name: 'Mission', account_tag: '', date, start_time: '08:00:00', status, initial_score: 0, current_score: 0, target_score: 100, calculated_ar: 0, ...extra }) as any;
const WL = (id: string, emp: string, date: string, status: string, extra: any = {}) => P(id, emp, date, status, { work_type: 'prod', client_name: 'Production', ...extra });
const posts = [
  P('m1', 'a', '2026-11-03', 'completed', { calculated_ar: 5000, end_sent_at: '2026-11-03T05:00:00.000Z', end_validated_at: '2026-11-03T05:15:00.000Z' }),
  P('m2', 'a', '2026-11-04', 'pending_end'),
  P('m3', 'a', '2026-10-02', 'pending_start'), // mois passé : compte quand même dans « en attente »
  P('m4', 'a', '2026-11-05', 'rejected'),
  WL('w1', 'b', '2026-11-03', 'completed', { presence: 'present', hours: 8, calculated_ar: 16000, start_sent_at: '2026-11-03T04:00:00.000Z', start_validated_at: '2026-11-03T04:15:00.000Z' }),
  WL('w2', 'b', '2026-11-04', 'completed', { presence: 'late', hours: 7.5, calculated_ar: 15000 }),
  WL('w3', 'b', '2026-11-05', 'pending_start', { presence: 'present', hours: 8 }),
  WL('w4', 'b', '2026-11-06', 'rejected', { presence: 'present', hours: 9 }),
  WL('w5', 'b', '2026-11-03', 'completed', { client_name: 'Vente', quantity: 100, rejected: 4, sales_ar: 250000 }),
  WL('x1', 'c', '2026-11-03', 'completed', { presence: 'present', hours: 8 }),
];
const ctx: any = { posts, leaves: [], today: '2026-11-20', cfg: { day_shift_start: '08:00', night_shift_start: '20:00', late_tolerance_min: 15, shift_mode: 'day' } };
const settings: any = { company: { work: {} }, price_per_mission: 5000 };
const adm = trackingRows(admin, users, posts, 2026, 10, ctx, settings);
const lead_ = trackingRows(lead, users, posts, 2026, 10, ctx, settings);
const ra = adm.find(r => r.id === 'a')!, rb = adm.find(r => r.id === 'b')!;
ok(adm.length === 4 && lead_.length === 2 && lead_.every(r => r.id === 'a' || r.id === 'b'), 'responsable : 4 fiches ; chef : 2 fiches (son équipe)');
ok(ra.pendingMissions === 2 && ra.pendingLines === 0, 'validations en attente : missions de tous les mois (novembre + octobre)');
ok(rb.pendingLines === 1 && rb.pendingMissions === 0, 'ligne de la feuille en attente comptée à part');
ok(ra.missions === 3 && ra.missionsValidated === 1 && ra.missionsRefused === 1, 'missions : 3 (1 validée, 1 refusée) en novembre');
ok(rb.payMode === 'hour' && ra.payMode === 'mission', 'le type de paie suit l\'employé (propre ou celui de l\'entreprise)');
ok(adm[0].pendingMissions + adm[0].pendingLines >= adm[1].pendingMissions + adm[1].pendingLines, 'triée : le plus de validations en attente d\'abord');
const mp = rb.measures.find(m => m.type === 'Production')!, mv = rb.measures.find(m => m.type === 'Vente')!;
ok(!!mp && mp.hours === 15.5 && mp.presenceDays === 2 && mp.validated === 2 && mp.lines === 3, 'heures : seules les lignes validées (8 + 7,5), refusée ignorée, en attente non comptée');
ok(!!mv && mv.quantity === 100 && mv.rejected === 4 && mv.salesAr === 250000, 'quantité, refusées et montant vendu');
ok(measureText(mp) === '3 lignes · 2 jours de présence · 15,5 h', 'texte d\'une mesure d\'heures');
ok(measureText(mv) === '1 ligne · 100 faites (4 refusées) · 250 000 Ar vendus', 'texte d\'une mesure de quantité et de vente');
ok(measuresFor(posts, 'b', '2026-10-').length === 0, 'un autre mois : rien');
ok(ra.lastSent === '08:00' && ra.lastValidated === '08:15', 'dernier envoi et dernière validation (heure de Madagascar, UTC+3)');
ok(rb.lastSent === '07:00' && rb.lastValidated === '07:15', 'heures d\'une ligne de feuille (début envoyé 04:00 UTC = 07:00)');

// --- le salaire reste caché ---
ok(adm.every(r => typeof r.pay === 'number') && ra.pay === 5000 && rb.pay === 31000, 'responsable : salaire du mois visible');
ok(lead_.every(r => r.pay === null) && (JSON.stringify(lead_).match(/"pay":null/g) || []).length === 2 && !/"pay":\d/.test(JSON.stringify(lead_)), 'chef d\'équipe : salaire null sur chaque fiche, aucun montant de paie');
ok(trackingRows(acc, users, posts, 2026, 10, ctx, settings).length === 0 && trackingRows(a, users, posts, 2026, 10, ctx, settings).length === 0, 'comptable et opérateur : aucune fiche');

// --- E3 : le mot du statut ---
ok(objectiveWord([]) === 'Objectif atteint' && objectiveWord(['mission', 'mission']) === 'Objectif atteint', 'paie à la mission : « Objectif atteint »');
ok(objectiveWord(['hour']) === 'Présent' && objectiveWord(['fixed', 'piece', 'day', 'commission']) === 'Présent', 'autres types de paie : « Présent »');
ok(objectiveWord(['mission', 'hour']) === 'Présent / objectif atteint', 'types mélangés : les deux mots');

// --- câblage des écrans ---
const cal = readFileSync('src/views/CalendarView.tsx', 'utf8'), tv = readFileSync('src/views/TeamValidations.tsx', 'utf8'), comp = readFileSync('src/components/EmpTrackingSheet.tsx', 'utf8');
ok(/tab\('follow', 'Suivi'\)/.test(cal) && /view === 'follow'/.test(cal) && /<EmpTrackingSheet/.test(cal), 'calendrier global : onglet « Suivi »');
ok(/<EmpTrackingSheet viewer=\{me\}/.test(tv), 'page du chef d\'équipe : la fiche est montrée');
ok(/objWord/.test(cal) && /st === 'objective_reached' \? objWord/.test(cal), 'légende et filtre : mot selon le type de paie');
ok(!/\bpay\b.*calculated_ar/.test(comp) && /r\.pay !== null/.test(comp), 'écran : le salaire n\'est affiché que si la ligne le porte');
console.log(`\n${n - fails}/${n} contrôles OK`);
process.exit(fails ? 1 : 0);
