// Fiche de suivi par employé (E9) : présences, retards, absences, heures ou quantités, validations en attente.
// Utilisé par : views/CalendarView.tsx (onglet « Suivi » du calendrier global du responsable) et views/TeamValidations.tsx (chef d'équipe : son équipe seulement).
// Pour modifier : tout le calcul est dans utils/empTracking.ts (contrôlé par check:emp-tracking). Ce composant ne fait qu'afficher ; le salaire n'est affiché que si la ligne le porte (null = caché pour ce rôle).
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { db } from '../db/store';
import type { User } from '../types';
import { trackingRows, measureText } from '../utils/empTracking';
import { PAY_LABEL } from '../utils/workTypes';
import { formatCurrencyAr } from '../utils/formatUtils';
import { useApp } from '../context/AppContext';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const todayStr = (): string => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

export const EmpTrackingSheet: React.FC<{ viewer: User; /** Si donné, seulement ces employés (filtres du calendrier). */ onlyIds?: string[]; onPick?: (id: string) => void }> = ({ viewer, onlyIds, onPick }) => {
  const L = useApp().theme === 'light';
  const [, force] = useState(0);
  useEffect(() => db.subscribe(() => force(n => n + 1)), []);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const me = db.getCurrentUser() || viewer;
  const users = db.getUsers(), posts = db.getPosts(), leaves = db.getLeaves(), settings = db.getSettings();
  const rows = useMemo(
    () => trackingRows(me, users, posts, year, month, { posts, leaves: leaves as any, today: todayStr(), cfg: settings, clientFilter: 'all' }, settings).filter(r => !onlyIds || onlyIds.includes(r.id)),
    [me, users, posts, leaves, settings, year, month, onlyIds], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const card = L ? 'bg-white border border-slate-200 rounded-2xl' : 'bg-[#0f1722] border border-slate-700 rounded-2xl';
  const txt = L ? 'text-slate-900' : 'text-white', sub = L ? 'text-slate-500' : 'text-slate-400';
  const box = `rounded-xl p-2 ${L ? 'bg-slate-50' : 'bg-white/5'}`;
  const prev = () => (month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1));
  const next = () => (month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1));
  const nav = `w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer ${L ? 'border-slate-300 text-slate-700' : 'border-slate-600 text-slate-200'}`;
  const Cell = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
    <div className={box}><div className={`text-[11px] ${sub}`}>{label}</div><div className={`font-bold text-base ${value > 0 && tone ? tone : txt}`}>{value}</div></div>
  );

  return (
    <section className="space-y-3" data-testid="emp-tracking">
      <div className="flex items-center gap-2">
        <h3 className={`font-bold text-sm flex items-center gap-2 ${txt}`}><ClipboardList className="w-4 h-4 text-emerald-500" /> Suivi des employés</h3>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={prev} className={nav} aria-label="Mois précédent"><ChevronLeft className="w-4 h-4" /></button>
          <span className={`text-xs font-semibold min-w-[8rem] text-center ${txt}`}>{MONTHS[month]} {year}</span>
          <button type="button" onClick={next} className={nav} aria-label="Mois suivant"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      {rows.length === 0 && <div className={`${card} p-4 text-sm ${sub}`} data-testid="emp-tracking-empty">{me.role === 'team_lead' && !(me.team || '').trim() ? 'Tu n\'as pas encore d\'équipe : demande au responsable de t\'en attribuer une.' : 'Aucun employé à suivre.'}</div>}
      {rows.map(r => {
        const pending = r.pendingMissions + r.pendingLines;
        return (
          <article key={r.id} className={`${card} p-3 space-y-2`} data-testid={`emp-track-${r.id}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {onPick ? <button type="button" onClick={() => onPick(r.id)} className={`font-bold text-sm text-left cursor-pointer ${txt}`}>{r.name}</button> : <span className={`font-bold text-sm ${txt}`}>{r.name}</span>}
              <span className={`text-[11px] ${sub}`}>Paie {PAY_LABEL[r.payMode].fr}</span>
              <span className={`ml-auto text-xs font-bold ${pending > 0 ? 'text-amber-500' : sub}`} data-testid={`emp-track-pending-${r.id}`}>
                {pending > 0 ? `${pending} validation${pending > 1 ? 's' : ''} en attente${r.pendingLines > 0 ? ` (dont ${r.pendingLines} de la feuille du jour)` : ''}` : 'Rien en attente'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Cell label="Présents" value={r.workedDays} />
              <Cell label="Absences" value={r.absences} tone="text-red-500" />
              <Cell label="Retards" value={r.lateDays} tone="text-amber-500" />
              <Cell label="Congés" value={r.leaveDays} />
            </div>
            {r.measures.length > 0 && (
              <div className={`${box} space-y-0.5 text-xs`} data-testid={`emp-track-measures-${r.id}`}>
                <div className={`text-[11px] font-bold uppercase ${sub}`}>Feuille du jour (lignes validées)</div>
                {r.measures.map(m => <div key={m.type} className={sub}><strong className={txt}>{m.type}</strong> · {measureText(m)}</div>)}
              </div>
            )}
            <div className={`flex flex-wrap gap-x-4 gap-y-0.5 text-xs ${sub}`}>
              {r.missions > 0 && <span>{r.missions} mission{r.missions > 1 ? 's' : ''} · {r.missionsValidated} validée{r.missionsValidated > 1 ? 's' : ''}{r.missionsRefused ? ` · ${r.missionsRefused} refusée${r.missionsRefused > 1 ? 's' : ''}` : ''}</span>}
              {r.lastSent && <span>Dernier envoi : <strong className={txt}>{r.lastSent}</strong></span>}
              {r.lastValidated && <span>Dernière validation : <strong className={txt}>{r.lastValidated}</strong></span>}
              {r.pay !== null && <span className="text-emerald-600 font-bold" data-testid={`emp-track-pay-${r.id}`}>{formatCurrencyAr(r.pay)}</span>}
            </div>
          </article>
        );
      })}
    </section>
  );
};
