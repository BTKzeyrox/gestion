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
- [ ] **E2. Le type de paie suit l'employé** : réglage dans la fiche de l'employé, par l'admin. Partir de l'existant (l'admin peut déjà fixer un mode ou un tarif par employé).
- [ ] **E3. L'affichage suit le type de paie** : plus d'« objectif » ni de « tâche atteinte » pour un employé à l'heure, etc. (voir le tableau du § 2). Calendrier et détails synchronisés.
- [ ] **E4. Présence à la validation** : la case du jour écrit l'heure d'envoi, l'heure de validation et « présent ». Avant la validation, l'employé est « en attente ».
  - Recommandation : le **retard se calcule sur l'heure d'envoi**, pas sur l'heure de validation.
- [ ] **E5. Qui saisit, qui valide, par employé** : réglable par l'admin. Garder « personne ne valide sa propre saisie » et les règles actuelles (pas de date future, 100 lignes au plus par feuille).
- [ ] **E6. Assistant de départ (premier contact)** : pose les questions une fois (type de paie par défaut, qui saisit, qui valide, présence, stock), puis l'admin ajuste chaque employé.
- [ ] **E7. Commission en pourcentage** (nouveau type de paie ; les 5 autres existent déjà d'après la lecture du code).
- [ ] **E8. Stock à la validation** : le stock monte ou baisse tout seul, avec un historique qu'on peut contrôler (jamais de modification du passé).
  - Lien à lire : M23.6 (Nprojet, `TODO.md`) : retour fournisseur ou correction de réception, « BTK décide d'abord ».
- [ ] **E9. Fiche de suivi par employé** pour le responsable et le chef d'équipe : présences, retards, absences, heures ou quantités, validations en attente. Le chef d'équipe ne voit que son équipe. Les salaires restent cachés aux rôles non autorisés.

## 4. À décider avec BTK

- [ ] **Extras** : commission ou prime en plus du type de base, ou un seul type de paie par employé ? (proposition : un type de base, plus des extras)
- [ ] **Changement de type de paie** : que deviennent les anciens jours ? (proposition : ils restent comme avant, seuls les nouveaux jours suivent la nouvelle règle)
- [ ] **Retour fournisseur** (M23.6) : sortie de stock avec dépense inverse, ou correction de la réception avec un motif ?
- [ ] **Stock** : quels types de paie ou de travail font monter le stock, lesquels le font baisser ?
- [ ] **Idées pour plus tard** : prime à l'objectif, prix par palier, heures supplémentaires, forfait par projet, tarif par client, retenues ou pénalités.

## 5. Rappels

- « En ligne », « en pause » et « hors ligne » viennent de l'activité de l'application : ce n'est pas un pointage fiable à lui seul.
- Mode démo = données fictives, ce n'est pas une preuve d'enregistrement.
- Aucun mot de passe ni clé dans le dépôt.
- Ce fichier est propre à `gestion`. Nprojet n'est pas modifié.
- **Attention aux mises à niveau sur Nprojet** : elles remplacent tout l'arbre et effacent les fichiers qui n'existent que dans `gestion` (ce TODO a déjà été effacé une fois, puis remis le 24/11). Garder ce fichier à chaque mise à niveau.
