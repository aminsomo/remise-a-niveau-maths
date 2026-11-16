"""Tests de cohérence du site (python -m unittest discover -s tests)."""
import json
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urlparse

from htmltree import parse

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / "assets" / "app.js"
MANIFEST = ROOT / "assets" / "chapters.js"


def load_manifest():
    src = MANIFEST.read_text(encoding="utf-8")
    m = re.search(r"/\* BEGIN-JSON \*/(.*)/\* END-JSON \*/", src, re.S)
    assert m, "marqueurs BEGIN-JSON / END-JSON introuvables"
    return json.loads(m.group(1))


def html_files():
    return sorted(p for p in ROOT.rglob("*.html")
                  if not {".git", ".claude", "templates", "node_modules", "playwright-report",
                          "test-results", ".worktrees"} & set(p.parts))


def chapter_entries():
    for s in load_manifest()["subjects"]:
        for c in s["chapters"]:
            yield s, c, ROOT / s["id"] / f"{c['slug']}.html"


def course_api():
    m = re.search(r"window\.Course\s*=\s*\{(.*?)\};", APP_JS.read_text(encoding="utf-8"), re.S)
    return set(re.findall(r"(\w+)\s*:", m.group(1)))


class ManifestTests(unittest.TestCase):
    def test_manifest_is_valid(self):
        data = load_manifest()
        ids = [s["id"] for s in data["subjects"]]
        self.assertEqual(len(ids), len(set(ids)), "identifiants de matière en double")
        for s in data["subjects"]:
            for key in ("id", "title", "chapters"):
                self.assertIn(key, s)
            slugs = [c["slug"] for c in s["chapters"]]
            self.assertEqual(len(slugs), len(set(slugs)), f"slug en double dans {s['id']}")
            for c in s["chapters"]:
                self.assertRegex(c["slug"], r"^[a-z0-9-]+$")
                self.assertTrue(c.get("title") and c.get("summary"), c["slug"])

    def test_every_chapter_file_exists(self):
        for s, c, path in chapter_entries():
            with self.subTest(chapter=f"{s['id']}/{c['slug']}"):
                self.assertTrue(path.exists(), f"{path.relative_to(ROOT)} manquant")

    def test_no_orphan_pages(self):
        listed = {p for _, _, p in chapter_entries()}
        for s in load_manifest()["subjects"]:
            for p in (ROOT / s["id"]).glob("*.html") if (ROOT / s["id"]).exists() else []:
                with self.subTest(page=str(p.relative_to(ROOT))):
                    self.assertIn(p, listed, "page absente du manifeste assets/chapters.js")


class LevelTests(unittest.TestCase):
    """Les chapitres sont regroupés par niveau et couvrent le programme officiel de Première."""
    # Programme 2019 : maths de 1re technologique (enseignement commun) + spécialité PCM STI2D
    PREMIERE = {
        "maths-1re": {"automatismes", "suites", "second-degre", "degre-3", "nombre-derive", "fonctions-derivees",
                      "trigonometrie", "produit-scalaire", "complexes", "primitives", "statistiques",
                      "probabilites", "variables-aleatoires", "algorithmique"},
        "physique-1re": {"mesures-incertitudes", "energie-enjeux", "energie-chimique", "energie-electrique",
                         "energie-interne", "energie-mecanique", "pression-hydrostatique", "lumiere-energie",
                         "matiere-materiaux", "combustions", "oxydoreduction", "ondes", "ondes-sonores",
                         "ondes-electromagnetiques"},
    }

    def test_every_subject_has_a_known_level(self):
        data = load_manifest()
        levels = [l["id"] for l in data["levels"]]
        self.assertEqual(levels, ["1re", "tle", "prepa"])
        for s in data["subjects"]:
            with self.subTest(subject=s["id"]):
                self.assertIn(s.get("level"), levels)
        order = [levels.index(s["level"]) for s in data["subjects"]]
        self.assertEqual(order, sorted(order), "les matières suivent l'ordre des niveaux (navigation préc./suiv.)")

    def test_premiere_covers_official_programme(self):
        subjects = {s["id"]: s for s in load_manifest()["subjects"]}
        for sid, slugs in self.PREMIERE.items():
            with self.subTest(subject=sid):
                self.assertIn(sid, subjects)
                self.assertEqual(subjects[sid]["level"], "1re")
                self.assertEqual({c["slug"] for c in subjects[sid]["chapters"]}, slugs)

    def test_premiere_chapters_have_drill_and_plot(self):
        for sid in self.PREMIERE:
            for path in sorted((ROOT / sid).glob("*.html")):
                with self.subTest(page=f"{sid}/{path.name}"):
                    src = path.read_text(encoding="utf-8")
                    self.assertIn("Course.drill(", src, "un entraînement auto-généré (avec calculatrice) par chapitre")
                    self.assertIn('class="plot', src, "au moins un graphique manipulable (plein écran)")


class HtmlTests(unittest.TestCase):
    def test_pages_are_well_formed(self):
        for p in html_files():
            with self.subTest(page=str(p.relative_to(ROOT))):
                src = p.read_text(encoding="utf-8")
                b = parse(src)
                self.assertEqual(b.errors, [])
                html = b.root.find("html")
                self.assertEqual(html.attrs.get("lang"), "fr")
                self.assertTrue(b.root.find("title").text().strip())
                self.assertIsNotNone(b.root.find("meta", charset="utf-8"))
                self.assertIsNotNone(b.root.find("meta", name="viewport"))

    def test_unique_ids(self):
        for p in html_files():
            with self.subTest(page=str(p.relative_to(ROOT))):
                ids = [n.attrs["id"] for n in parse(p.read_text(encoding="utf-8")).root.iter() if "id" in n.attrs]
                dups = {i for i in ids if ids.count(i) > 1}
                self.assertFalse(dups, f"id en double : {dups}")

    def test_local_links_resolve(self):
        for p in html_files():
            tree = parse(p.read_text(encoding="utf-8")).root
            ids = {n.attrs["id"] for n in tree.iter() if "id" in n.attrs}
            for n in tree.iter():
                ref = n.attrs.get("href") or n.attrs.get("src")
                if not ref or n.tag not in ("a", "link", "script", "img"):
                    continue
                u = urlparse(ref)
                if u.scheme in ("http", "https", "mailto"):
                    self.assertEqual(u.scheme if u.scheme != "mailto" else "https", "https",
                                     f"{p.name}: lien non sécurisé {ref}")
                    continue
                with self.subTest(page=p.name, ref=ref):
                    if ref.startswith("#"):
                        self.assertIn(ref[1:], ids)
                    else:
                        target = (p.parent / u.path).resolve()
                        self.assertTrue(target.exists(), f"cible introuvable : {ref}")

    def test_math_delimiters_balanced(self):
        for p in html_files():
            with self.subTest(page=str(p.relative_to(ROOT))):
                src = re.sub(r"<script.*?</script>", "", p.read_text(encoding="utf-8"), flags=re.S)
                self.assertEqual(src.count("\\("), src.count("\\)"), "\\( et \\) déséquilibrés")
                self.assertEqual(src.count("\\["), src.count("\\]"), "\\[ et \\] déséquilibrés")
                # une formule ne doit pas en contenir une autre
                for m in re.finditer(r"\\\((.*?)\\\)", src, re.S):
                    self.assertNotIn("\\[", m.group(1))


class ChapterStructureTests(unittest.TestCase):
    MIN_QUIZ = 4
    MIN_VIDEOS = 2

    def test_chapter_structure(self):
        for s, c, path in chapter_entries():
            if not path.exists():
                continue
            key = f"{s['id']}/{c['slug']}"
            with self.subTest(chapter=key):
                tree = parse(path.read_text(encoding="utf-8")).root
                body = tree.find("body")
                self.assertEqual(body.attrs.get("data-chapter"), key)
                self.assertEqual(body.attrs.get("data-root"), "../")
                self.assertIsNotNone(tree.find("main", cls="chapter"))
                self.assertEqual(tree.find("h1").text().strip(), c["title"],
                                 "le <h1> doit reprendre le titre du manifeste")
                self.assertGreaterEqual(len(list(tree.find_all("h2"))), 3)
                self.assertTrue(any(tree.find_all(cls="def")) or any(tree.find_all(cls="prop")),
                                "aucune définition / propriété")
                self.assertGreaterEqual(len(list(tree.find_all(cls="example"))), 2, "moins de 2 exemples")
                self.assertGreaterEqual(len(list(tree.find_all(cls="widget"))), 1, "aucun widget interactif")

    def test_quizzes(self):
        for s, c, path in chapter_entries():
            if not path.exists():
                continue
            with self.subTest(chapter=f"{s['id']}/{c['slug']}"):
                tree = parse(path.read_text(encoding="utf-8")).root
                quiz = tree.find(cls="quiz")
                self.assertIsNotNone(quiz, "pas de quiz")
                qs = list(quiz.find_all(cls="q"))
                self.assertGreaterEqual(len(qs), self.MIN_QUIZ)
                for i, q in enumerate(qs):
                    choices = q.find("ol", cls="choices")
                    self.assertIsNotNone(choices, f"question {i + 1} sans choix")
                    n = len([li for li in choices.children if li.tag == "li"])
                    self.assertGreaterEqual(n, 2)
                    ans = int(q.attrs.get("data-answer", "-1"))
                    self.assertTrue(0 <= ans < n, f"question {i + 1} : data-answer={ans} hors de [0,{n - 1}]")
                    self.assertIsNotNone(q.find(cls="explain"), f"question {i + 1} sans explication")

    def test_videos(self):
        for s, c, path in chapter_entries():
            if not path.exists():
                continue
            with self.subTest(chapter=f"{s['id']}/{c['slug']}"):
                tree = parse(path.read_text(encoding="utf-8")).root
                sec = tree.find(id="videos")
                self.assertIsNotNone(sec, "section #videos manquante")
                links = [a.attrs["href"] for a in sec.find_all("a")]
                self.assertGreaterEqual(len(links), self.MIN_VIDEOS)
                for href in links:
                    u = urlparse(href)
                    self.assertEqual(u.scheme, "https")
                    self.assertIn(u.netloc, {"www.youtube.com", "youtube.com", "www.lumni.fr"}, href)
                    if "youtube" in u.netloc:
                        self.assertTrue(u.path in ("/results",) or u.path.startswith(("/watch", "/@", "/playlist")), href)


class ScriptTests(unittest.TestCase):
    def test_pages_use_existing_course_api(self):
        api = course_api()
        self.assertTrue({"plot", "onInput", "drill", "fmt"} <= api)
        for p in html_files():
            for script in parse(p.read_text(encoding="utf-8")).scripts:
                for name in re.findall(r"\bCourse\.(\w+)", script):
                    with self.subTest(page=p.name, api=name):
                        self.assertIn(name, api)

    def test_inline_scripts_wait_for_dom(self):
        for p in html_files():
            for script in parse(p.read_text(encoding="utf-8")).scripts:
                if "Course." in script:
                    with self.subTest(page=p.name):
                        self.assertIn("DOMContentLoaded", script,
                                      "les scripts de page doivent attendre DOMContentLoaded (app.js est en defer)")

    @unittest.skipUnless(shutil.which("node"), "node absent : vérification syntaxique JS ignorée")
    def test_javascript_syntax(self):
        sources = [(f, f.read_text(encoding="utf-8")) for f in (ROOT / "assets").glob("*.js")]
        for p in html_files():
            for i, s in enumerate(parse(p.read_text(encoding="utf-8")).scripts):
                sources.append((Path(f"{p.name}#script{i}"), s))
        with tempfile.TemporaryDirectory() as d:
            for name, src in sources:
                with self.subTest(script=str(name)):
                    f = Path(d) / "check.js"
                    f.write_text(src, encoding="utf-8")
                    r = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
                    self.assertEqual(r.returncode, 0, r.stderr)


class EngineWiringTests(unittest.TestCase):
    """Chaque page charge les modules dans le bon ordre et reste utilisable sur mobile."""
    ORDER = ["core.js", "chapters.js", "app.js", "brouillon.js"]

    def test_scripts_loaded_in_order(self):
        for p in html_files():
            with self.subTest(page=str(p.relative_to(ROOT))):
                tree = parse(p.read_text(encoding="utf-8")).root
                srcs = [n.attrs.get("src", "") for n in tree.iter() if n.tag == "script" and n.attrs.get("src")]
                local = [Path(urlparse(x).path).name for x in srcs if not x.startswith("http")]
                self.assertEqual(local, self.ORDER, "scripts locaux attendus dans cet ordre : " + ", ".join(self.ORDER))
                for n in tree.iter():
                    if n.tag == "script" and n.attrs.get("src") and not n.attrs["src"].startswith("http"):
                        self.assertIn("defer", n.attrs, f"{n.attrs['src']} doit être en defer")

    def test_viewport_supports_notch(self):
        for p in html_files():
            with self.subTest(page=str(p.relative_to(ROOT))):
                meta = parse(p.read_text(encoding="utf-8")).root.find("meta", name="viewport")
                content = meta.attrs.get("content", "")
                self.assertIn("width=device-width", content)
                self.assertIn("viewport-fit=cover", content)
                self.assertNotIn("user-scalable=no", content, "ne jamais bloquer le zoom (accessibilité)")
                self.assertNotIn("maximum-scale", content)

    def test_core_has_no_dynamic_code_execution(self):
        src = (ROOT / "assets" / "core.js").read_text(encoding="utf-8")
        code = re.sub(r"/\*.*?\*/|//[^\n]*", "", src, flags=re.S)
        for bad in (r"\beval\s*\(", r"\bFunction\s*\(", r"new\s+Function"):
            self.assertIsNone(re.search(bad, code), "l'évaluateur doit rester sûr (pas d'eval)")
        for f in ("app.js", "brouillon.js"):
            src2 = (ROOT / "assets" / f).read_text(encoding="utf-8")
            self.assertIsNone(re.search(r"\bFunction\s*\(|\beval\s*\(", src2), f)

    def test_hidden_attribute_always_wins(self):
        css = (ROOT / "assets" / "style.css").read_text(encoding="utf-8")
        self.assertRegex(css, r"\[hidden\]\s*\{\s*display:\s*none\s*!important")


@unittest.skipUnless(shutil.which("node"), "node absent : tests unitaires JavaScript ignorés")
class JavaScriptUnitTests(unittest.TestCase):
    def test_node_unit_tests(self):
        r = subprocess.run(["node", "--test", *map(str, sorted((ROOT / "tests" / "js").glob("*.test.js")))], capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stdout[-4000:] + r.stderr[-2000:])


if __name__ == "__main__":
    unittest.main()


class PagesWorkflow(unittest.TestCase):
    def test_pages_publie_tous_les_dossiers_de_pages(self):
        """Le déploiement doit copier chaque dossier contenant des pages HTML (ex. maths-1re)."""
        wf = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
        m = re.search(r"for p in ([^;]+); do", wf)
        self.assertIsNotNone(m, "liste de copie introuvable dans pages.yml")
        copied = set(m.group(1).split())
        exclus = {"templates", "node_modules", "playwright-report"}
        dossiers = {f.parent.name for f in ROOT.glob("*/*.html") if f.parent.name not in exclus}
        self.assertFalse(dossiers - copied, f"dossiers non publiés par pages.yml : {dossiers - copied}")
