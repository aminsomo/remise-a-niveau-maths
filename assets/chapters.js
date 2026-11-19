/* Manifeste du cours. Le bloc entre les marqueurs est du JSON strict :
   il est relu par les tests (tests/test_site.py). */
window.COURSE = /* BEGIN-JSON */ {
  "subjects": [
    {
      "id": "maths-1re",
      "level": "1re",
      "title": "Mathématiques — Première",
      "short": "Maths 1re",
      "color": "maths",
      "desc": "Tronc commun de 1re technologique + partie maths de la spécialité « physique-chimie et mathématiques » STI2D.",
      "chapters": [
        {
          "slug": "automatismes",
          "title": "Automatismes : pourcentages, évolutions, calcul",
          "summary": "Proportions, taux d'évolution, indices, puissances, équations, droites.",
          "tags": [
            "tronc commun",
            "essentiel"
          ]
        },
        {
          "slug": "suites",
          "title": "Suites : modèles d'évolutions discrètes",
          "summary": "Récurrence, suites arithmétiques et géométriques, variations, seuil.",
          "tags": [
            "tronc commun",
            "essentiel"
          ]
        },
        {
          "slug": "second-degre",
          "title": "Fonctions polynômes du second degré",
          "summary": "Paraboles, sommet, axe de symétrie, racines et signe.",
          "tags": [
            "tronc commun",
            "essentiel"
          ]
        },
        {
          "slug": "degre-3",
          "title": "Fonctions polynômes de degré 3",
          "summary": "x ↦ ax³ + b, forme factorisée, signe, racine cubique.",
          "tags": [
            "tronc commun"
          ]
        },
        {
          "slug": "nombre-derive",
          "title": "Nombre dérivé et tangente",
          "summary": "Taux de variation, sécantes, tangente, dy/dx, approximation affine.",
          "tags": [
            "tronc commun",
            "spé",
            "essentiel"
          ]
        },
        {
          "slug": "fonctions-derivees",
          "title": "Fonctions dérivées et variations",
          "summary": "xⁿ, 1/x, produit, quotient, cos, sin, f(ax + b), tableaux de variations.",
          "tags": [
            "spé",
            "essentiel"
          ]
        },
        {
          "slug": "trigonometrie",
          "title": "Trigonométrie : cercle, radians, cos et sin",
          "summary": "Radian, angles orientés, angles associés, A cos(ωt + φ).",
          "tags": [
            "spé",
            "essentiel"
          ]
        },
        {
          "slug": "produit-scalaire",
          "title": "Produit scalaire dans le plan",
          "summary": "Projection, coordonnées, orthogonalité, Al Kashi, travail d'une force.",
          "tags": [
            "spé"
          ]
        },
        {
          "slug": "complexes",
          "title": "Nombres complexes : forme algébrique et trigonométrique",
          "summary": "Calculs, conjugué, module, argument, plan complexe.",
          "tags": [
            "spé STI2D",
            "essentiel"
          ]
        },
        {
          "slug": "primitives",
          "title": "Primitives et méthode d'Euler",
          "summary": "Primitives des polynômes et de A cos(ωt + φ), méthode d'Euler.",
          "tags": [
            "spé"
          ]
        },
        {
          "slug": "statistiques",
          "title": "Statistiques à deux variables",
          "summary": "Tableaux croisés, fréquences conditionnelles, nuage, ajustement affine.",
          "tags": [
            "tronc commun"
          ]
        },
        {
          "slug": "probabilites",
          "title": "Probabilités conditionnelles et indépendance",
          "summary": "P_A(B), indépendance, arbres, épreuves de Bernoulli répétées.",
          "tags": [
            "tronc commun"
          ]
        },
        {
          "slug": "variables-aleatoires",
          "title": "Variables aléatoires et loi de Bernoulli",
          "summary": "Loi, espérance, Bernoulli, simulation et fluctuation d'échantillonnage.",
          "tags": [
            "tronc commun"
          ]
        },
        {
          "slug": "algorithmique",
          "title": "Algorithmique et programmation en Python",
          "summary": "Variables, conditions, boucles, fonctions, listes, simulations.",
          "tags": [
            "tronc commun",
            "outils"
          ]
        }
      ]
    },
    {
      "id": "physique-1re",
      "level": "1re",
      "title": "Physique-chimie — Première",
      "short": "Physique 1re",
      "color": "physique",
      "desc": "Partie physique-chimie de la spécialité « physique-chimie et mathématiques » STI2D : énergie, matière et matériaux, ondes et informations.",
      "chapters": [
        {
          "slug": "energie-enjeux",
          "title": "L'énergie et ses enjeux",
          "summary": "Formes et sources d'énergie, chaînes énergétiques, rendement, E = P × Δt.",
          "tags": [
            "énergie",
            "essentiel"
          ]
        },
        {
          "slug": "energie-interne",
          "title": "Énergie interne",
          "summary": "Température et kelvin, transferts thermiques, ΔU = m·c·ΔT, changements d'état Q = m·L, calorimètre.",
          "tags": [
            "énergie"
          ]
        },
        {
          "slug": "energie-chimique",
          "title": "Énergie chimique",
          "summary": "Système chimique, transformations exo- et endothermiques, combustion, pouvoir calorifique E = m × PC, dangers.",
          "tags": [
            "énergie"
          ]
        },
        {
          "slug": "mesures-incertitudes",
          "title": "Mesures et incertitudes",
          "summary": "Unités SI, chiffres significatifs, erreurs, incertitude-type, écart normalisé.",
          "tags": [
            "méthode",
            "essentiel"
          ]
        },
        {
          "slug": "energie-electrique",
          "title": "Énergie électrique",
          "summary": "Circuits, valeurs moyenne et efficace, lois de Kirchhoff, Ohm, Joule, P = UI.",
          "tags": [
            "énergie",
            "essentiel"
          ]
        },
        {
          "slug": "energie-mecanique",
          "title": "Mouvement et énergie mécanique",
          "summary": "Vitesse, accélération, Ec, Ep, Em, forces, principe d'inertie, travail.",
          "tags": [
            "énergie",
            "essentiel"
          ]
        },
        {
          "slug": "pression-hydrostatique",
          "title": "Pression et statique des fluides",
          "summary": "Pression, force pressante, principe fondamental de l'hydrostatique.",
          "tags": [
            "énergie"
          ]
        },
        {
          "slug": "lumiere-energie",
          "title": "Énergie transportée par la lumière",
          "summary": "Irradiance, panneaux photovoltaïques, rendement, laser et protection.",
          "tags": [
            "énergie"
          ]
        },
        {
          "slug": "matiere-materiaux",
          "title": "Organisation de la matière et matériaux",
          "summary": "Atome, isotopes, Lewis, concentrations, dilution, propriétés des matériaux.",
          "tags": [
            "matière",
            "essentiel"
          ]
        },
        {
          "slug": "combustions",
          "title": "Réactions chimiques de combustion",
          "summary": "Alcanes, alcènes, alcools, équations, réactif limitant, biocarburants.",
          "tags": [
            "matière"
          ]
        },
        {
          "slug": "oxydoreduction",
          "title": "Réactions d'oxydoréduction",
          "summary": "Oxydant, réducteur, demi-équations, équations, corrosion.",
          "tags": [
            "matière"
          ]
        },
        {
          "slug": "ondes",
          "title": "Introduction à la notion d'onde",
          "summary": "Ondes mécaniques et électromagnétiques, célérité, période, λ = v/f.",
          "tags": [
            "ondes",
            "essentiel"
          ]
        },
        {
          "slug": "ondes-sonores",
          "title": "Ondes sonores et ultrasonores",
          "summary": "Propagation, écho et distances, hauteur, intensité et puissance acoustiques.",
          "tags": [
            "ondes"
          ]
        },
        {
          "slug": "ondes-electromagnetiques",
          "title": "Ondes électromagnétiques",
          "summary": "Spectre, E = hf, λ = c/f, laser, risques des sources lumineuses.",
          "tags": [
            "ondes"
          ]
        }
      ]
    },
    {
      "id": "maths",
      "title": "Mathématiques — Terminale",
      "short": "Maths Tle",
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
      ],
      "level": "tle"
    },
    {
      "id": "physique",
      "title": "Physique-chimie — Terminale",
      "short": "Physique Tle",
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
      ],
      "level": "tle"
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
      ],
      "level": "prepa"
    }
  ],
  "levels": [
    {
      "id": "1re",
      "title": "Première STI2D",
      "desc": "Tout le programme de 1re : enseignement commun de maths et spécialité « physique-chimie et mathématiques »."
    },
    {
      "id": "tle",
      "title": "Terminale STI2D",
      "desc": "Tronc commun, spécialité maths et spécialité physique-chimie de Terminale."
    },
    {
      "id": "prepa",
      "title": "Vers la prépa",
      "desc": "Ce qu'on attend de toi dès septembre en CPGE."
    }
  ]
} /* END-JSON */;
