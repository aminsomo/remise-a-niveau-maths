# Remise à niveau — Terminale STI2D → Prépa

Cours interactif en français (maths + physique-chimie) pour consolider tout le programme de
**Terminale STI2D** (tronc commun, spécialité maths, spécialité physique-chimie et mathématiques)
et arriver en **classe préparatoire** (TSI, PTSI…) sans lacune.

Chaque chapitre contient : cours, exemples rédigés, animations manipulables, exercices
auto-générés, quiz corrigé et liens vers des vidéos en français.

## Utilisation

Ouvrir `index.html` dans un navigateur (double-clic suffit), ou servir le dossier :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

Les formules sont rendues avec [KaTeX](https://katex.org) (chargé depuis un CDN : il faut une
connexion internet pour un affichage propre des formules). La progression est enregistrée dans le
navigateur (localStorage).

## Structure

```
index.html            accueil (liste des chapitres générée depuis le manifeste)
assets/chapters.js    manifeste : matières et chapitres (JSON entre marqueurs)
assets/app.js         moteur commun : navigation, quiz, traceur de courbes, exercices
assets/style.css      styles communs (thème clair/sombre)
maths/ physique/ prepa/   un fichier HTML par chapitre
templates/chapitre.html   modèle pour écrire un nouveau chapitre
tests/                tests de cohérence (bibliothèque standard Python)
```

## Ajouter un chapitre

1. Copier `templates/chapitre.html` vers `<matière>/<slug>.html`.
2. Ajouter l'entrée `{ "slug", "title", "summary", "tags" }` dans `assets/chapters.js`.
3. Lancer les tests.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

Ils vérifient : manifeste ↔ fichiers, HTML bien formé, liens locaux, ancres, délimiteurs de
formules équilibrés, structure de chaque chapitre (définitions, ≥ 2 exemples, ≥ 1 widget,
quiz ≥ 4 questions avec réponse valide et explication, ≥ 2 liens vidéo), utilisation de l'API
`Course` existante, et syntaxe JavaScript (si `node` est installé). Ils tournent aussi en CI
(GitHub Actions) sur chaque pull request.

## Sources

Le contenu est original et suit les programmes officiels de Terminale STI2D publiés au Bulletin
officiel (voir eduscol.education.fr). Les liens vidéo pointent vers des recherches YouTube
(chaînes pédagogiques françaises : Yvan Monka, etc.) pour rester valides dans le temps.
