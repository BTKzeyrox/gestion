// Détail du jour : connexions (connexion / déconnexion) et missions ; sessions côté serveur.
import { readFileSync } from 'node:fs';
import { dayDetail, connectionLines } from '../src/utils/dayDetail';
let fails = 0, n = 0;
const ok = (c: boolean, m: string) => { n++; if (!c) { fails++; console.log('ECHEC', m); } else console.log('OK   ', m); };
const Z = (h: number, m: number) => `2026-10-28T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`; // UTC ; Madagascar = +3 h
const att: any = { user_id: 'a', day: '2026-10-28', first_seen: Z(5, 0), last_seen: Z(9, 30), online_sec: 5400, sessions: [{ in: Z(5, 0), last: Z(7, 0), out: Z(7, 1) }, { in: Z(8, 0), last: Z(9, 30) }] };
const P = (id: string, st: string, s: string, e: string | undefined, i: number, c: number, pay = 0) => ({ id, employee_id: 'a', client_name: 'Mission A', date: '2026-10-28', start_time: s, end_time: e, initial_score: i, current_score: c, final_score: st === 'completed' ? c : undefined, target_score: 5000000, status: st, calculated_ar: pay }) as any;
const posts = [P('1', 'completed', '08:05:00', '10:35:00', 0, 3000000, 3000), P('2', 'rejected', '11:00:00', '11:30:00', 0, 0), P('3', 'active', '13:00:00', undefined, 0, 1000000)];
const d = dayDetail(posts, att, 'a', '2026-10-28', Date.parse(Z(9, 31)), '2026-10-29');
ok(d.firstSeen === '08:00' && d.lastSeen === '12:30', 'heures affichées à l\'heure de Madagascar (UTC+3)');
ok(d.connections.length === 2 && d.connections[0].from === '08:00' && d.connections[0].state === 'out' && d.connections[0].to === '10:01', '1re connexion : 08:00, déconnecté à 10:01');
ok(d.connections[1].from === '11:00' && d.connections[1].state === 'lost' && d.connections[1].to === '12:30', '2e connexion : plus de signe de vie, fin = dernier signe (12:30)');
const live = connectionLines(att, Date.parse(Z(9, 31)), true);
ok(live[1].state === 'live' && live[1].to === null, 'aujourd\'hui, signe de vie récent : « en ligne maintenant »');
ok(d.missions.length === 3 && d.missions[0].minutes === 150 && d.missions[0].status === 'validated' && d.missions[0].pay === 3000, 'mission validée : 08:05 → 10:35 = 150 min, paie 3 000');
ok(d.missions[1].status === 'refused' && d.missions[2].status === 'running' && d.missions[2].end === null, 'refusée et en cours');
ok(d.totals.missions === 3 && d.totals.validated === 1 && d.totals.refused === 1 && d.totals.running === 1 && d.totals.pay === 3000 && d.totals.gain === 3000000, 'totaux du jour');
ok(d.arrival === '08:00' && d.departure === '12:30' && d.departureKind === 'lost', 'arrivée 08:00, départ 12:30 (fin de la dernière connexion)');
const liveD = dayDetail(posts, att, 'a', '2026-10-28', Date.parse(Z(9, 31)), '2026-10-28');
ok(liveD.departureKind === 'live' && liveD.departure === null, 'aujourd\'hui et en ligne : pas de départ');
const old = dayDetail(posts, { ...att, sessions: undefined }, 'a', '2026-10-28', 0, '2026-10-29');
ok(old.hasConnectionLog === false && old.arrival === '08:00' && old.departure === '12:30', 'ancien jour sans historique : première connexion et dernier signe gardés');
const srv = readFileSync('supabase/functions/df-api/index.ts', 'utf8');
ok(/sessions: nextSessions\(row\?\.sessions, now\)/.test(srv) && /closeAttendanceSession\(me\)/.test(srv) && /online_sec,sessions'/.test(srv), 'serveur : sessions écrites, fermées à la déconnexion et renvoyées');
ok(/const SESSION_GAP_MS = 150_000/.test(srv) && /const SESSIONS_MAX = 40/.test(srv), 'serveur : coupure à 150 s, 40 sessions au plus par jour');
ok(/attendanceRoute[\s\S]{0,400}me\.role !== 'admin'\) q = q\.eq\('user_id', me\.id\)/.test(srv), 'serveur : un opérateur ne voit que ses propres connexions (inchangé)');
// Lignes de la feuille du jour : heure d'envoi et heure de validation (posées par le serveur), affichées à l'heure de Madagascar
const W = (id: string, st: string, extra: any) => ({ id, employee_id: 'a', client_name: 'Production', work_type: 'production', quantity: 40, rejected: 0, date: '2026-10-28', start_time: '07:00:00', status: st, ...extra });
const dw = dayDetail([W('w1', 'completed', { start_sent_at: '2026-10-28T04:00:00.000Z', start_validated_at: '2026-10-28T04:15:00.000Z', end_validated_at: '2026-10-28T04:15:00.000Z' }), W('w2', 'pending_start', { start_sent_at: '2026-10-28T05:00:00.000Z' }), W('w3', 'completed', {})] as any, undefined, 'a', '2026-10-28', Date.parse(Z(9, 31)), '2026-10-29');
const w1 = dw.workLines.find(x => x.id === 'w1'), w2 = dw.workLines.find(x => x.id === 'w2'), w3 = dw.workLines.find(x => x.id === 'w3');
ok(!!w1 && w1.sent === '07:00' && w1.validated === '07:15', 'ligne validée : envoi 07:00 et validé 07:15 (heure de Madagascar)');
ok(!!w2 && w2.sent === '08:00' && w2.validated === null, 'ligne en attente : heure d\'envoi, pas d\'heure de validation');
ok(!!w3 && w3.sent === null && w3.validated === null, 'ligne sans heures posées par le serveur : rien d\'inventé');
console.log(`\n${n - fails}/${n} contrôles réussis`);
if (fails) { console.log(`${fails} ÉCHEC(S)`); process.exit(1); }
