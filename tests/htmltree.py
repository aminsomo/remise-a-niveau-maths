"""Mini arbre HTML (bibliothèque standard uniquement) pour les tests."""
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
        "source", "track", "wbr"}


class Node:
    def __init__(self, tag, attrs, parent=None, line=0):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children = []
        self.text_parts = []
        self.line = line

    @property
    def classes(self):
        return set((self.attrs.get("class") or "").split())

    def text(self):
        out = list(self.text_parts)
        for c in self.children:
            out.append(c.text())
        return " ".join(out)

    def iter(self):
        yield self
        for c in self.children:
            yield from c.iter()

    def find_all(self, tag=None, cls=None, **attrs):
        for n in self.iter():
            if n is self:
                continue
            if tag and n.tag != tag:
                continue
            if cls and cls not in n.classes:
                continue
            if any(n.attrs.get(k) != v for k, v in attrs.items()):
                continue
            yield n

    def find(self, *a, **kw):
        return next(self.find_all(*a, **kw), None)


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", [])
        self.cur = self.root
        self.scripts = []          # contenu des <script> inline
        self.errors = []
        self._in_script = False

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.cur, self.getpos()[0])
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node
        if tag == "script" and "src" not in node.attrs:
            self._in_script = True
            self.scripts.append("")

    def handle_startendtag(self, tag, attrs):
        node = Node(tag, attrs, self.cur, self.getpos()[0])
        self.cur.children.append(node)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if tag == "script":
            self._in_script = False
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is self.root:
            self.errors.append(f"ligne {self.getpos()[0]} : </{tag}> sans ouverture")
            return
        if n is not self.cur:
            self.errors.append(f"ligne {self.getpos()[0]} : <{self.cur.tag}> non fermé avant </{tag}>")
        self.cur = n.parent

    def handle_data(self, data):
        if self._in_script:
            self.scripts[-1] += data
        elif self.cur.tag not in ("style",):
            self.cur.text_parts.append(data)


def parse(source):
    b = TreeBuilder()
    b.feed(source)
    b.close()
    if b.cur is not b.root:
        b.errors.append(f"<{b.cur.tag}> non fermé en fin de document")
    return b
