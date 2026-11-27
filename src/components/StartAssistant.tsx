// Assistant de départ (E6, TODO_SUIVI_PAIE.md) : une carte en haut du tableau de bord de l'admin, tant qu'aucun métier n'est choisi. 4 questions, une par écran,
// puis un résumé ; « Appliquer » enregistre 4 réglages de l'entreprise (métier, paie par défaut, envoi par l'employé, retard) et rien d'autre.
// Utilisé par : views/admin/AdminDashboard.tsx. Règles : utils/startAssistant.ts (pures, contrôlées par check:start-assistant). Enregistrement : db.updateSettings (même filtre que les Conditions).
// Pour modifier : « Plus tard » ferme l'assistant sur CET appareil (localStorage) ; il disparaît pour de bon dès qu'un métier est choisi. Textes FR/EN avec t(fr, en).
import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { db } from '../db/store';
import { useApp } from '../context/AppContext';
import { cleanCompany, readCompany } from '../utils/companyRules';
import { BUSINESS_MODELS, PAY_MODES, PAY_LABEL } from '../utils/workTypes';
import { shouldShowAssistant, defaultPayFor, startPatch, LATE_RULES, type Answers } from '../utils/startAssistant';

const KEY = 'df_start_assistant_closed';
const closedHere = (): boolean => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const LATE_TEXT: Record<string, [string, string]> = {
  never: ['Jamais : le retard est seulement noté', 'Never: lateness is only recorded'],
  per_minute: ['À la minute (paie par jour)', 'Per minute (day pay)'],
  per_15: ['Par tranche de 15 minutes (paie par jour)', 'Per 15-minute block (day pay)'],
};

export const StartAssistant: React.FC = () => {
  const app = useApp(); const L = app.theme === 'light'; const en = app.lang === 'en'; const t = (fr: string, e: string) => (en ? e : fr);
  const [closed, setClosed] = useState(closedHere());
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({ employee_entry: false, late_rule: 'never' });
  const [err, setErr] = useState('');
  const [, force] = useState(0);
  useEffect(() => db.subscribe(() => force(n => n + 1)), []); // dès que le métier est enregistré (ici ou sur un autre appareil), la carte disparaît
  const me = db.getCurrentUser();
  const company = readCompany(db.getSettings().company);
  if (!shouldShowAssistant(me?.role, company, closed)) return null;

  const card = `rounded-2xl border ${L ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'} p-4 space-y-3`;
  const sub = L ? 'text-slate-600' : 'text-slate-300';
  const opt = (on: boolean) => `w-full text-left min-h-[44px] px-3 py-2 rounded-xl border text-sm cursor-pointer ${on ? 'bg-emerald-600 border-emerald-600 text-white' : L ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-600 text-slate-100'}`;
  const later = () => { try { localStorage.setItem(KEY, '1'); } catch { /* sans stockage : il revient à la prochaine ouverture */ } setClosed(true); };
  const TOTAL = 4; // questions ; l'écran 5 est le résumé
  const canNext = step === 0 ? !!a.business_model : step === 1 ? !!a.pay_default : true;
  const go = (n: number) => { setErr(''); setStep(n); };

  const apply = () => {
    const p = startPatch(a);
    if (!p.ok) { setErr(t('Il manque une réponse.', 'An answer is missing.')); return; }
    const cur = readCompany(db.getSettings().company);
    const r = cleanCompany({ ...cur, work: { ...cur.work, ...p.work } }, cur);
    if (r.errors.length) { setErr(t('Ces réglages ne passent pas le contrôle : ', 'These settings do not pass the check: ') + r.errors.join(', ')); return; }
    db.updateSettings({ company: r.value }); // le métier choisi fait disparaître l'assistant pour de bon
  };

  const model = BUSINESS_MODELS.find(m => m.id === a.business_model);
  return (
    <section data-start-assistant className={card} aria-label={t('Assistant de départ', 'Setup assistant')}>
      <div className="flex items-start justify-between gap-2">
        <h2 className={`flex items-center gap-2 text-base font-bold ${L ? 'text-slate-900' : 'text-white'}`}><Sparkles className="w-4 h-4 text-emerald-500" />{t('Régler le site pour ton entreprise', 'Set the site up for your business')}</h2>
        <button type="button" data-start-later onClick={later} className={`min-h-[44px] px-2 inline-flex items-center gap-1 text-xs cursor-pointer ${sub}`}><X className="w-3.5 h-3.5" />{t('Plus tard', 'Later')}</button>
      </div>
      <p className={`text-xs ${sub}`}>{step < TOTAL ? `${t('Question', 'Question')} ${step + 1} ${t('sur', 'of')} ${TOTAL}` : t('Résumé', 'Summary')} · {t('Rien n\'est enregistré avant « Appliquer ». Tu pourras tout changer dans Réglages.', 'Nothing is saved before “Apply”. You can change everything later in Settings.')}</p>

      {step === 0 && (<div className="space-y-2"><p className={`text-sm font-semibold ${L ? 'text-slate-800' : 'text-slate-100'}`}>{t('Quel est ton type d\'entreprise ?', 'What kind of business do you run?')}</p>
        {BUSINESS_MODELS.map(m => <button key={m.id} type="button" data-start-model={m.id} aria-pressed={a.business_model === m.id} onClick={() => setA(p => ({ ...p, business_model: m.id, pay_default: defaultPayFor(m.id) }))} className={opt(a.business_model === m.id)}><strong>{en ? m.name.en : m.name.fr}</strong><span className="block text-xs opacity-80">{en ? m.about.en : m.about.fr}</span></button>)}</div>)}

      {step === 1 && (<div className="space-y-2"><p className={`text-sm font-semibold ${L ? 'text-slate-800' : 'text-slate-100'}`}>{t('Comment paies-tu tes employés, en général ?', 'How do you usually pay your employees?')}</p>
        <p className={`text-xs ${sub}`}>{t('Chaque employé pourra avoir sa propre façon d\'être payé : tu la règles dans sa fiche.', 'Each employee can have their own way of being paid: you set it in their file.')}</p>
        {PAY_MODES.map(m => <button key={m} type="button" data-start-pay={m} aria-pressed={a.pay_default === m} onClick={() => setA(p => ({ ...p, pay_default: m }))} className={opt(a.pay_default === m)}>{en ? PAY_LABEL[m].en : PAY_LABEL[m].fr}</button>)}</div>)}

      {step === 2 && (<div className="space-y-2"><p className={`text-sm font-semibold ${L ? 'text-slate-800' : 'text-slate-100'}`}>{t('Les employés envoient-ils eux-mêmes leur journée ?', 'Do employees send their own day?')}</p>
        <p className={`text-xs ${sub}`}>{t('Si oui, l\'employé envoie sa ligne (présence, heures, quantité, montant vendu), même sans réseau. Elle reste EN ATTENTE : le chef d\'équipe ou toi la validez, et seulement alors la paie et la présence comptent.', 'If yes, the employee sends his line (presence, hours, quantity, amount sold), even without network. It stays PENDING: the team lead or you validate it, and only then do pay and presence count.')}</p>
        <button type="button" data-start-entry="yes" aria-pressed={a.employee_entry === true} onClick={() => setA(p => ({ ...p, employee_entry: true }))} className={opt(a.employee_entry === true)}>{t('Oui, ils envoient eux-mêmes', 'Yes, they send it themselves')}</button>
        <button type="button" data-start-entry="no" aria-pressed={a.employee_entry === false} onClick={() => setA(p => ({ ...p, employee_entry: false }))} className={opt(a.employee_entry === false)}>{t('Non, c\'est le chef d\'équipe ou moi qui saisis', 'No, the team lead or I enter it')}</button></div>)}

      {step === 3 && (<div className="space-y-2"><p className={`text-sm font-semibold ${L ? 'text-slate-800' : 'text-slate-100'}`}>{t('Un retard doit-il être retiré de la paie ?', 'Should lateness be deducted from pay?')}</p>
        {LATE_RULES.map(r => <button key={r} type="button" data-start-late={r} aria-pressed={a.late_rule === r} onClick={() => setA(p => ({ ...p, late_rule: r }))} className={opt(a.late_rule === r)}>{en ? LATE_TEXT[r][1] : LATE_TEXT[r][0]}</button>)}</div>)}

      {step === TOTAL && (
        <ul data-start-summary className={`space-y-1 text-sm ${L ? 'text-slate-800' : 'text-slate-100'}`}>
          <li>{t('Entreprise', 'Business')} : <strong>{model ? (en ? model.name.en : model.name.fr) : '—'}</strong></li>
          <li>{t('Paie par défaut', 'Default pay')} : <strong>{a.pay_default ? (en ? PAY_LABEL[a.pay_default as keyof typeof PAY_LABEL].en : PAY_LABEL[a.pay_default as keyof typeof PAY_LABEL].fr) : '—'}</strong></li>
          <li>{t('Les employés envoient leur journée', 'Employees send their own day')} : <strong>{a.employee_entry ? t('oui', 'yes') : t('non', 'no')}</strong></li>
          <li>{t('Retard retiré de la paie', 'Lateness deducted')} : <strong>{en ? LATE_TEXT[a.late_rule || 'never'][1] : LATE_TEXT[a.late_rule || 'never'][0]}</strong></li>
        </ul>)}

      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      <div className="flex items-center justify-between gap-2">
        <button type="button" data-start-back disabled={step === 0} onClick={() => go(step - 1)} className={`min-h-[44px] px-3 inline-flex items-center gap-1 rounded-xl border text-sm cursor-pointer disabled:opacity-40 ${L ? 'border-slate-300 text-slate-700' : 'border-slate-600 text-slate-200'}`}><ArrowLeft className="w-4 h-4" />{t('Retour', 'Back')}</button>
        {step < TOTAL
          ? <button type="button" data-start-next disabled={!canNext} onClick={() => go(step + 1)} className="min-h-[44px] px-4 inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-bold cursor-pointer disabled:opacity-40">{t('Suivant', 'Next')}<ArrowRight className="w-4 h-4" /></button>
          : <button type="button" data-start-apply onClick={apply} className="min-h-[44px] px-4 inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white text-sm font-bold cursor-pointer"><Check className="w-4 h-4" />{t('Appliquer', 'Apply')}</button>}
      </div>
    </section>
  );
};
