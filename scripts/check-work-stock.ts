// Lien facultatif travail validé -> stock (E8). Lancer : npm run check:work-stock
import { workStockMove, findWorkTypeById } from '../src/utils/workStock';
import { readFileSync } from 'node:fs';

let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log('ECHEC', m); } else console.log('OK   ', m); };
const prod = new Set(['prod-abc123']);
const T = (stock: any) => ({ id: 'c-emb', name: { fr: 'Emballage', en: 'Packing' }, measure: 'quantity', pay: 'piece', entry: ['admin'], unit: { fr: 'boîte', en: 'box' }, ...(stock ? { stock } : {}) }) as any;
const P = (x: any = {}) => ({ id: 'w1', work_type: 'c-emb', status: 'completed', quantity: 40, rejected: 5, date: '2026-11-25', ...x });
const skip = (r: any) => r.skip;

ok(skip(workStockMove(P(), T(null), prod, [])) === 'none', 'aucun réglage : aucun lien avec le stock (par défaut)');
ok(skip(workStockMove(P(), T({ mode: 'gap' }), prod, [])) === 'none', 'signal seulement : aucun mouvement');
const inn = workStockMove(P(), T({ mode: 'in', product_id: 'prod-abc123', per_unit: 1 }), prod, []) as any;
ok(inn.move && inn.move.type === 'in' && inn.move.qty === 35 && inn.move.product_id === 'prod-abc123' && inn.move.work_post_id === 'w1' && inn.move.date === '2026-11-25', 'entrée : 40 faites - 5 refusées = 35 de plus en stock, avec l\'identifiant de la ligne');
const out = workStockMove(P(), T({ mode: 'out', product_id: 'prod-abc123', per_unit: 0.25 }), prod, []) as any;
ok(out.move && out.move.type === 'out' && out.move.qty === 8.75, 'sortie : 35 pièces x 0,25 produit = 8,75 de moins en stock');
ok(skip(workStockMove(P(), T({ mode: 'in', product_id: 'prod-abc123', per_unit: 1 }), prod, [{ work_post_id: 'w1' }])) === 'already', 'jamais en double : une ligne qui a déjà son mouvement n\'en crée pas un autre');
ok(!!(workStockMove(P({ id: 'w2' }), T({ mode: 'in', product_id: 'prod-abc123', per_unit: 1 }), prod, [{ work_post_id: 'w1' }]) as any).move, 'une autre ligne crée son propre mouvement');
for (const st of ['pending_start', 'pending_end', 'active', 'rejected']) ok(skip(workStockMove(P({ status: st }), T({ mode: 'in', product_id: 'prod-abc123', per_unit: 1 }), prod, [])) === 'not_validated', `ligne « ${st} » : rien tant qu'elle n'est pas validée`);
ok(skip(workStockMove(P({ work_type: undefined }), T({ mode: 'in', product_id: 'prod-abc123', per_unit: 1 }), prod, [])) === 'not_line' && skip(workStockMove(null, T(null), prod, [])) === 'not_line', 'une mission normale (sans type de travail) ne touche jamais le stock');
ok(skip(workStockMove(P(), T({ mode: 'in', product_id: 'prod-zzz999', per_unit: 1 }), prod, [])) === 'product', 'produit supprimé : on ne fait rien, la validation n\'est pas bloquée');
ok(skip(workStockMove(P({ quantity: 5, rejected: 5 }), T({ mode: 'in', product_id: 'prod-abc123', per_unit: 1 }), prod, [])) === 'empty' && skip(workStockMove(P({ quantity: undefined }), T({ mode: 'in', product_id: 'prod-abc123', per_unit: 1 }), prod, [])) === 'empty' && skip(workStockMove(P({ quantity: 10, rejected: 30 }), T({ mode: 'out', product_id: 'prod-abc123', per_unit: 1 }), prod, [])) === 'empty', 'rien de fait (ou tout refusé) : aucun mouvement');
ok(skip(workStockMove(P(), undefined, prod, [])) === 'none', 'type inconnu : aucun lien');
ok(findWorkTypeById('c-emb', [T(null)])?.id === 'c-emb' && findWorkTypeById('prod-piece')?.id === 'prod-piece' && findWorkTypeById('nimporte') === undefined && findWorkTypeById(5 as any) === undefined, 'recherche d\'un type : ceux de l\'entreprise, puis ceux des modèles');
const src = readFileSync('src/utils/workStock.ts', 'utf8');
ok(!/fetch\(|XMLHttpRequest|localStorage|Date\.now\(\)|new Date\(\)|setTimeout|Math\.random/.test(src), 'règles pures : aucun réseau, aucune donnée, aucune horloge');
console.log(fails ? `\n${fails} échec(s)` : '\nTout est bon.');
if (fails) process.exit(1);
