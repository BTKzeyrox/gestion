# Plan design

Voici le plan à donner à l'autre chat. Tout est du front, sans serveur ni Supabase. Dans les noms de fichiers, `src/…` désigne les fichiers du projet. Chaque étape a un contrôle à la fin.

## Étape 0 : préparer
- Dans la copie, lancer `npm ci`, puis `npm run build` et `npm run check:all`. Tout doit être vert avant de commencer.
- Garder Nprojet ouvert en lecture seule pour comparer. Ne rien modifier dans Nprojet.

## Étape 1 : header au niveau du menu, ordinateur seulement (768 px et plus)
1. `src/index.css` : ajouter `:root { --hdr-gap: 0px; --hdr: 57px; }` et, pour 768 px et plus, `--hdr-gap: 12px; --hdr: 69px;`. Dans le style des fenêtres, `padding-top: calc(57px + 1rem)` devient `calc(var(--hdr, 57px) + 1rem)`.
2. `src/components/TopBar.tsx` :
   - La cale sous le header passe de `h-[57px]` à `h-[var(--hdr,57px)]`.
   - Le `top` du header devient `calc(var(--vvt, 0px) + var(--hdr-gap, 0px))`.
   - Ajouter les classes `md:right-3 md:border md:rounded-2xl`.
3. `src/components/MenuTabs.tsx` : `top` = `calc(var(--hdr, 57px) + var(--vvt, 0px))`.
4. `src/App.tsx` : dans le `main` de la messagerie, remplacer les `57` par `var(--hdr, 57px)` (top et height).
5. `scripts/check-header-status.tsx` : la ligne « marge de 57 px » doit chercher `calc(var(--hdr, 57px) + 1rem)`.

## Étape 2 : pastille hors ligne à la fin des icônes
- `TopBar.tsx` : déplacer `<div className="hidden md:block shrink-0" data-header-conn><ConnectionChip /></div>` après le bloc de la cloche. Ordre final : recherche, raccourcis, « ? », cloche, hors ligne.

## Étape 3 : charte BTK, thème sombre (bloc à ajouter à la FIN de `src/index.css`)
- **Variables :**
  - `--btk-bg-1 #0c2233`, `--btk-bg-2 #071322`, `--btk-bg-3 #050b16`
  - `--btk-blue-1 #60a5fa`, `--btk-blue-2 #3b82f6`, `--btk-blue-3 #1e3a8a`
  - `--btk-card #0f2438`, `--btk-card-line rgba(59,130,246,.24)`
- **Fond :**
  - `html.theme-dark` prend le fond `bg-3`, et `body` devient transparent.
  - Un `body::before` fixe (plein écran, `z-index:-1`) porte un dégradé radial : `ellipse at 50% 42%, bg-1 0%, bg-2 45%, bg-3 100%`.
  - `.df-bg-app` et `.df-bg-login` deviennent transparents.
- **Cartes :**
  - `[class*="bg-[#"]:not(.df-popover)` prend `background-color: var(--btk-card) !important` et la bordure `--btk-card-line`.
  - `[class*="border-slate-"]` prend aussi cette bordure.
- **Titres et nom du menu :** les `h1` et `.df-sb-title` reçoivent un dégradé de texte `#bfdbfe`, puis `--btk-blue-1` à 45 %, puis `--btk-blue-2`. Avec `background-clip:text` et `text-fill-color: transparent`.
- **Logo du menu :**
  - Dans `src/components/Sidebar.tsx`, ajouter la classe `df-sb-logo` au rond du logo.
  - Le CSS lui donne un dégradé 135° (blue-1, blue-2 à 45 %, blue-3) et une lueur `0 0 18px rgba(59,130,246,.45)`.
- **Menu sombre :** dégradé vertical `bg-1` vers `bg-2`, bordure bleue (`rgba(59,130,246,.28)`).
- **Header sombre :** dégradé 90° de `bg-1` vers `#0b2a4a`, bordure `rgba(59,130,246,.35)` et une fine lueur bleue.

## Étape 4 : boutons principaux (les deux thèmes)
- Pour `.bg-emerald-600.text-white` et `.bg-blue-600.text-white` : dégradé 135° de `#2563eb` vers `--btk-blue-3`, avec une ombre bleue légère. Au survol, `filter: brightness(1.12)`.

## Étape 5 : thème clair
- **Fond et cartes :** `--gp-page: #e9eef5`, `--gp-line: #c5d0df`, `--gp-card: #fff`. Le fond de `html`, `body` et `.df-bg-app` devient `var(--gp-page)`. Sur les cartes à bordure arrondies, bordure `--gp-line` et ombre `0 1px 2px rgba(11,42,74,.10), 0 8px 20px -14px rgba(11,42,74,.30)`.
- **Menu clair (il ne doit PAS être marine) :** variables `--sb-bg #fff`, `--sb-text #0b2a4a`, `--sb-active #1d4ed8`, etc., fond en dégradé `#fff` vers `#f3f6fb`, bordure `#c5d0df`.
- **Nom et logo du menu clair :** titre en dégradé `#1e3a8a` vers `#2563eb`, logo en dégradé avec lueur.
- **Header clair :** blanc (dégradé `#fff` vers `#f3f6fb`), bordure `#c5d0df`, fine ligne bleue en bas (`inset 0 -2px 0 rgba(37,99,235,.35)`).

## Étape 6 : centre de notifications (autre session de Nprojet)
- Copier depuis Nprojet les fichiers du centre de notifications : `NotificationsPage.tsx`, `utils/notifications.ts` et `utils/notifView.ts`, plus les liens dans `App.tsx`, la cloche et l'assistant.
- Ajouter `'notifications'` à `NON_MENU_VIEWS` (`utils/menuGroups.ts`), puis adapter `check-menu-links`, `check-menu-groups` et `check-guide-tour`.
- Lancer `npm run guide` pour remettre `GUIDE_SITE.md` à jour.
- L'équipe « header compact » de l'autre session n'est pas détaillée : le plus sûr est de reprendre les fichiers finaux de Nprojet.

## Étape 7 : vérifier puis pousser
- `npx tsc --noEmit`, `npm run build`, `npm run check:all`. Un test de vitesse peut rater sous charge : le relancer seul.
- Regarder le rendu en clair, en sombre et sur téléphone (390 px). Le téléphone ne doit pas changer.
- Commit puis push sur `main` de la copie. Vercel republie tout seul.

Ordre conseillé : étapes 1 et 2, puis 3 et 4, puis 5, puis 6, avec un commit par étape.
