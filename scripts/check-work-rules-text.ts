// Règles écrites par type de travail (Réglages) : relues depuis les règles existantes, jamais inventées. Contrôle : npm run check:work-rules-text
import { readFileSync } from 'node:fs';
import { workRuleLines } from '../src/utils/workRulesText';
import { BUSINESS_MODELS } from '../src/utils/workTypes';
let fails = 0, n = 0;
const ok = (c: boolean, m: string) => { n++; if (!c) { fails++; console.log('ECHEC', m); } else console.log('OK   ', m); };
const pres: any = { id: 'p', name: { fr: 'Présence', en: 'Presence' }, measure: 'presence', pay: 'day', entry: ['admin', 'team_lead'] };
const qty: any = { id: 'q', name: { fr: 'Emballage', en: 'Packing' }, measure: 'quantity', pay: 'piece', entry: ['team_lead'], unit: { fr: 'boîte', en: 'box' } };
const proof: any = { id: 'm', name: { fr: 'Mission', en: 'Mission' }, measure: 'proof', pay: 'mission', entry: ['employee'] };
const work = { rate_day_ar: 15000, rate_piece_ar: 0, late_rule: 'per_15', absence_paid_sick: true, absence_paid_leave: true };
const keys = (t: any, w: any = work) => workRuleLines(t, w).map(l => l.key).join(',');
const txt = (t: any, w: any = work) => workRuleLines(t, w).map(l => l.fr).join(' | ');
ok(keys(pres) === 'enter,ask,calendar,pay,stock,late,absence', 'présence : saisie, champs, calendrier, paie, stock, retard, absence');
ok(keys(qty) === 'enter,ask,calendar,pay,stock' && keys(proof) === 'enter,ask,calendar,pay,stock', 'quantité et preuve : pas de règle de retard ni d\'absence');
ok(/15[\s  ]?000 Ar/.test(txt(pres)) && /par tranche de 15/.test(txt(pres)) && /maladie, congé/.test(txt(pres)), 'présence : tarif, retard et absences payées lus des réglages');
ok(/AUCUN TARIF/.test(txt(qty)) && /boîte/.test(txt(qty)), 'quantité sans tarif : avertissement clair + unité');
ok(/« Travail saisi »/.test(txt(pres)) && /jamais comme une mission/.test(txt(qty)) && /suit les missions/.test(txt(proof)), 'calendrier : travail saisi pour présence/quantité, missions pour la preuve');
ok(/aucun motif/.test(txt(pres, {})) && /jamais/.test(txt(pres, {})), 'réglages vides : valeurs de départ (retard jamais retiré, aucune absence payée)');
ok(workRuleLines(pres, null as any).length === 7 && workRuleLines(pres, 'x' as any).length === 7, 'réglages cassés : jamais d\'erreur');
ok(BUSINESS_MODELS.every(m => m.types.every(t => workRuleLines(t, work).length >= 4 && workRuleLines(t, work).every(l => l.fr && l.en))), 'tous les types de tous les modèles ont leurs règles, en français et en anglais');
const ui = readFileSync('src/components/CustomWorkTypes.tsx', 'utf8');
ok(/workRuleLines/.test(ui) && /data-work-rules/.test(ui) && /findModel\(work\.business_model\)/.test(ui), 'écran : règles de chaque type actif (modèle + types créés)');
// Commission : le tarif se lit en pourcentage ; le site demande le montant vendu
const sale = { id: 'c-vente', name: { fr: 'Vente', en: 'Sale' }, measure: 'sales', pay: 'commission', entry: ['admin'] } as any;
ok(/le montant vendu/.test(txt(sale, { rate_commission_ar: 5 })) && /tarif de l'entreprise 5 %/.test(txt(sale, { rate_commission_ar: 5 })) && !/5 Ar/.test(txt(sale, { rate_commission_ar: 5 })) && /AUCUN TARIF/.test(txt(sale, {})), 'commission : « le montant vendu », tarif en pourcentage (jamais en Ar), avertissement sans tarif');
// Lien facultatif avec le stock : toujours une ligne, qui dit la vérité
const withStock = (stock: any) => ({ ...qty, stock }) as any;
const nm = (id: string) => (id === 'prod-abc123' ? 'Cartons' : '(produit supprimé)');
const stockLine = (t: any) => workRuleLines(t, work, nm).find(l => l.key === 'stock')!;
ok(/aucun lien/.test(stockLine(qty).fr) && /no link/.test(stockLine(qty).en), 'stock : sans réglage, la règle dit « aucun lien » (par défaut)');
ok(/fait monter le stock de « Cartons » \(2 par boîte faite/.test(stockLine(withStock({ mode: 'in', product_id: 'prod-abc123', per_unit: 2 })).fr) && /adds to the stock of "Cartons"/.test(stockLine(withStock({ mode: 'in', product_id: 'prod-abc123', per_unit: 2 })).en), 'stock : entrée décrite en français et en anglais, avec le produit et la quantité par unité');
ok(/consomme « Cartons »/.test(stockLine(withStock({ mode: 'out', product_id: 'prod-abc123', per_unit: 1 })).fr) && /le stock baisse/.test(stockLine(withStock({ mode: 'out', product_id: 'prod-abc123', per_unit: 1 })).fr), 'stock : sortie décrite (le stock baisse)');
ok(/signal/.test(stockLine(withStock({ mode: 'gap' })).fr) && /produit supprimé/.test(stockLine(withStock({ mode: 'in', product_id: 'prod-zzz999', per_unit: 1 })).fr), 'stock : signal seulement ; un produit supprimé est dit tel quel');
console.log(`\n${n - fails}/${n} contrôles réussis`);
if (fails) { console.log(`${fails} ÉCHEC(S)`); process.exit(1); }
