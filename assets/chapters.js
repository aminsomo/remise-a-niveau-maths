/* Manifeste du cours. Le bloc entre les marqueurs est du JSON strict :
   il est relu par les tests (tests/test_site.py). */
window.COURSE = /* BEGIN-JSON */ {
  "subjects": [
    {
      "id": "maths",
      "title": "Mathématiques",
      "short": "Maths",
      "color": "maths",
      "desc": "Tronc commun + spécialité STI2D : analyse, nombres complexes, géométrie, probabilités.",
      "chapters": [
        {
          "slug": "suites",
          "title": "Suites numériques",
          "summary": "Arithmétiques, géométriques, sommes, limites, algorithme de seuil.",
          "tags": [
            "tronc commun",
            "essentiel"
          ]
        },
        {
          "slug": "derivation",
          "title": "Dérivation et variations",
          "summary": "Nombre dérivé, tangente, formules, variations, optimisation.",
          "tags": [
            "tronc commun",
            "spé",
            "essentiel"
          ]
        },
        {
          "slug": "exponentielle",
          "title": "Fonction exponentielle",
          "summary": "Règles de calcul, limites, e^(kt), constante de temps τ.",
          "tags": [
            "spé",
            "essentiel"
          ]
        },
        {
          "slug": "logarithme",
          "title": "Logarithmes (ln et log)",
          "summary": "ln réciproque de exp, règles de calcul, seuils, décibels et pH.",
          "tags": [
            "tronc commun",
            "spé"
          ]
        },
        {
          "slug": "integrales",
          "title": "Primitives et intégrales",
          "summary": "Primitives usuelles, intégrale et aire, valeur moyenne et efficace.",
          "tags": [
            "spé",
            "essentiel"
          ]
        },
        {
          "slug": "equations-differentielles",
          "title": "Équations différentielles",
          "summary": "y' = ay, y' = ay + b, y'' + ω²y = 0, applications physiques.",
          "tags": [
            "spé"
          ]
        },
        {
          "slug": "trigonometrie",
          "title": "Trigonométrie et signaux sinusoïdaux",
          "summary": "Radians, cercle trigo, formules, A cos(ωt + φ).",
          "tags": [
            "spé",
            "essentiel"
          ]
        },
        {
          "slug": "complexes",
          "title": "Nombres complexes",
          "summary": "Formes algébrique, trigonométrique, exponentielle ; impédances.",
          "tags": [
            "spé STI2D",
            "essentiel"
          ]
        },
        {
          "slug": "produit-scalaire",
          "title": "Vecteurs, produit scalaire et espace",
          "summary": "Produit scalaire, orthogonalité, travail d'une force, droites et plans.",
          "tags": [
            "spé"
          ]
        },
        {
          "slug": "probabilites",
          "title": "Probabilités et loi binomiale",
          "summary": "Conditionnelles, arbres, espérance, loi binomiale, simulation.",
          "tags": [
            "tronc commun",
            "spé"
          ]
        },
        {
          "slug": "statistiques",
          "title": "Statistiques à deux variables",
          "summary": "Nuage de points, moindres carrés, corrélation, changement de variable.",
          "tags": [
            "tronc commun"
          ]
        }
      ]
    },
    {
      "id": "physique",
      "title": "Physique-chimie",
      "short": "Physique",
      "color": "physique",
      "desc": "Spécialité physique-chimie et mathématiques STI2D : mécanique, énergie, électricité, ondes, thermique, fluides, chimie.",
      "chapters": [
        {
          "slug": "mecanique",
          "title": "Mouvement et lois de Newton",
          "summary": "Cinématique, PFD, plan incliné, tir de projectile.",
          "tags": [
            "mouvement",
            "essentiel"
          ]
        },
        {
          "slug": "energie",
          "title": "Énergie, puissance et rendement",
          "summary": "Ec, Ep, théorème de l'énergie cinétique, chaînes de conversion.",
          "tags": [
            "énergie",
            "essentiel"
          ]
        },
        {
          "slug": "electricite",
          "title": "Électricité : circuits, condensateur, alternatif",
          "summary": "Kirchhoff, Joule, circuit RC, valeurs efficaces, P, Q, S.",
          "tags": [
            "énergie électrique",
            "essentiel"
          ]
        },
        {
          "slug": "ondes",
          "title": "Ondes et signaux",
          "summary": "λ = v/f, spectre, photons, atténuation, débit binaire.",
          "tags": [
            "ondes"
          ]
        },
        {
          "slug": "thermique",
          "title": "Énergie thermique et transferts",
          "summary": "mcΔθ, chaleur latente, résistance thermique, isolation.",
          "tags": [
            "énergie thermique"
          ]
        },
        {
          "slug": "fluides",
          "title": "Mécanique des fluides",
          "summary": "Pression, Pascal, Archimède, débit, Bernoulli.",
          "tags": [
            "fluides"
          ]
        },
        {
          "slug": "chimie",
          "title": "Chimie : oxydoréduction, piles, combustions",
          "summary": "Avancement, redox, piles, électrolyse, combustions, pH.",
          "tags": [
            "chimie",
            "énergie chimique"
          ]
        }
      ]
    },
    {
      "id": "prepa",
      "title": "Pont vers la prépa",
      "short": "Prépa",
      "color": "prepa",
      "desc": "Ce qu'on attend de toi dès septembre en CPGE (TSI, PTSI, TPC) : rigueur de calcul, raisonnement, méthodes.",
      "chapters": [
        {
          "slug": "calcul-algebrique",
          "title": "Calcul algébrique sans faute",
          "summary": "Fractions, puissances, identités, second degré, inéquations.",
          "tags": [
            "indispensable",
            "essentiel"
          ]
        },
        {
          "slug": "logique-raisonnement",
          "title": "Logique et raisonnement",
          "summary": "Quantificateurs, implication, contraposée, absurde, rédaction.",
          "tags": [
            "rédaction"
          ]
        },
        {
          "slug": "sommes-recurrence",
          "title": "Sommes et récurrence",
          "summary": "Symbole Σ, télescopage, sommes usuelles, récurrence.",
          "tags": [
            "outils",
            "essentiel"
          ]
        },
        {
          "slug": "attendus-prepa",
          "title": "Réussir son entrée en prépa",
          "summary": "Prépa TSI, colles, méthodes, auto-diagnostic et planning.",
          "tags": [
            "méthode"
          ]
        }
      ]
    }
  ]
} /* END-JSON */;
