# TODO : suivi des employés par type de paie, présence, stock

Écrit le 23/11/2026 d'après la discussion de BTK (avec Manus puis avec Claude).
**Aucun code n'est écrit. On attend le « GO » de BTK avant de coder.**
Règle : pas de changement du calcul de paie ni de la base Supabase sans décision de BTK, sauvegarde avant, et un déploiement traité à part.

## 1. Ce que BTK veut (décidé)

1. **Chaque employé a sa propre façon d'être payé, choisie par l'admin** (les rôles sont différents). Le type de paie suit l'employé.
2. **Le type de paie est la source de tout.** Le nom du travail (livraison, saisie, production…) n'est qu'une étiquette. Le type de paie décide :
   - ce que l'employé saisit ;
   - ce que le site affiche (fiche, calendrier, suivi) ;
   - comment on calcule la paie ;
   - comment la présence s'écrit.
3. **Types de paie voulus :** par mission ou tâche, par jour, par heure, par quantité (pièce), commission (pourcentage), salaire fixe.
4. **Qui saisit :** l'employé connecté, le chef d'équipe pour son équipe, le responsable ou l'admin pour tous, ou un autre pour un employé sans compte.
5. **Qui valide :** l'admin, le responsable ou le chef d'équipe, au choix. **Personne ne valide sa propre saisie.**
6. **Parcours de l'employé :** il envoie sa tâche, l'admin la valide, le site écrit « présent ».
7. **Présence écrite à la validation.** La case du jour garde l'heure d'envoi, l'heure de validation et « présent » (exemple : envoi 7:00, validé 7:15, présent).
8. **Stock :** à la validation d'une tâche, le stock bouge tout seul : il monte (fabrication) ou il baisse (produits utilisés), selon le type de paie ou de travail.
9. **Les règles se règlent complètement au premier contact avec le site** (assistant de départ), puis l'admin ajuste chaque employé.
10. **Le travail sans connexion doit marcher** (saisie sur le téléphone, envoi au retour du réseau).

## 2. Problème de départ

Le site est basé sur des **tâches**. Un employé payé **à l'heure** voit encore « objectif » ou « tâche atteinte » partout. Chaque type de paie doit changer ce qui s'affiche et ce qui se synchronise.

| Type de paie | Ce qu'on saisit | Ce que le site montre |
|---|---|---|
| À l'heure | Heures | Heures, arrivée, départ (pas d'objectif) |
| À la tâche ou mission | Tâches faites | Tâches faites et validées |
| À la pièce | Quantité, refus | Quantité faite et refusée |
| Au jour | Présent ou absent, demi-journée | Jour complet ou demi-journée |
| Commission | Montant vendu | Ventes et pourcentage |
| Salaire fixe | Rien | Présence |

## 3. Les étapes, dans l'ordre

- [ ] **E1. Vérifier avant de coder** (lecture et essais seulement)
  - [x] Noter ce que le site affiche aujourd'hui pour chaque type de paie (fiche, calendrier, suivi, tableaux de bord) et où apparaissent « objectif » et « tâche atteinte ».
  - [ ] **Tester le travail sans connexion sur un vrai téléphone** : saisir sans réseau, renvoyer sans doublon, voir « à revoir » en cas de refus. Le code M26.5a (Nprojet) était « écrit et testé en local, NON déployé » : rien n'est prouvé en vrai.
  - [x] Vérifier comment le site écrit la présence et le retard aujourd'hui (le retard part de la première mission).
  - **Résultat de la lecture du code (24/11, sans rien modifier ni tester en vrai) :**
    1. **5 modes de paie existent** : mission, jour, heure, pièce, fixe (`pay_mode` de l'employé, sinon celui de l'entreprise). **La commission n'existe pas** (E7).
    2. **`pay_mode` ne sert qu'au calcul de la paie** (`fixedSalary.ts`, `postPay.ts`) et se règle dans la fiche employé. **Il ne décide d'aucun affichage.**
    3. **L'écran de l'employé est bâti sur les missions avec des points** : « Objectif » (score cible), points gagnés, 1 M de score = 1 000 Ar, photos de preuve. « Objectif » apparaît dans `EmployeeDashboard.tsx` (environ lignes 779, 1311, 1717 ; « Objectif de la mission atteint ! » ligne 1097) et dans plusieurs pages admin (`AdminDashboard`, `StatsPage`, `TeamGoalsSection`, `GoalsPanel`). **Cela confirme le problème** : un employé payé à l'heure voit le même écran.
    4. **Retard** (`attendance.ts`) : on compare l'heure de début de la **première mission du jour** avec le début du shift plus la tolérance. Ce n'est ni l'heure de connexion ni l'heure de validation.
    5. **Arrivée dans le détail du jour** = première connexion du jour (journal de connexion), pas la première tâche validée.
    6. **Heures de validation** : les missions gardent `start_validated_at` et `end_validated_at` (affichées dans le détail du jour). Les lignes de la Feuille du jour n'affichent que le type, le texte, qui l'a saisie, l'état (validée, en attente, refusée) et « non envoyée » : **pas d'heure d'envoi ni de validation visible**. Je n'ai pas lu le schéma de la base : à vérifier avant E4.
    7. **Travail sans connexion** : une file existe (`offline*.ts`, lignes « non envoyées »), mais le test sur un vrai téléphone reste à faire.
- [x] **E2. Le type de paie suit l'employé** : **déjà présent** (24/11, vérifié dans le code) : la fiche employé (`EmployeesManagement.tsx`) a un choix de type de paie et un tarif propre ; « comme l'entreprise » par défaut. **Règle d'or du code** (`postPay.ts`) : une mission normale reste payée au prix fixe par mission, quel que soit le type ; le type de paie ne s'applique qu'aux **lignes de la Feuille du jour** (saisies par le chef ou le responsable). À savoir pour E3 et E5.
- [x] **E3. L'affichage suit le type de paie** : plus d'« objectif » ni de « tâche atteinte » pour un employé à l'heure, etc. (voir le tableau du § 2). Calendrier et détails synchronisés.
  - [x] (24/11) **Décision prise par défaut** (BTK : « go, ne m'interromps pas ») : l'« objectif » n'a de sens que pour une **mission**. Un jour travaillé **seulement par la Feuille du jour** (heures, pièces, présence) s'affiche « **Présent (feuille du jour)** » au lieu de « Objectif atteint » dans la ligne de la personne du calendrier global. Le code interne `objective_reached` ne change pas (calculs et contrôles). Contrôles ajoutés dans `check-calendar-worktypes.ts`.
  - [ ] Reste à faire plus tard : adapter de la même façon la légende, le calendrier personnel de l'employé et les tableaux admin (« Objectif » dans `AdminDashboard`, `StatsPage`).
- [ ] **E4. Présence à la validation** : la case du jour écrit l'heure d'envoi, l'heure de validation et « présent ». Avant la validation, l'employé est « en attente ».
  - Recommandation : le **retard se calcule sur l'heure d'envoi**, pas sur l'heure de validation.
  - [x] (24/11) **Heures d'envoi et de validation affichées** sur les lignes de la Feuille du jour, dans le détail du jour du calendrier (« envoi 07:00 · validé 07:15 », heure de Madagascar). Affichage seulement ; le serveur posait déjà ces heures (`start_sent_at`, `end_validated_at`). Contrôle ajouté dans `check-day-detail.ts`.
  - [ ] **Bloqué, à décider avec BTK** : l'employé qui **envoie lui-même** sa ligne de feuille. Aujourd'hui seuls le chef d'équipe et le responsable saisissent les lignes (`postPay.ts`) : cela demande un changement du serveur `df-api` (déploiement à part) et peut-être de la base. Non fait.
  - [ ] Le retard calculé sur l'heure d'envoi (aujourd'hui : début de la première mission) : à décider, car cela touche une règle de calcul.
- [ ] **E5. Qui saisit, qui valide, par employé** : réglable par l'admin. Garder « personne ne valide sa propre saisie » et les règles actuelles (pas de date future, 100 lignes au plus par feuille).
  - [x] **E5a (26/11) : règles serveur et site pour que l'employé envoie lui-même sa ligne.** ÉTEINT PAR DÉFAUT : réglage de l'entreprise `work.employee_entry` (Conditions > « Les employés envoient eux-mêmes leur journée », non par défaut). Quand il est allumé : l'employé n'envoie que pour **lui seul**, pour **aujourd'hui ou hier**, **20 lignes au plus** ; sa ligne est toujours **EN ATTENTE** (rien payé, rien validé) ; **personne ne valide sa propre saisie** (le chef d'équipe de son équipe ou le responsable valident, par la route de décision existante). Même code dans `workEntry.ts` et dans le bloc WORKENTRY de `df-api` ; 11 contrôles ajoutés dans `check-work-entry.ts` (site et serveur identiques).
  - [x] **E5b (26/11) : l'écran de l'employé « Envoyer ma journée »** (`MyDayCard.tsx`, règles pures `utils/myDay.ts`, 22 contrôles dans `check:my-day`) : une carte en haut de la page **Ma mission** de l'employé (**aucune nouvelle entrée de menu**, donc les contrôles de menu sont inchangés). Visible **seulement** pour un employé quand l'entreprise a allumé « Les employés envoient eux-mêmes leur journée ». Il choisit le jour (aujourd'hui ou hier) et le travail (seulement les types dont « qui saisit » contient l'employé), remplit **seulement les cases de la mesure du type** (présence, heures si paie à l'heure, quantité et refusées, montant vendu), et envoie. Sa ligne reste **en attente** ; la liste sous la carte montre « en attente de validation », « validée » ou « refusée », avec « envoi 07:00 · validé 07:15 ».
  - [x] **Sans réseau (26/11)** : la journée de l'employé se garde sur le téléphone (même file que le responsable et le chef d'équipe, un seul envoi grâce au numéro d'action) avec le bandeau « Envoyer maintenant » ; `callPolicy('employee', 'work-entry')` passe de « en ligne seulement » à « peut attendre » ; si l'entreprise n'a pas permis l'envoi, le serveur refuse au retour du réseau et la ligne passe « à revoir ».
  - [ ] **À tester sur le site en ligne et sur un vrai téléphone (après Vercel)** : allumer le réglage, créer un type avec « qui saisit : l'employé », se connecter en employé, envoyer, valider en responsable, voir « présent » ; couper le réseau, envoyer, remettre le réseau. Je n'ai pas pu regarder l'écran (pas de navigateur ici) : seuls les contrôles du code ont tourné.
  - [ ] Limite : les lignes **pas encore envoyées** (gardées sur le téléphone) ne s'affichent pas dans la liste de la carte, seulement dans le bandeau ; un employé ne peut pas annuler une ligne qu'il a envoyée (il le demande au responsable).
  - [ ] Le choix « qui saisit » par type de travail (`entry` du type, avec « l'employé ») n'est pas encore vérifié par le serveur : le serveur ne connaît que le réglage de l'entreprise. L'écran de l'employé ne proposera que les types dont `entry` contient « l'employé ».
- [x] **E6. Assistant de départ (premier contact)** (27/11, décision A de BTK).
  - **Une carte « Régler le site pour ton entreprise »** en haut du tableau de bord de l'**admin** (`StartAssistant.tsx`, règles pures `utils/startAssistant.ts`, 22 contrôles dans `check:start-assistant`). **4 questions, une par écran**, puis un résumé :
    1. Quel est ton type d'entreprise ? (les 9 modèles du site, avec leur description) ;
    2. Comment paies-tu tes employés, en général ? (les 6 modes, dont la commission ; paie proposée selon le métier : atelier à la pièce, bureau en salaire fixe…) ;
    3. Les employés envoient-ils eux-mêmes leur journée ? (le réglage de E5, non par défaut) ;
    4. Un retard doit-il être retiré de la paie ? (jamais, à la minute, par 15 minutes).
  - **« Appliquer » n'enregistre que ces 4 réglages** (`business_model`, `pay_default`, `employee_entry`, `late_rule`), fusionnés dans les réglages actuels et filtrés comme les Conditions (`cleanCompany`) ; les tarifs, le seuil de stock et l'identité déjà réglés ne bougent pas. **Il ne crée ni employé, ni tarif, ni type de travail.**
  - **Il n'apparaît qu'à l'admin, tant qu'aucun métier n'est choisi** : dès que le métier est enregistré, il disparaît pour de bon (aussi sur les autres appareils). « Plus tard » le ferme sur l'appareil. Rien n'est enregistré avant « Appliquer ».
  - **Aucune nouvelle entrée de menu** (les contrôles de menu sont inchangés). Aucun changement du serveur : les 4 réglages passaient déjà le filtre du serveur (`df-api` version 6).
  - [ ] **À regarder sur le site en ligne (après Vercel)** : je n'ai pas pu voir l'écran (pas de navigateur ici) ; seuls les contrôles du code ont tourné.
  - [ ] Les tarifs (Ar par jour, par heure, pourcentage de commission…) ne sont **pas** demandés par l'assistant : ils se règlent dans Conditions et dans la fiche de chaque employé. À ajouter plus tard si BTK le veut.
  - [ ] Le lien avec le stock se règle par type de travail (E8) : l'assistant n'en parle pas.
- [x] **E7. Commission en pourcentage** (24/11, décision A de BTK : `gestion` garde ses changements).
  - Nouveau mode de paie `commission` : le « tarif » est un **pourcentage** (0 à 100) du **montant vendu** (`sales_ar`, entier, au plus 1 milliard d'Ar), arrondi à l'Ar. Un pourcentage au-dessus de 100 est ramené à 100. Sans montant, ou avec un montant faux ou hors limite : rien n'est payé.
  - Fait : calcul (`workTypes.ts`, `postPay.ts`) et **sa copie dans le bloc DECIDE du serveur** (`df-api/index.ts`), réglage de l'entreprise `rate_commission_ar` (`companyRules.ts`, serveur, `CompanyConditions.tsx`, caché au comptable), pourcentage propre à un employé (`pay_rate_ar` avec `pay_mode: 'commission'`), saisie « Montant vendu (Ar) » dans la Feuille du jour (`WorksheetView.tsx`, `workEntry.ts` + serveur), texte de ligne « 20 000 Ar vendus », résumé de feuille.
  - Contrôles : `check:payroll-modes` (37/37, serveur = site sur des milliers de cas, 6 cas précis de commission), `check:work-types` mis à jour (6 modes, 6 mesures, 5 tarifs). Aucun nouvel échec par rapport au départ.
  - Une **mission normale reste payée au prix fixe** (règle d'or inchangée).
  - **Pour l'utiliser** : créer un type de travail avec la mesure « le montant vendu » et la paie « commission » (Réglages > Conditions), puis régler le pourcentage. Les modèles d'entreprise prêts à l'emploi n'en contiennent pas encore.
  - [ ] À tester sur le site en ligne (après Vercel) : créer le type, saisir une vente, valider, voir le montant dans la paie.
  - [x] (25/11) **Serveur déployé** : `df-api` version 3 sur le projet `blvuwirzmtmlehafnvew`, petit `index.ts` qui importe le code du commit `a4cbdaa0adb57a090437dfa692db60d2f3d22460` ; `signup-info` répond en JSON et la connexion admin donne 200. `df-restore` et `df-assistant` restent au commit `008606d` (inchangés). **À chaque nouveau changement du serveur, redéployer `df-api` au nouveau commit.**
- [x] **E8. Stock à la validation : RÉGLABLE par chaque entreprise** (étapes 1 à 3 faites le 25/11, reste les essais en ligne et la modification d'un type existant) (décision de BTK, 25/11 : « je ne sais pas quel produit ni quel type de travail, ce n'est pas pour une seule entreprise : il faut plusieurs options »).
  - **Règle de conception :** le site n'impose rien. **Par défaut, aucun lien avec le stock.** Chaque entreprise choisit, **type de travail par type de travail**, parmi les options ci-dessous.
  - **Les options d'un type de travail** (champ facultatif `stock` du type) :
    1. **Aucun lien** (par défaut).
    2. **Entrée : la production fait monter le stock** d'un produit choisi dans le stock de l'entreprise (quantité faite moins refusées, ou quantité de la ligne × un coefficient).
    3. **Sortie : le travail consomme un produit** : le stock baisse de (quantité × quantité de produit par unité faite).
    4. **Signal seulement :** aucun mouvement, juste un avertissement si l'écart dépasse le seuil `stock_gap_pct` (existe déjà, par défaut 10 %).
  - **Sécurité (à respecter) :**
    - Le mouvement n'est créé que si le validateur peut écrire le stock (l'admin ; le stock est réservé à l'admin côté serveur).
    - **Jamais bloquant** : si le produit n'existe plus ou si le stock est insuffisant, la ligne est validée quand même et un avertissement « mouvement de stock non fait » s'affiche. On ne perd pas une validation à cause du stock.
    - **Jamais en double** : le mouvement garde l'identifiant de la ligne (`post_id`) ; une ligne ne crée qu'un seul mouvement, même si la validation est rejouée. Une ligne refusée ou annulée n'en crée aucun.
  - **Ce qu'il faut toucher :** `WorkType` et sa vérification (`workTypes.ts`, `customWorkTypes.ts`) ; le **filtre serveur des types de travail** (`df-api/index.ts`, `check:company` doit rester vert) ; `StockMove` (champ `post_id`) et son **filtre serveur** (bloc STOCK, `check-stock.ts`) ; le point de validation côté site (`decidePostNow`) ; le formulaire de type de travail (`CompanyConditions.tsx`). Le serveur est à redéployer (méthode du petit `index.ts`).
  - [x] Étape 1 (25/11) : **modèle et vérification, site et serveur identiques** (`customWorkTypes.ts` et son bloc CUSTOMWORK dans `df-api/index.ts`). Champ facultatif `stock` d'un type : `{ mode: 'in' | 'out', product_id: 'prod-…', per_unit }` ou `{ mode: 'gap' }` ; seulement pour un type mesuré par une quantité ; un réglage faux est refusé (erreur « stock »), jamais gardé à moitié ; `per_unit` arrondi à 3 décimales. Contrôles ajoutés dans `check-custom-work-types.ts`.
  - [x] **Trou de E7 corrigé en même temps** : la liste des mesures, des paies et la règle de compatibilité des types **créés à la main** ne connaissaient pas la commission (un type « montant vendu / commission » aurait été refusé). C'est corrigé, avec des cas de test.
  - [x] Étape 2 (25/11) : **mouvement de stock créé à la validation, idempotent et non bloquant.**
    - Règles pures et testées : `src/utils/workStock.ts` (`workStockMove`, 14 cas dans `check:work-stock`) : ligne de travail validée seulement ; entrée ou sortie = (faites − refusées) × quantité par unité, arrondie à 2 décimales ; rien si produit supprimé, rien de fait ou déjà fait ; une mission normale ne touche jamais le stock.
    - Branché (admin seulement, car le stock est réservé à l'admin) : validation d'une ligne par `decidePostNow` ; envoi d'une feuille par l'admin (seules les lignes **nouvelles** validées par cet envoi) ; annulation d'une ligne (`cancelWorkLine`) qui **retire son mouvement** (refusé en silence si le stock deviendrait négatif).
    - Le mouvement garde `work_post_id` (site : `StockMove`, `checkMoveDraft` ; serveur : `cleanStockMove`, entrée ou sortie seulement, 80 caractères au plus). Contrôles ajoutés dans `check-stock.tsx`.
    - **Limite connue :** si le validateur n'est pas admin (chef d'équipe), aucun mouvement n'est créé (il ne peut pas écrire le stock) ; une ligne du chef validée plus tard par l'admin en crée un.
    - **Limite connue :** l'unicité d'un mouvement par ligne est garantie côté site (`work_post_id`), pas encore par le serveur.
  - [x] Avertissement à l'écran (25/11) : si le mouvement ne peut pas se faire (produit supprimé, stock insuffisant), la notification du site dit « Ligne validée, mais le stock n'a pas bougé : … » (`ToastHost`, événement `df:toast`). Elle est en français seulement.
  - [x] Étape 3 (25/11) : **formulaire de réglage** dans Réglages > Conditions > « Mes types de travail » (`CustomWorkTypes.tsx`) : quand le type est mesuré par une quantité, un bloc « Lien avec le stock (facultatif) » : Aucun lien (par défaut) / La production fait monter le stock / Le travail consomme un produit / Seulement un signal ; produit choisi dans le stock de l'entreprise ; quantité par unité faite. Les « Règles que le site applique » de chaque type disent le lien (`workRuleLines`, français et anglais). Même passage : « le montant vendu » et le tarif de commission en **pourcentage** s'y lisent correctement.
  - [ ] **À tester sur le site en ligne (après Vercel)** : créer un produit, créer un type « quantité » lié à ce produit, saisir et valider une ligne, voir le mouvement dans le Stock ; annuler la ligne et voir le mouvement partir.
  - [ ] Limite : le lien se règle à la **création** d'un type. Pour changer le lien d'un type existant, il faut le supprimer et le recréer (les saisies déjà faites restent). Un écran de modification reste à faire.
  - [ ] Retour fournisseur (M23.6) : reste une décision séparée, hors de E8.
- [ ] **E9. Fiche de suivi par employé** pour le responsable et le chef d'équipe : présences, retards, absences, heures ou quantités, validations en attente. Le chef d'équipe ne voit que son équipe. Les salaires restent cachés aux rôles non autorisés.

## 4. À décider avec BTK

- [ ] **Extras** : commission ou prime en plus du type de base, ou un seul type de paie par employé ? (proposition : un type de base, plus des extras)
- [ ] **Changement de type de paie** : que deviennent les anciens jours ? (proposition : ils restent comme avant, seuls les nouveaux jours suivent la nouvelle règle)
- [ ] **Retour fournisseur** (M23.6) : sortie de stock avec dépense inverse, ou correction de la réception avec un motif ?
- [x] **Stock** : réglé le 25/11 par BTK : ce n'est pas à nous de décider, chaque entreprise choisit par type de travail (voir E8).
- [ ] **Idées pour plus tard** : prime à l'objectif, prix par palier, heures supplémentaires, forfait par projet, tarif par client, retenues ou pénalités.

## 5. Rappels

- « En ligne », « en pause » et « hors ligne » viennent de l'activité de l'application : ce n'est pas un pointage fiable à lui seul.
- Mode démo = données fictives, ce n'est pas une preuve d'enregistrement.
- Aucun mot de passe ni clé dans le dépôt.
- Ce fichier est propre à `gestion`. Nprojet n'est pas modifié.
- **Attention aux mises à niveau sur Nprojet** : elles remplacent tout l'arbre et effacent les fichiers qui n'existent que dans `gestion` (ce TODO a déjà été effacé une fois, puis remis le 24/11). Garder ce fichier à chaque mise à niveau.

## 6. État au 24/11 et conception des étapes restantes (pour qui reprend)

**Fait et poussé (affichage seulement, aucun changement de paie, de base ni de serveur) :** E1 (lecture du code), E2 (déjà présent), E3 (jour de feuille = « Présent (feuille du jour) » dans le calendrier global), E4 en partie (heures d'envoi et de validation sur les lignes de la feuille).

**✅ Décision de BTK (24/11) : A.** `gestion` garde ses changements ; les mises à niveau sur Nprojet se font par fusion (voir `PLAN_IMPORTANT.md` § 2 ter). Le risque ci-dessous est donc réglé si la fusion est respectée.

**(Ancien risque) les mises à niveau « tout remplacer par Nprojet ».** Elles remplacent tout le code et effaceront E3 et E4. Un changement de serveur déployé (ou de paie) avec un site remis à l'ancienne version se désaccorderait. **Avant tout gros changement, BTK décide** : (a) `gestion` garde ses changements et les mises à niveau deviennent des fusions, ou (b) les améliorations sont faites dans Nprojet (la référence) puis copiées. Sans cette décision, ne pas coder E5, E7, E8.

**Conception, d'après la lecture du code (rien n'est codé) :**
- **E5 (l'employé envoie lui-même sa ligne)** : aujourd'hui seuls le chef d'équipe et le responsable créent des lignes de travail. La règle est dans le serveur `df-api/index.ts` (création d'une ligne, vers les lignes 255 à 272 : `presence`, `hours`, `quantity`, `rejected`, puis calcul `wePay` pour l'admin) et dans `postPay.ts`. Il faut un nouveau chemin serveur « l'employé envoie, le chef ou l'admin valide, personne ne valide sa propre ligne », puis un écran côté employé. Déploiement serveur à part (méthode du petit `index.ts` qui importe le dépôt à un commit).
- **E7 (commission)** : ajouter `'commission'` à `PAY_MODES` (`workTypes.ts` ligne 12), `PAY_LABEL` (ligne 24) et `payAmount` (ligne 109) ; un champ pour le montant vendu sur la ligne (types, `workEntry.ts`, `WorksheetView.tsx`, `workLineText.ts`) ; la **même copie du calcul dans le bloc DECIDE du serveur** (`check-payroll-modes` compare les deux, il doit rester vert) ; le pourcentage se règle comme les autres tarifs (`rate_*_ar` de l'entreprise ou tarif propre de l'employé).
- **E8 (stock à la validation)** : le stock est une collection réservée à l'admin côté serveur (`ADMIN_ONLY_WRITE`, bloc STOCK vérifié par `check-stock.ts`). Le mouvement doit être écrit par le serveur au moment de la validation de la ligne, avec le produit et le sens (entrée pour une fabrication, sortie pour des produits utilisés). Il manque deux décisions de BTK : quels types de paie ou de travail sont liés à un produit, et le retour fournisseur (M23.6).
- **E6 (assistant de départ)** : il écrirait les réglages de l'entreprise (`company.work` : type de paie par défaut, tarifs `rate_*_ar`) et les règles de saisie et de validation ; l'écran se place dans `src/views/admin/` ; aucun changement serveur.
- **E9 (fiche de suivi par employé)** : une grande partie existe déjà (calendrier de l'employé, `EmpSummary` : jours travaillés, absences, retards, congés, missions, paie ; page opérateur). À faire : y ajouter les lignes de la feuille, les heures d'envoi et de validation, et les validations en attente, pour le chef d'équipe (son équipe seulement) et le responsable.
- **Reste de E3** : légende et filtres du calendrier, calendrier personnel de l'employé, tableaux admin avec « Objectif ».

