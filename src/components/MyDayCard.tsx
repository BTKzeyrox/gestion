// « Envoyer ma journée » (E5b, TODO_SUIVI_PAIE.md) : l'employé envoie lui-même sa ligne (présence, heures, quantité ou montant vendu) ; elle attend la validation
// du chef d'équipe ou du responsable, et seulement alors la paie et la présence comptent. Visible seulement si l'entreprise l'a permis (réglage « employee_entry »).
// Utilisé par : views/employee/EmployeeDashboard.tsx. Règles : utils/myDay.ts (pures, contrôlées par check:my-day) ; envoi : db.addWorkEntries (file hors ligne comprise).
// Pour modifier : le serveur refait toutes les vérifications (df-api, bloc WORKENTRY) ; l'écran ne fait que guider. Textes FR/EN avec t(fr, en).
import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { db } from '../db/store';
import { useApp } from '../context/AppContext';
import { readCompany } from '../utils/companyRules';
import { findModel, PRESENCE_LABEL, PRESENCE_VALUES, type WorkType } from '../utils/workTypes';
import { myDayTypes, myDayDates, myDayShows, myDayLine, type MyDayFields } from '../utils/myDay';
import { workLineRows } from '../utils/dayDetail';
import { SHEET_QUEUED_TEXT } from '../utils/sheetOutbox';
import { SheetOutboxBanner } from './SheetOutboxBanner';

const madaToday = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
const REASON: Record<string, [string, string]> = {
  employee: ['Tu ne peux envoyer que ta propre ligne', 'You can only send your own line'], type: ['Type de travail inconnu', 'Unknown work type'], presence: ['Présence inconnue', 'Unknown presence'],
  hours: ['Heures : 0 à 24', 'Hours: 0 to 24'], quantity: ['Quantité : un nombre positif', 'Quantity: a positive number'], rejected: ['Refusées : pas plus que les faites', 'Rejected: no more than done'],
  sales_ar: ['Montant vendu : un nombre entier d\'Ar', 'Amount sold: a whole number of Ar'], empty: ['Rien à envoyer : remplis au moins une case', 'Nothing to send: fill in at least one box'],
  duplicate: ['Déjà envoyé pour ce jour et ce type', 'Already sent for this day and type'], bad: ['Ligne illisible', 'Unreadable line'],
};
const SHEET_ERR: Record<string, [string, string]> = {
  role: ['L\'entreprise n\'a pas permis l\'envoi par l\'employé. Demande au responsable.', 'The company has not allowed employees to send their own day. Ask the manager.'],
  date: ['Date impossible : aujourd\'hui ou hier seulement.', 'Impossible date: today or yesterday only.'], empty: ['La feuille est vide.', 'The sheet is empty.'], too_many: ['Trop de lignes.', 'Too many lines.'],
};

export const MyDayCard: React.FC = () => {
  const app = useApp(); const L = app.theme === 'light'; const en = app.lang === 'en'; const t = (fr: string, e: string) => (en ? e : fr);
  const [, force] = useState(0);
  useEffect(() => db.subscribe(() => force(n => n + 1)), []);
  const me = db.getCurrentUser();
  const company = readCompany(db.getSettings().company);
  const model = findModel(company.work.business_model);
  const custom = db.getCustomWorkTypes() as WorkType[];
  const types = useMemo(() => myDayTypes([...(model ? model.types : []), ...custom]), [model, JSON.stringify(custom)]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = madaToday(); const dates = myDayDates(today);
  const [date, setDate] = useState(today);
  const [typeId, setTypeId] = useState('');
  const [f, setF] = useState<MyDayFields>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!me || me.role !== 'employee' || company.work.employee_entry !== true) return null;

  const type = types.find(x => x.id === typeId) || types[0];
  const show = type ? myDayShows(type) : null;
  const card = `rounded-2xl border ${L ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'} p-4 space-y-3`;
  const input = `h-11 w-full rounded-xl border px-3 text-base ${L ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-600 text-slate-100'} focus:outline-none focus:border-emerald-500`;
  const label = `text-xs font-bold ${L ? 'text-slate-600' : 'text-slate-300'}`;
  const sub = L ? 'text-slate-600' : 'text-slate-300';
  const set = (p: MyDayFields) => setF(prev => ({ ...prev, ...p }));

  const send = async () => {
    if (!type || busy) return;
    setBusy(true); setMsg(null);
    const r = await db.addWorkEntries({ date, type_label: type.name.fr, lines: [myDayLine(me.id, type, f)] });
    setBusy(false);
    if (!r.ok) { const e = r.error ? SHEET_ERR[r.error] : undefined; setMsg({ ok: false, text: e ? (en ? e[1] : e[0]) : (r.error || t('Erreur : réessaie.', 'Error: try again.')) }); return; }
    if (r.queued) { setF({}); setMsg({ ok: true, text: en ? SHEET_QUEUED_TEXT.en : SHEET_QUEUED_TEXT.fr }); return; } // sans réseau : gardé sur le téléphone, part au retour du réseau (une seule fois)
    const bad = (r.failed || [])[0];
    if (bad) { const e = REASON[bad.error]; setMsg({ ok: false, text: e ? (en ? e[1] : e[0]) : t('Ligne refusée.', 'Line refused.') }); return; }
    setF({}); setMsg({ ok: true, text: t('Envoyé. Ta ligne attend la validation : la paie et la présence comptent après.', 'Sent. Your line is waiting for validation: pay and presence count after.') });
  };

  const posts = db.getPosts();
  const mine = dates.flatMap(d => workLineRows(posts, me.id, d).map(w => ({ ...w, d })));
  const stateText = (w: { state: string }) => (w.state === 'validated' ? t('validée', 'validated') : w.state === 'refused' ? t('refusée', 'refused') : t('en attente de validation', 'waiting for validation'));

  return (
    <section data-my-day className={card} aria-label={t('Envoyer ma journée', 'Send my day')}>
      <h2 className={`text-base font-bold ${L ? 'text-slate-900' : 'text-white'}`}>{t('Envoyer ma journée', 'Send my day')}</h2>
      {types.length === 0 || !type || !show ? (
        <p className={`text-sm ${sub}`}>{t('Aucun type de travail ne permet l\'envoi par l\'employé. Demande au responsable.', 'No work type allows employees to send their own line. Ask the manager.')}</p>
      ) : (
        <>
          <p className={`text-xs ${sub}`}>{t('Ta ligne attend la validation du chef d\'équipe ou du responsable. La paie et la présence comptent seulement après.', 'Your line waits for the team lead or the manager to validate it. Pay and presence count only after.')}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1"><span className={label}>{t('Jour', 'Day')}</span>
              <select data-my-day-date value={date} onChange={e => setDate(e.target.value)} className={input}>{dates.map((d, i) => <option key={d} value={d}>{i === 0 ? t('Aujourd\'hui', 'Today') : t('Hier', 'Yesterday')} ({d})</option>)}</select></label>
            <label className="block space-y-1"><span className={label}>{t('Travail', 'Work')}</span>
              <select data-my-day-type value={type.id} onChange={e => { setTypeId(e.target.value); setF({}); }} className={input}>{types.map(x => <option key={x.id} value={x.id}>{en ? x.name.en : x.name.fr}</option>)}</select></label>
          </div>
          {show.presence && (
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={t('Présence', 'Presence')}>
              {PRESENCE_VALUES.map(p => (
                <button key={p} type="button" aria-pressed={f.presence === p} data-my-day-presence={p} onClick={() => set({ presence: f.presence === p ? undefined : p })}
                  className={`min-h-[44px] px-1 rounded-xl border text-xs font-semibold cursor-pointer ${f.presence === p ? 'bg-emerald-600 border-emerald-600 text-white' : L ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>{en ? PRESENCE_LABEL[p].en : PRESENCE_LABEL[p].fr}</button>
              ))}
            </div>
          )}
          {show.hours && <label className="block space-y-1"><span className={label}>{t('Heures', 'Hours')}</span><input inputMode="decimal" data-my-day-field="hours" value={f.hours || ''} onChange={e => set({ hours: e.target.value })} className={input} placeholder="0" /></label>}
          {show.quantity && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1"><span className={label}>{type.unit ? (en ? type.unit.en : type.unit.fr) : t('Quantité faite', 'Quantity done')}</span><input inputMode="decimal" data-my-day-field="quantity" value={f.quantity || ''} onChange={e => set({ quantity: e.target.value })} className={input} placeholder="0" /></label>
              <label className="block space-y-1"><span className={label}>{t('Refusées', 'Rejected')}</span><input inputMode="decimal" data-my-day-field="rejected" value={f.rejected || ''} onChange={e => set({ rejected: e.target.value })} className={input} placeholder="0" /></label>
            </div>
          )}
          {show.sales && <label className="block space-y-1"><span className={label}>{t('Montant vendu (Ar)', 'Amount sold (Ar)')}</span><input inputMode="numeric" data-my-day-field="sales" value={f.sales || ''} onChange={e => set({ sales: e.target.value })} className={input} placeholder="0" /></label>}
          <button type="button" data-my-day-send disabled={busy} onClick={send} className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold cursor-pointer disabled:opacity-50"><Send className="w-4 h-4" />{busy ? t('Envoi…', 'Sending…') : t('Envoyer', 'Send')}</button>
        </>
      )}
      {msg && <div role="status" data-my-day-msg className={`flex items-start gap-2 text-sm ${msg.ok ? 'text-emerald-500' : 'text-red-500'}`}>{msg.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}<span>{msg.text}</span></div>}
      <SheetOutboxBanner />
      {mine.length > 0 && (
        <ul data-my-day-list className={`space-y-1 text-xs ${sub}`}>
          {mine.map(w => (
            <li key={w.id} data-my-day-line={w.id}><strong>{w.d}</strong> · {w.type} · {w.text || t('Ligne vide', 'Empty line')} · {w.unsent ? t('pas encore envoyée (sur le téléphone)', 'not sent yet (on the phone)') : stateText(w)}{w.sent ? ` · ${t('envoi', 'sent')} ${w.sent}` : ''}{w.validated ? ` · ${t('validé', 'validated')} ${w.validated}` : ''}</li>
          ))}
        </ul>
      )}
    </section>
  );
};
