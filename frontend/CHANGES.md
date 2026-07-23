# ISTEPM Agadir    Journal des modifications

Transformation du tableau de bord « School CRM » (démo centre d'éducation
inclusive) en CRM pour l'**Institut spécialisé des techniques paramédicales
d'Agadir**.

Le projet reste **100 % frontend** : aucun backend, aucune base de données,
aucune authentification réelle. Toutes les données sont locales.

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Identité visuelle](#2-identité-visuelle)
3. [Palette de couleurs](#3-palette-de-couleurs)
4. [Suppression de l'API   projet frontend uniquement](#4-suppression-de-lapi--projet-frontend-uniquement)
5. [Rôles et interfaces](#5-rôles-et-interfaces)
6. [Navigation   barre latérale](#6-navigation--barre-latérale)
7. [Pages métier](#7-pages-métier)
8. [Données modifiables (CRUD)](#8-données-modifiables-crud)
9. [Composants partagés créés](#9-composants-partagés-créés)
10. [Récapitulatif des fichiers](#10-récapitulatif-des-fichiers)
11. [Points d'attention](#11-points-dattention)

---

## 1. Vue d'ensemble

### Ce qui existait avant

| | Avant | Après |
|---|---|---|
| Domaine | Centre d'éducation inclusive | Institut paramédical |
| Entités | Parents, familles, élèves | Étudiants, formateurs, examens, bulletins, stages |
| Couleurs | Bleu marine `#28396C` / vert `#B5E18B` | Teal `#029994` / rouge `#e51e26` |
| Navigation | Barre horizontale (6 liens) | Barre latérale (7 entrées + 1 groupe) |
| Données | Appels API (`useQuery`) vers un backend | Données statiques modifiables en mémoire |
| Rôles | Aucun | 3 interfaces (directeur, enseignant, responsable) |
| Actions |   | Création / modification / suppression réelles |

### Stack technique (inchangée)

Vite 7 · React 19 · TanStack Router (routes par fichier) · Tailwind CSS v4 ·
shadcn/ui (Radix) · Recharts · Sonner.

> **Note :** ce projet n'utilise **pas** Next.js. Il n'y a ni `app/` ni
> `pages/` : les routes sont des fichiers plats en notation pointée dans
> `src/routes/` (`dashboard.etudiants.tsx` → `/dashboard/etudiants`), et
> `src/routeTree.gen.ts` est généré automatiquement au build.

### Découverte déterminante

Le fichier **`src/lib/istpm-data.ts`** (~1 470 lignes) contenait déjà
l'intégralité du modèle de données paramédical   mais **n'était importé par
aucun fichier**. Il contient :

- 7 filières, niveaux S1–S6, 7 structures d'accueil (CHU/hôpitaux réels)
- 14 étudiants (avec notes, historique de paiements, stage)
- 8 formateurs · 10 examens · 10 bulletins · 9 stages
- Des agrégats calculés et les utilitaires `fmtMAD()` / `fmtDate()`
- Un type `BadgeTone = "teal" | "red" | "amber" | "blue" | "neutral"`
  correspondant exactement à la palette demandée

Le travail a donc consisté à **brancher des données déjà écrites**, puis à
re-styler et compléter   et non à repartir de zéro.

---

## 2. Identité visuelle

### Logo

Le logo SVG fourni a été installé en **deux variantes** :

| Fichier | Usage | Pourquoi |
|---|---|---|
| `public/istpm-logo.svg` | Favicon | Version complète, fond blanc inclus |
| `public/istpm-logo-mark.svg` | Sidebar, écran de connexion | Fond transparent |

**Détail important :** le SVG d'origine contient en premier chemin un carré
blanc plein format (1254 × 1254). Sur l'écran de connexion   qui a un dégradé
teal   ce carré serait apparu comme un rectangle blanc autour du logo. La
variante `-mark` supprime uniquement ce chemin.

L'attribut `width="100%"` a également été retiré des deux fichiers pour que le
dimensionnement CSS fonctionne normalement.

### Titre et favicon

`index.html` :

```html
<title>ISTEPM Agadir    CRM</title>
<link rel="icon" type="image/svg+xml" href="/istpm-logo.svg" />
```

---

## 3. Palette de couleurs

### Le problème

Tailwind v4 n'utilise pas de fichier `tailwind.config` : toute la configuration
est dans `src/styles.css`. Mais **168 couleurs étaient écrites en dur** dans
20 fichiers (`bg-[#28396C]`, `border-[#28396C]/15`…). Modifier `styles.css`
seul n'aurait donc rien changé visuellement.

### La solution

**a) Nouveaux jetons** dans `src/styles.css` :

```css
--istpm-teal: #029994;   --istpm-teal-dk: #017a76;
--istpm-teal-lt: #4db8b4;  --istpm-teal-pale: #d6efee;
--istpm-red: #e51e26;    --istpm-red-dk: #b3141b;
--istpm-amber: #d98324;  --istpm-blue: #2f6fb0;
--istpm-ink: #123b3a;    --istpm-white: #ffffff;
```

**b) Jetons sémantiques repointés**   `--primary` devient teal avec texte
**blanc** (auparavant : vert avec texte bleu marine   l'inversion compte),
`--destructive` devient rouge, `--background`/`--card` deviennent blancs.

**c) Utilitaires Tailwind enregistrés** dans `@theme inline`, pour remplacer
les valeurs arbitraires par un vocabulaire lisible :

`bg-brand` · `border-brand/15` · `text-brand-dk` · `bg-alert` ·
`text-alert-dk` · `bg-warn-pale` · `text-info` · `text-ink`

**d) Balayage des 168 littéraux.** Correspondances principales :

| Ancien | Nouveau | Remarque |
|---|---|---|
| `#28396C` (×74) | `brand` / `foreground` | Séparé selon l'usage : bordures et fonds → teal ; **textes → `foreground`**, sinon tout le texte devenait teal |
| `#B5E18B` (×29) | `brand` | |
| `#E25C5C`, `#9A2F2F` (×41) | `alert`, `alert-dk` | |
| `rgba(40,57,108,…)` | `rgb(var(--istpm-shadow)/…)` | Ombres teintées teal |

**Vérifié :** aucune couleur bleu marine ou vert clair ne subsiste dans le code
atteignable. Contrôle en direct : `--primary: #029994`, `--destructive: #e51e26`.

### Règle d'usage

Le **teal domine** (navigation active, boutons primaires, en-têtes, badges
payé/admis/validé). Le **rouge est réservé** aux alertes et aux états négatifs
(impayé, retard, ajourné, à risque, abandon).

Un badge unique gère toutes les couleurs de statut   `toneBadge(tone)` dans
`src/lib/dash-ui.tsx`, piloté par les tables `*_TONE` de `istpm-data.ts`.
Aucune page ne définit ses propres couleurs de statut.

---

## 4. Suppression de l'API   projet frontend uniquement

Toutes les pages actives interrogeaient un backend (`/clients`, `/payments`,
`/dashboard/stats`…). Ces appels ont été supprimés.

- `src/lib/auth.tsx`   réécrit : plus de `POST /auth/login`, plus de jeton.
- `src/routes/dashboard.tsx`   le garde-fou vérifie le rôle stocké, pas un token.
- Pages `paiements`, `settings`, `index`   passées aux données locales.
- Le panneau de notifications (messagerie WhatsApp, ~460 lignes) et le widget
  de support ont été **désactivés** : hors périmètre ISTPM, et ils
  interrogeaient un backend absent toutes les 30 secondes.

### Correction d'un bug bloquant

`src/lib/api.ts` redirigeait **brutalement vers `/login`** à chaque réponse
401 :

```js
if (res.status === 401) { clearToken(); window.location.href = "/login"; }
```

Le widget de support continuait d'appeler l'ancien backend, recevait des 401,
et **éjectait l'utilisateur d'une session valide**   constaté en test. La
redirection a été remplacée par une simple erreur.

`src/lib/api.ts` est conservé car les anciennes routes non branchées
l'importent encore.

---

## 5. Rôles et interfaces

Trois interfaces, **état d'affichage uniquement**   aucune authentification.
Le rôle est stocké dans `localStorage["istpm-role"]` et change instantanément
via le sélecteur en bas de la barre latérale.

| Écran | Directeur | Enseignant | Responsable |
|---|:---:|:---:|:---:|
| Tableau de bord | ✅ complet | ✅ allégé | ✅ orienté scolarité |
| Étudiants | ✅ CRUD | 👁 lecture seule | ✅ CRUD |
| Scolarité › Examens | ✅ | ✅ saisie notes |   |
| Scolarité › Bulletins | ✅ | 👁 lecture seule | ✅ publication |
| Formateurs | ✅ |   |   |
| Stages cliniques | ✅ |   | ✅ conventions |
| Paiements | ✅ |   | ✅ + relances |
| Paramètres | ✅ |   |   |

Le rôle agit à trois niveaux : les entrées de navigation affichées, le contenu
du tableau de bord, et les boutons d'action disponibles (un enseignant voit
« Consultation seule » au lieu des boutons de création).

### Écran de connexion

Reconstruit : logo transparent, nom complet de l'institut, dégradé teal, et
**trois boutons de profil**. Aucun mot de passe   mention explicite
« Démonstration hors ligne ».

---

## 6. Navigation   barre latérale

La barre horizontale a été remplacée par une **barre latérale** :
`src/components/dash-sidebar.tsx`.

### Structure

```
Tableau de bord
Étudiants
▾ Scolarité
    Examens
    Bulletins
Formateurs
Stages cliniques
Paiements
Paramètres
```

Examens et Bulletins sont regroupés sous **Scolarité** (évaluer, puis publier
les résultats). Le groupe se filtre selon le rôle : le responsable voit
« Scolarité » ne contenant que Bulletins ; un groupe dont aucun enfant n'est
accessible disparaît entièrement.

### Comportement

| Contexte | Rendu |
|---|---|
| **Bureau (≥ 1024 px)** | Rail fixe de 264 px, repliable à 76 px (icônes seules). L'état replié est mémorisé entre les sessions. |
| **Mobile / tablette** | Barre supérieure fine avec bouton hamburger ; le même rail glisse en tiroir par-dessus un fond flouté. |

- Fermeture du tiroir : navigation, clic sur le fond, ou touche `Échap` ;
  le défilement du corps est bloqué pendant l'ouverture.
- Élément actif : pastille teal avec indicateur arrondi et `aria-current="page"`.
- Arriver sur `/dashboard/examens` **déplie automatiquement** Scolarité.
- Replié, le bouton de groupe déplie d'abord le rail (plutôt que d'afficher un
  sous-menu inutilisable).

### Détails techniques

- L'ouverture du groupe utilise `grid-rows: 0fr → 1fr`, qui s'anime vers la
  hauteur réelle du contenu   une transition `max-height` ne peut que
  l'approximer.
- L'attribut **`inert`** est appliqué au conteneur replié : l'animation garde
  les liens montés, ils seraient donc accessibles au clavier tout en étant
  invisibles.
- **RTL** : propriétés logiques (`start-*`, `border-e`) et ordre flex   en
  arabe le rail passe à droite sans feuille de style dédiée. Vérifié.

---

## 7. Pages métier

Cinq nouvelles pages, **ajoutées** sans renommer ni déplacer l'existant.

| Route | Contenu |
|---|---|
| `/dashboard/etudiants` | CNE/Matricule · Nom (avatar) · Filière · Niveau · Groupe · Statut · Paiement. Fiche : contact, naissance, ville, notes par module, historique de paiements, stage en cours. Filtres + recherche + export CSV. |
| `/dashboard/formateurs` | Matricule/CIN · Nom · Grade · Département · Nb modules · Groupes · Statut. Fiche : modules, groupes, notes saisies. |
| `/dashboard/examens` | Module · Filière+Niveau · Type · Date · Heure · Salle · Surveillants · Statut. Détail : liste nominative + **saisie des notes théorique et pratique**. |
| `/dashboard/bulletins` | Étudiant · Filière/Niveau · Session · Moyenne · Mention · Décision · Statut. Détail : notes avec coefficients/crédits + ligne d'évaluation clinique. |
| `/dashboard/stages` | Étudiant · Filière/Niveau · Structure · Service · Encadrant · Période · Statut. Détail : convention, rapport, note de soutenance, tuteur académique + clinique. |

### Tableau de bord

**4 cartes KPI** (étudiants inscrits +delta, formateurs actifs, taux de
réussite, total à recouvrer) puis trois sections :

1. **Académique**   répartition par filière (donut), par niveau (barres), taux
   de réussite par filière, liste cliquable « Étudiants à risque »
2. **Financier**   encaissé, encaissé ce mois, en attente, impayé, retard,
   taux de recouvrement (en MAD)
3. **À traiter**   examens à venir, bulletins à publier, stages à valider +
   flux « Activité récente »

Le contenu change selon le rôle : l'enseignant voit *mes groupes / examens à
noter / taux de réussite de mes modules* ; le responsable voit
*inscriptions / recouvrement / stages à valider / relances*.

### Pages retirées de la navigation

`familles`, `calendar`, `affiches`, `planifications`, `rapports` restent sur
le disque (règle : pas de renommage ni de suppression) mais ne sont plus
accessibles depuis l'interface. « Emploi du temps » n'apparaît nulle part.

---

## 7 bis. Examens   espaces formateur et directeur

La page Examens est désormais **scindée en deux espaces** selon le rôle.

### Modèle enrichi

Le type `Examen` reçoit : `titre`, `classe` (classe/groupe), `anneeUniversitaire`,
`duree` (minutes), `description` (facultatif), `createdBy` (identifiant du
formateur auteur) et `document` (métadonnées du sujet déposé). Le semestre est
porté par `niveau` (S1–S6), déjà présent.

**L'auteur est enregistré automatiquement** : `addExamen(data, auteurId)`
appose `createdBy`, le formulaire ne le propose pas.

### Espace formateur

Ne voit **que ses propres examens** (filtrés sur `createdBy`). Peut créer,
modifier, supprimer, et **déposer le sujet** (PDF ou Word, 10 Mo max). La
saisie des notes reste disponible ici.

### Espace directeur   lecture seule

Voit **tous les examens de tous les formateurs**. Aucun bouton de création, de
modification ou de suppression n'est rendu. Colonnes : titre, module, classe,
type, date, **formateur**, date de dépôt, état du sujet, actions Voir /
Télécharger. Filtres : formateur · module · classe · semestre · année
universitaire, plus une recherche libre.

> **Décision à valider :** « lecture seule » a été appliqué à la lettre, donc le
> directeur n'a plus accès à la saisie des notes sur cette page (il l'avait
> auparavant). À rétablir si ce n'était pas l'intention.

### Stockage des fichiers

Les sujets sont conservés dans **IndexedDB** (`src/lib/doc-store.ts`), pas dans
le localStorage : celui-ci plafonne à ~5 Mo et ne stocke que du texte, un PDF
encodé en base64 gonflant d'environ 33 %. Le store principal ne garde que les
métadonnées et la clé du fichier.

- `Voir` affiche le PDF dans une `iframe` intégrée. `window.open` a été écarté :
  l'URL objet n'existe qu'après un `await`, moment où le geste utilisateur est
  perdu et où les bloqueurs de fenêtres interviennent.
- `Télécharger` passe par un `<a download>`, qui reste autorisé.
- Les formats Word ne s'affichent pas dans le navigateur : un message le dit et
  renvoie vers le téléchargement.
- Supprimer un examen ou remplacer un sujet efface l'ancien fichier   pas de
  blob orphelin.
- Les sujets du jeu de démonstration sont **générés localement** au premier
  lancement (PDF minimal valide, une page), pour que Voir et Télécharger
  fonctionnent immédiatement. La taille affichée est réalignée sur celle du
  fichier réellement écrit.

---

## 8. Données modifiables (CRUD)

Les données étaient des constantes de module : rien ne pouvait les modifier.
**`src/lib/istpm-store.tsx`** (~680 lignes) fournit désormais un contexte React
qui copie les données d'origine dans un état, expose les opérations CRUD, et
**recalcule tous les agrégats à partir de l'état vivant**.

Conséquence : modifier un étudiant déplace immédiatement les KPI, le donut et
les compteurs « à traiter ».

### Actions réelles par écran

| Écran | Actions |
|---|---|
| **Étudiants** | Créer / modifier / supprimer, avec validation champ par champ. La suppression retire aussi le bulletin et le stage orphelins. Export CSV réel (avec BOM pour Excel). |
| **Formateurs** | Créer / modifier / supprimer ; modules et groupes en listes séparées par virgules. |
| **Examens** | Créer / modifier / supprimer. La **saisie des notes est persistée** : écriture d'une note par étudiant, moyenne théorique+pratique, recalcul de la moyenne générale, passage de l'examen à « notes saisies », crédit aux surveillants. |
| **Bulletins** | Publication réelle (unitaire et « tout publier »), modification décision/session/statut. Le bouton PDF rend le bulletin dans un iframe masqué et ouvre la boîte d'impression   « Enregistrer au format PDF » produit un vrai document. |
| **Stages** | Créer / modifier / supprimer une convention + action « Valider le stage ». |
| **Paiements** | Enregistrement sur l'historique de l'étudiant, réduction du solde, passage automatique à « payé » à zéro, numéro de reçu généré, refus des montants supérieurs au solde. |
| **Paramètres** | Ajout/suppression de filières + **réinitialisation des données**. |

### Persistance

Les modifications sont enregistrées dans `localStorage["istpm-data-v1"]` et
survivent au rafraîchissement. Paramètres → « Réinitialiser les données »
restaure le jeu d'origine.

### Bug corrigé pendant la vérification

Le store lisait initialement le `localStorage` dans un `useEffect`, comme les
fournisseurs de langue et de rôle. **Ce motif détruit les données ici** : au
premier rendu, l'effet d'écriture s'exécute avec les données d'origine encore
en état et écrase le stockage ; les effets doublés de `StrictMode` relisent
ensuite cette valeur. **Toute modification aurait été perdue au
rafraîchissement.**

Corrigé par une initialisation paresseuse `useState(load)`   sans risque ici
puisqu'il s'agit d'une SPA sans rendu serveur. Vérifié après correction :
un enregistrement ajouté survit, et les inscrits passent de 12 à 13, le taux
de réussite de 79 % à 73 %, le total à recouvrer +40 000 MAD.

---

## 9. Composants partagés créés

| Fichier | Rôle |
|---|---|
| `src/lib/istpm-store.tsx` | État modifiable + CRUD + agrégats calculés |
| `src/components/dash-sidebar.tsx` | Coque applicative : rail, tiroir mobile, groupes |
| `src/components/dash-page.tsx` | `PageHeader`, `FilterBar`, `FilterSelect`, `DataTable`, `DetailShell`, `DetailRow` |
| `src/components/dash-form.tsx` | `FormDialog`, `ConfirmDialog`, `TextField`, `NumberField`, `SelectField`, `ListField` |

`src/lib/dash-ui.tsx` (système de design existant) a été réécrit en jetons de
marque et enrichi de `toneBadge()`, `TONE_COLORS`, `CHART_COLORS`,
`iconButtonDanger` et des classes de tableau partagées.

Ces primitives expliquent pourquoi chaque page métier reste courte et
visuellement identique aux autres.

---

## 10. Récapitulatif des fichiers

### Créés

```
public/istpm-logo.svg              public/istpm-logo-mark.svg
src/lib/istpm-store.tsx            src/components/dash-sidebar.tsx
src/components/dash-page.tsx       src/components/dash-form.tsx
src/routes/dashboard.etudiants.tsx     src/routes/dashboard.formateurs.tsx
src/routes/dashboard.examens.tsx       src/routes/dashboard.bulletins.tsx
src/routes/dashboard.stages.tsx        .claude/launch.json
```

### Modifiés

```
index.html                 src/styles.css            src/main.tsx
src/lib/auth.tsx           src/lib/api.ts            src/lib/dash-ui.tsx
src/lib/dashboard-i18n.tsx src/components/language-toggle.tsx
src/routes/login.tsx       src/routes/dashboard.tsx
src/routes/dashboard.index.tsx  src/routes/dashboard.paiements.tsx
src/routes/dashboard.settings.tsx
src/locales/dashboard/fr.json   src/locales/dashboard/ar.json
```

### Branché (existait, inutilisé)

```
src/lib/istpm-data.ts
```

### Devenus inutilisés

```
src/components/dash-shell.tsx      (1 240 lignes   ancienne barre horizontale)
public/edu-logo.png                (1,2 Mo)
public/favicon.png                 public/call-qr.svg
src/lib/dashboard-mirror-data.ts   src/components/ui/chart.tsx
src/routes/dashboard.{familles,calendar,affiches,planifications,rapports}.tsx
```

---

## 11. Points d'attention

### Langue et monnaie

Tout est en **français**, tous les montants en **MAD**, et le bouton
**FR / العربية** fonctionne. Les libellés de navigation (y compris
« Scolarité » → « الشؤون الدراسية ») sont traduits dans les deux fichiers de
locale et le sens `rtl` est appliqué. Le **corps** des nouvelles pages est en
français en dur, ce qui suit la convention déjà en place dans le projet
(`affiches`, `calendar`, `settings` faisaient déjà ainsi).

### Vérifications effectuées

- `npm run build` passe (inclut `tsc --noEmit`).
- Application lancée **sans backend** : aucune requête réseau depuis les écrans
  actifs.
- Parcours des trois rôles : navigation, tableaux de bord, gardes-fous.
- Bascule FR ⇄ العربية avec inversion RTL de la barre latérale.
- Barre latérale : repli/dépli persistant, tiroir mobile, `Échap`,
  dépli automatique du groupe, `inert` sur les enfants masqués.
- Cycle de création complet, validation des formulaires, propagation des
  agrégats, persistance après rafraîchissement.

### Non vérifié

Les listes déroulantes **Radix `Select` ne réagissent pas aux clics
automatisés** dans l'outil de test utilisé   dans les dialogues comme ailleurs.
Ce qui les entoure a été validé (rendu, validation, liaison des champs, cycle
de création complet via un formulaire sans liste déroulante), mais **une
création avec choix de Filière/Niveau mérite un test manuel**. Le composant est
le même `Select` shadcn que la barre de filtres utilisait déjà auparavant.

Les captures d'écran ont systématiquement expiré dans l'outil de test : la
vérification a été faite par interrogation du DOM, donc l'aspect visuel précis
(espacements, contrastes) n'a pas été inspecté à l'œil.

### Suggestions

1. **Supprimer le code mort**   `dash-shell.tsx`, `edu-logo.png` (1,2 Mo servi
   pour rien), `dashboard-mirror-data.ts` et les routes non branchées.
2. **Découper le bundle**   1,07 Mo (309 Ko gzip) ; le build signale la taille.
   Un `manualChunks` séparant Recharts suffirait.
3. **Renommer le projet**   `package.json` s'appelle encore
   `school-crm-frontend`.
4. **Traduire le corps des pages** si le support arabe complet devient
   nécessaire.
