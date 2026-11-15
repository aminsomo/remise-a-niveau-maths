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
      "chapters": []
    },
    {
      "id": "physique",
      "title": "Physique-chimie",
      "short": "Physique",
      "color": "physique",
      "desc": "Spécialité physique-chimie et mathématiques STI2D : mécanique, énergie, électricité, ondes, thermique, fluides, chimie.",
      "chapters": []
    },
    {
      "id": "prepa",
      "title": "Pont vers la prépa",
      "short": "Prépa",
      "color": "prepa",
      "desc": "Ce qu'on attend de toi dès septembre en CPGE (TSI, PTSI, TPC) : rigueur de calcul, raisonnement, méthodes.",
      "chapters": []
    }
  ]
} /* END-JSON */;
