# PLAN_IMPORTANT.md — Le plan de BTK pour copier le projet (à lire si une IA plante ou change)

> Ce fichier est la **mémoire du plan dans le dépôt** : il ne dépend d'aucune IA ni d'aucune conversation. Une IA qui reprend le travail lit d'abord `LIRE_EN_PREMIER.md` (règles de BTK : récap, puis attendre « GO »), puis ce fichier, puis `NOUVEAU_PROJET.md`.
> Dernière mise à jour : 2026-11-19. Propriétaire : BTK (français, mots simples, réponses courtes).

## 1. Ce que BTK veut (décisions, dans ses mots)
- **Copier le projet** dans un **nouveau dépôt, dans le même compte GitHub**.
- **Même Vercel** (le compte n'est pas un problème).
- **Autre Supabase** : son compte Supabase actuel est limité et il va encore en changer. **C'est le vrai problème : la base de données et le serveur.**
- On **reste sur Supabase** : seulement un autre *compte*. Changer de plateforme (Netlify, Firebase…) est **hors sujet pour l'instant**.
- La copie doit être **identique** à l'original ; seuls les **comptes** changent, et le dépôt doit **savoir** quels comptes changer.
- Il faut un **guide complet** pour la copie et la passation.
- Aussi : améliorer la copie du site (rendre la copie fiable et vérifiable).

## 2. Ce qui est fait (poussé sur `main`, 2026-11-19)
| # | Sujet | Où |
|---|---|---|
| 1 | CI GitHub : lint, build et tous les `check:*` à chaque envoi | `.github/workflows/ci.yml`, `npm run check:all` |
| 2 | Copie du menu du chat sécurisée | `src/utils/longPress.ts` |
| 3 | Un seul fichier pour les comptes (Supabase, Cloudinary, GitHub) ; la construction s'arrête si c'est faux | `site.config.json`, `src/utils/siteConfig.ts`, `npm run config:sync` |
| 4 | SQL complet d'une base neuve + sauvegardes qui manquaient au dépôt + tâches planifiées sans adresse de Nprojet | `npm run setup:sql`, `supabase/migrations/20261023_create_df_backups.sql` |
| 5 | Script « copier dans mon compte » : 2 commits (copie pure identique, puis comptes) | `npm run copy:project` |
| 6 | Script de déploiement du serveur (3 fonctions) avec confirmation du projet | `npm run deploy:server` |
| 7 | Contrôle « zéro trace de l'ancien compte » | `npm run check:no-old-account` |
| 8 | Guide complet de copie et de passation | `NOUVEAU_PROJET.md`, `HANDOVER.md` § 0 bis |
| 9 | `df-api` : découpage en cours. Tranche 1 : bloc TOTP dans `totp.ts`. Tranche 2 (2026-11-20) : règles pures de la comptabilité dans `accounting.ts` | `supabase/functions/df-api/totp.ts`, `accounting.ts` |

## 2 bis. CE DÉPÔT (`BTKzeyrox/gestion`) est la copie n° 1 de Nprojet (2026-11-19)
Les textes `.md` ci-dessous parlent encore de Nprojet : c'est voulu (copie identique, **seuls les comptes changent**, décision de BTK). Les comptes de ce dépôt : `site.config.json` (Supabase `blvuwirzmtmlehafnvew`, même Cloudinary que Nprojet, dépôt `BTKzeyrox/gestion`).
- **Décisions de BTK** : base **vide** (aucune donnée de Nprojet) ; un seul compte admin, pseudo `admin`, mot de passe donné par BTK dans le chat (**à changer à la première connexion** ; jamais écrit dans le dépôt) ; même GitHub, même Vercel, autre Supabase.
- **Fait** : dépôt créé (2 commits : copie pure, puis comptes) ; `supabase/setup-complete.sql` généré (`npm run setup:sql`) et lancé par BTK dans le SQL Editor du nouveau Supabase (la 5e tâche planifiée est apparue) ; SQL du compte admin donné à BTK.
- **Reste** : (a) vérifier la base (44 tables avec RLS, 5 tâches dans `cron.job`, secret `df_project_url` = adresse du nouveau projet) ; (b) lancer le SQL du compte admin (`npm run admin:sql` le refait) ; (c) secrets Cloudinary / Resend dans le coffre-fort (`NOUVEAU_PROJET.md` § 2) ; (d) envoyer le serveur : `SUPABASE_ACCESS_TOKEN=sbp_… npm run deploy:server -- --confirm-ref blvuwirzmtmlehafnvew` (3 fonctions, tous les fichiers de `df-api`) ; (e) projet Vercel relié à `BTKzeyrox/gestion` (Vite, aucune variable) ; (f) contrôle final (`NOUVEAU_PROJET.md` § 7). Cocher ici ce qui est fait.
- **Limite** : l'IA de la session n'a pas accès au Supabase `blvuwirzmtmlehafnvew` (autre compte, réseau bloqué) : le SQL se lance à la main dans le SQL Editor. Ne jamais mettre une clé `sb_secret_…` ou `sbp_…` dans le dépôt ; la régénérer après usage.

## 2 ter. Mise à niveau de cette copie sur Nprojet (2026-11-21, dernière mise à niveau : Nprojet 5040b13, le 24 nov. ; décision de BTK : « tout remplacer par Nprojet »)
- Le code de `gestion` = le code de `Nprojet` au commit `817645b` (photos hors ligne, collage d'images Ctrl+V, galerie d'images, glissement « Retour », header 64 px, `accounting.ts`, chat, guides…). **Seuls les comptes restent ceux de `gestion`** : `site.config.json` et `supabase/functions/df-api/site-config.ts`.
- Les 5 commits de design propres à `gestion` (20 nov. : header au niveau du menu, charte BTK, thèmes, `PLAN_DESIGN.md`) sont **remplacés** par ceux de Nprojet. Ils restent lisibles dans l'historique git (`cccbf32` à `f2628c7`).
- Aucune migration nouvelle : la base de `gestion` n'a rien à rattraper. Le serveur de `gestion` n'a **pas** été redéployé (le découpage `accounting.ts` ne change pas le comportement) : au prochain déploiement, envoyer les 4 fichiers de `df-api` (voir `NOUVEAU_PROJET.md`, méthode B).
- ~~Règle : Nprojet reste la référence. Pour rattraper de nouveau : reprendre l'arbre de Nprojet, puis remettre les deux fichiers de comptes.~~ **Remplacée le 24/11 par la décision de BTK ci-dessous.**
- **DÉCISION DE BTK (24/11) : « A ». `gestion` GARDE ses propres changements.** Les mises à niveau sur Nprojet se font par **FUSION** (`git fetch` de Nprojet puis `git merge`, conflits résolus en gardant ce qui est propre à `gestion`), et **plus jamais par « tout remplacer »**. Propre à `gestion` et à garder : les deux fichiers de comptes, `TODO_SUIVI_PAIE.md`, le logo « Équipe » (6 images de `public/`), et les changements du suivi des employés (`TODO_SUIVI_PAIE.md` § 3 : E3, E4, puis E5 à E9). Un changement de serveur ne se déploie qu'avec le code du même commit (méthode B de `NOUVEAU_PROJET.md`).

## 3. Ce qui reste à faire (dans l'ordre)
1. **Première vraie copie** (jamais faite : tout a été testé en local seulement). Il faut de BTK : le nom du nouveau dépôt (`BTKzeyrox/<nom>`), le **ref du nouveau projet Supabase** (pg_cron et pg_net activés), un token GitHub avec `repo` + `workflow`, un token Supabase `sbp_…`, le choix Cloudinary (même ou autre), et le pseudo / nom / mot de passe de l'admin. Puis suivre `NOUVEAU_PROJET.md` étape par étape, **avec un essai à blanc d'abord** (`copy:project` sans `--push`, `deploy:server --dry-run`).
2. **Corriger `NOUVEAU_PROJET.md`** avec tout ce qui coince à la première copie (et le dire à BTK).
3. **Réécrire dans la copie** les textes `.md` qui citent encore Nprojet (liste donnée par `copy:project`).
4. Poursuivre le **découpage de `df-api`** (7 000 lignes), une tranche à la fois : sortir un bloc, adapter son `check:*`, `npm run check:all`, redéployer **tous les fichiers**.
5. À décider avec BTK (pas fait, pas demandé) : copier aussi des **données**, ou changer de plateforme un jour.

## 4. Comment reprendre sans l'IA précédente (5 minutes)
```bash
git clone https://github.com/BTKzeyrox/Nprojet.git && cd Nprojet && npm ci
git log --oneline -15        # ce qui a été fait, du plus récent au plus ancien
npm run check:all            # tout doit être vert (≈ 3 minutes)
npm run copy:project -- --help
```
Puis lire dans l'ordre : `LIRE_EN_PREMIER.md` → `GUIDE_SITE.md` → ce fichier → `NOUVEAU_PROJET.md` → `HANDOVER.md`.

## 5. Règles à ne pas casser
- **Pas de code sans le mot « GO »** de BTK (un document de texte demandé clairement est permis). Récap court d'abord. Voir `LIRE_EN_PREMIER.md`.
- **Ne jamais toucher** à `DF-boosting` ni à `nova-language-coach`. Le dépôt d'origine `Nprojet` n'est jamais écrasé par une copie.
- **Aucun secret dans le dépôt** (tokens, clés, mots de passe). Les tokens se donnent dans le chat, se passent par variable d'environnement, et se **suppriment après le travail** : https://github.com/settings/tokens
- Écrire sur GitHub avec le token de BTK et `git` dans le terminal, jamais avec le connecteur. Un commit clair par sujet, `npm run build` et `npm run check:all` verts avant chaque envoi, `GUIDE_SITE.md` mis à jour dans le même commit (`npm run guide`).
- Dire honnêtement ce qui est fait, testé ou non testé.
- **Méthode des mises à niveau suivantes (24 nov.) : appliquer SEULEMENT la différence** entre l'ancien et le nouveau commit de Nprojet (`git diff <ancien> <nouveau> | git apply --3way`), jamais « tout remplacer » : `gestion` a maintenant son propre travail (suivi des employés E2 à E9 : `CalendarView.tsx`, `dayStatus.ts`…) qu'un remplacement total effacerait. Dernier commit de Nprojet repris : 5040b13.
- **Mise à niveau sur Nprojet : GARDER `TODO_SUIVI_PAIE.md`** (le TODO du suivi des employés, propre à `gestion`). Il a déjà été effacé 3 fois par des mises à niveau « tout remplacer ». Fichiers à garder en plus des comptes : `TODO_SUIVI_PAIE.md` et les fichiers de ce plan.

## 6. Limites connues (honnêteté)
- La copie réelle sur un nouveau Supabase n'a **pas** été essayée : seuls les contrôles locaux existent (`check:copy-project`, `check:setup-sql`, `check:deploy-server`, `check:no-old-account`, `check:site-config`).
- Le **fuseau horaire** (UTC+3, Madagascar) est écrit à plusieurs endroits du code : un autre pays serait un vrai chantier.
- Les **données** ne sont pas copiées : la copie est vide (structure seulement).
- Le **déploiement du serveur** passe par la CLI Supabase (`supabase@3.2.0`, mode API) : non essayée sur un vrai projet.
