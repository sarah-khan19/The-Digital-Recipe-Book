#!/usr/bin/env python3
"""Convert Figma MCP React dumps into pixel-locked HTML pages (1440px frames)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "figma"
TOOLS = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools")

# Explicit newest design-context sources per page
PAGES = [
    {
        "slug": "home",
        "src": TOOLS / "ccb3fc72-6550-46ac-872a-e99c61cec6c9.txt",
        "out": ROOT / "index.html",
        "title": "Home",
        "active": "home",
        "depth": 0,
        "min_h": 2450,
    },
    {
        "slug": "all-recipes",
        "src": TOOLS / "fb2ff03a-4f37-41e4-8cea-57f6bf71b2f3.txt",
        "out": ROOT / "all-recipes.html",
        "title": "All Recipes",
        "active": "recipes",
        "depth": 0,
        "min_h": 2700,
    },
    {
        "slug": "brownies",
        "src": TOOLS / "056b209e-f3ee-411b-b75e-28a4a612e170.txt",
        "out": ROOT / "recipes" / "brownies.html",
        "title": "Chocolate Brownies",
        "active": "recipes",
        "depth": 1,
        "min_h": 2300,
    },
    {
        "slug": "chocolate-chip-cookies",
        "src": TOOLS / "7a920adf-6358-4f94-a63b-bdd7d163a943.txt",
        "out": ROOT / "recipes" / "chocolate-chip-cookies.html",
        "title": "Chocolate Chip Cookies",
        "active": "recipes",
        "depth": 1,
        "min_h": 2300,
    },
    {
        "slug": "banana-bread",
        "src": TOOLS / "6d902f60-daca-47b3-bd5d-3bc055e71918.txt",
        "out": ROOT / "recipes" / "banana-bread.html",
        "title": "Banana Bread",
        "active": "recipes",
        "depth": 1,
        "min_h": 2400,
    },
    {
        "slug": "lemon-poppyseed-loaf",
        "src": TOOLS / "d94aa6d1-0467-463f-867d-9ead3d2557bd.txt",
        "out": ROOT / "recipes" / "lemon-poppyseed-loaf.html",
        "title": "Lemon Poppyseed Loaf",
        "active": "recipes",
        "depth": 1,
        "min_h": 2300,
    },
    {
        "slug": "banana-crumble-muffins",
        "src": TOOLS / "9804b886-fb9d-4aa0-989d-cff476802736.txt",
        "out": ROOT / "recipes" / "banana-crumble-muffins.html",
        "title": "Banana Crumble Muffins",
        "active": "recipes",
        "depth": 1,
        "min_h": 2500,
    },
    {
        "slug": "funnel-cake",
        "src": TOOLS / "7d8f55ca-84c1-4633-b758-130b2097400b.txt",
        "out": ROOT / "recipes" / "funnel-cake.html",
        "title": "Funnel Cake",
        "active": "recipes",
        "depth": 1,
        "min_h": 2600,
    },
    {
        "slug": "chocolate-chip-muffins",
        "src": TOOLS / "e93c5f2b-e3e8-4530-a099-08076862eb98.txt",
        "out": ROOT / "recipes" / "chocolate-chip-muffins.html",
        "title": "Chocolate Chip Muffins",
        "active": "recipes",
        "depth": 1,
        "min_h": 2300,
    },
    {
        "slug": "strawberry-compote",
        "src": TOOLS / "d5035d68-5577-4063-8c9d-f53dcd8aef6e.txt",
        "out": ROOT / "recipes" / "strawberry-compote.html",
        "title": "Strawberry Compote",
        "active": "recipes",
        "depth": 1,
        "min_h": 2000,
    },
    {
        "slug": "chocolate-ganache",
        "src": TOOLS / "fcc325b3-b9e9-4356-980a-4e5e90ea29c6.txt",
        "out": ROOT / "recipes" / "chocolate-ganache.html",
        "title": "Chocolate Ganache",
        "active": "recipes",
        "depth": 1,
        "min_h": 2000,
    },
]


def resolve_asset(url: str) -> str | None:
    m = re.search(r"/asset/([a-f0-9-]+)", url)
    if not m:
        return None
    matches = list(ASSET_DIR.glob(f"{m.group(1)}.*"))
    return f"assets/figma/{matches[0].name}" if matches else None


def split_classes(class_str: str) -> list[str]:
    tokens, buf, depth = [], [], 0
    for ch in class_str:
        if ch == "[":
            depth += 1
            buf.append(ch)
        elif ch == "]":
            depth = max(0, depth - 1)
            buf.append(ch)
        elif ch.isspace() and depth == 0:
            if buf:
                tokens.append("".join(buf))
                buf = []
        else:
            buf.append(ch)
    if buf:
        tokens.append("".join(buf))
    return tokens


def bracket(tok: str, prefix: str) -> str | None:
    # Supports both bg-[#fff] and size-[444px] / left-[10px]
    for sep in ("-[", "["):
        key = prefix + sep if not prefix.endswith("-") or sep == "[" else prefix[:-1] + sep
        # Try: prefix + "-[" + value + "]"  OR prefix + "[" + value + "]"
    if tok.startswith(prefix + "-[") and tok.endswith("]"):
        return tok[len(prefix) + 2 : -1]
    if tok.startswith(prefix + "[") and tok.endswith("]"):
        return tok[len(prefix) + 1 : -1]
    return None


SIMPLE = {
    "absolute": "position:absolute;",
    "relative": "position:relative;",
    "fixed": "position:fixed;",
    "contents": "display:contents;",
    "block": "display:block;",
    "flex": "display:flex;",
    "inline-flex": "display:inline-flex;",
    "grid": "display:grid;",
    "hidden": "display:none;",
    "size-full": "width:100%;height:100%;",
    "w-full": "width:100%;",
    "h-full": "height:100%;",
    "inset-0": "top:0;right:0;bottom:0;left:0;",
    "overflow-clip": "overflow:hidden;",
    "overflow-hidden": "overflow:hidden;",
    "overflow-x-auto": "overflow-x:auto;",
    "overflow-y-clip": "overflow-y:hidden;",
    "overflow-y-hidden": "overflow-y:hidden;",
    "pointer-events-none": "pointer-events:none;",
    "object-cover": "object-fit:cover;",
    "object-contain": "object-fit:contain;",
    "object-bottom": "object-position:bottom;",
    "text-center": "text-align:center;",
    "text-left": "text-align:left;",
    "text-white": "color:#fff;",
    "whitespace-nowrap": "white-space:nowrap;",
    "whitespace-pre-wrap": "white-space:pre-wrap;",
    "items-center": "align-items:center;",
    "items-start": "align-items:flex-start;",
    "items-end": "align-items:flex-end;",
    "justify-center": "justify-content:center;",
    "justify-between": "justify-content:space-between;",
    "flex-none": "flex:none;",
    "flex-col": "flex-direction:column;",
    "shrink-0": "flex-shrink:0;",
    "not-italic": "font-style:normal;",
    "italic": "font-style:italic;",
    "font-normal": "font-weight:400;",
    "font-semibold": "font-weight:600;",
    "font-bold": "font-weight:700;",
    "list-disc": "list-style-type:disc;",
    "border-solid": "border-style:solid;",
    "max-w-none": "max-width:none;",
    "border": "border-width:1px;",
    "-translate-x-1/2": "transform:translateX(-50%);",
    "-scale-y-100": "transform:scaleY(-1);",
    "scale-y-100": "transform:scaleY(1);",
    "rotate-180": "transform:rotate(180deg);",
}


def tw_to_style(class_str: str) -> str:
    styles: list[str] = []
    transforms: list[str] = []
    for tok in split_classes(class_str):
        if tok in SIMPLE:
            val = SIMPLE[tok]
            if val.startswith("transform:"):
                transforms.append(val[len("transform:") : -1])
            else:
                styles.append(val)
            continue
        if tok.startswith("font-['") and "']" in tok:
            inner = tok[len("font-['") : tok.index("']")]
            family = inner.split(":")[0].replace("_", " ")
            if "Single" in family or "Day" in family:
                styles.append("font-family:'Single Day', cursive;")
            else:
                styles.append(f"font-family:'{family}', Georgia, serif;")
            # Weight from the face name only when font-bold/semibold tokens are absent
            if "Black" in inner or re.search(r"(?<![a-zA-Z])Bold", inner):
                styles.append("font-weight:700;")
            elif "SemiBold" in inner or "Medium" in inner:
                styles.append("font-weight:600;")
            continue
        if tok.startswith("[word-break:"):
            styles.append("word-break:break-word;")
            continue
        if (v := bracket(tok, "bg")) is not None:
            styles.append(f"background:{v};")
            continue
        if (v := bracket(tok, "text")) is not None:
            if v.startswith("#") or v.startswith("rgb"):
                styles.append(f"color:{v};")
            elif v.endswith("px") or v.endswith("rem"):
                styles.append(f"font-size:{v};")
            continue
        if (v := bracket(tok, "border")) is not None:
            if v.startswith("#") or v.startswith("rgb"):
                styles.append(f"border-color:{v};")
            else:
                styles.append(f"border-width:{v};")
            continue
        m = re.match(r"border-(\d+)$", tok)
        if m:
            styles.append(f"border-width:{m.group(1)}px;")
            continue
        if (v := bracket(tok, "size")) is not None:
            styles.append(f"width:{v};height:{v};")
            continue
        m = re.match(r"size-(\d+)$", tok)
        if m:
            styles.append(f"width:{m.group(1)}px;height:{m.group(1)}px;")
            continue
        if (v := bracket(tok, "leading")) is not None:
            styles.append(f"line-height:{v};")
            continue
        if tok == "leading-[normal]" or tok == "leading-normal":
            styles.append("line-height:normal;")
            continue
        if tok == "leading-[0]":
            styles.append("line-height:0;")
            continue
        if (v := bracket(tok, "rotate")) is not None:
            transforms.append(f"rotate({v})")
            continue
        m = re.match(r"-?rotate-(\d+)$", tok)
        if m:
            sign = "-" if tok.startswith("-") else ""
            transforms.append(f"rotate({sign}{m.group(1)}deg)")
            continue
        # Figma drop flourishes: scale-y-99 / -scale-y-99 / skew-x-[6.35deg]
        m = re.match(r"(-?)scale-y-(\d+)$", tok)
        if m:
            sign = "-" if m.group(1) else ""
            transforms.append(f"scaleY({sign}{float(m.group(2)) / 100})")
            continue
        if (v := bracket(tok, "skew-x")) is not None:
            transforms.append(f"skewX({v})")
            continue
        if (v := bracket(tok, "skew-y")) is not None:
            transforms.append(f"skewY({v})")
            continue
        # CSS masks (Looking for More carousel image windows)
        if tok == "mask-no-repeat":
            styles.append("mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;")
            continue
        if tok == "mask-alpha":
            styles.append("mask-mode:alpha;-webkit-mask-source-type:alpha;")
            continue
        if tok in ("mask-intersect", "mask-no-clip"):
            continue
        if (v := bracket(tok, "mask-size")) is not None:
            val = v.replace("_", " ")
            styles.append(f"mask-size:{val};-webkit-mask-size:{val};")
            continue
        if (v := bracket(tok, "mask-position")) is not None:
            val = v.replace("_", " ")
            styles.append(f"mask-position:{val};-webkit-mask-position:{val};")
            continue
        if (v := bracket(tok, "ms")) is not None:
            styles.append(f"margin-inline-start:{v};")
            continue
        # generic spacing / box props
        for prop, css in [
            ("left-", "left"),
            ("right-", "right"),
            ("top-", "top"),
            ("bottom-", "bottom"),
            ("w-", "width"),
            ("h-", "height"),
            ("min-w-", "min-width"),
            ("min-h-", "min-height"),
            ("max-w-", "max-width"),
            ("max-h-", "max-height"),
            ("gap-", "gap"),
            ("rounded-", "border-radius"),
            ("opacity-", "opacity"),
            ("z-", "z-index"),
            ("p-", "padding"),
            ("pt-", "padding-top"),
            ("pb-", "padding-bottom"),
            ("pl-", "padding-left"),
            ("pr-", "padding-right"),
            ("m-", "margin"),
            ("mt-", "margin-top"),
            ("mb-", "margin-bottom"),
            ("ml-", "margin-left"),
            ("mr-", "margin-right"),
            ("tracking-", "letter-spacing"),
            ("outline-", "outline"),
        ]:
            if not tok.startswith(prop):
                continue
            rest = tok[len(prop) :]
            if rest.startswith("[") and rest.endswith("]"):
                val = rest[1:-1]
            elif rest.replace(".", "", 1).isdigit():
                if css == "z-index":
                    val = rest
                elif css == "opacity":
                    # Tailwind opacity-24 => 0.24
                    val = rest if "." in rest else str(float(rest) / 100)
                else:
                    val = f"{rest}px"
            else:
                break
            styles.append(f"{css}:{val};")
            break
        if tok.startswith("px-[") and tok.endswith("]"):
            v = bracket(tok, "px")
            styles.append(f"padding-left:{v};padding-right:{v};")
        if tok.startswith("py-[") and tok.endswith("]"):
            v = bracket(tok, "py")
            styles.append(f"padding-top:{v};padding-bottom:{v};")
        if (v := bracket(tok, "inset")) is not None:
            # inset-[-4px_0_0_0], inset-[-1.5px_-2.88%], or inset-[0_-8.82%_-0.89%_0]
            parts = v.replace(" ", "").split("_")
            if len(parts) == 1:
                styles.append(f"inset:{parts[0]};")
            elif len(parts) == 2:
                # Tailwind 2-value inset: vertical horizontal
                styles.append(
                    f"top:{parts[0]};right:{parts[1]};bottom:{parts[0]};left:{parts[1]};"
                )
            elif len(parts) == 4:
                styles.append(f"top:{parts[0]};right:{parts[1]};bottom:{parts[2]};left:{parts[3]};")
            continue
        # Tailwind fraction utilities: right-1/4, top-1/2, left-1/3, …
        m = re.match(r"(left|right|top|bottom|w|h)-(\d+)/(\d+)$", tok)
        if m:
            prop = {
                "left": "left",
                "right": "right",
                "top": "top",
                "bottom": "bottom",
                "w": "width",
                "h": "height",
            }[m.group(1)]
            pct = (float(m.group(2)) / float(m.group(3))) * 100
            styles.append(f"{prop}:{pct:g}%;")
            continue
        # mask helpers ignored (applied via style={{}})
    if transforms:
        styles.append("transform:" + " ".join(transforms) + ";")
    return normalize_calc("".join(styles))


def normalize_calc(css: str) -> str:
    def fix(m):
        inner = m.group(1)
        inner = re.sub(r"\s*([+\-*/])\s*", r" \1 ", inner)
        inner = re.sub(r"\s+", " ", inner).strip()
        return f"calc({inner})"
    return re.sub(r"calc\(([^)]+)\)", fix, css)


def extract_jsx(text: str) -> tuple[dict[str, str], str]:
    assets = {}
    for m in re.finditer(
        r'const (img\w+)\s*=\s*"(https://www\.figma\.com/api/mcp/asset/[^"]+)"\s*;', text
    ):
        local = resolve_asset(m.group(2))
        if local:
            assets[m.group(1)] = local
    m = re.search(r"export default function \w+\([^\)]*\)\s*\{", text)
    if not m:
        raise ValueError("No component")
    start = text.find("return", m.end())
    paren = text.find("(", start)
    depth = 0
    end = None
    for j in range(paren, len(text)):
        if text[j] == "(":
            depth += 1
        elif text[j] == ")":
            depth -= 1
            if depth == 0:
                end = j
                break
    if end is None:
        raise ValueError("Unbalanced")
    return assets, text[paren + 1 : end].strip()


def merge_style(existing: str | None, added: str) -> str:
    if not existing:
        return added
    if not added:
        return existing
    e = existing.rstrip(";").strip()
    a = added.rstrip(";").strip()
    return e + ";" + a + ";"


def convert(jsx: str, assets: dict[str, str], depth: int) -> str:
    prefix = "../" * depth
    html = jsx

    def src_repl(m):
        path = assets.get(m.group(1))
        return f'src="{prefix}{path}"' if path else 'src=""'

    html = re.sub(r"src=\{(img\w+)\}", src_repl, html)

    def url_repl(m):
        path = assets.get(m.group(1))
        return f"url('{prefix}{path}')" if path else "url('')"

    html = re.sub(r'url\("\$\{(img\w+)\}"\)', url_repl, html)
    html = re.sub(r"url\(`\$\{(img\w+)\}`\)", url_repl, html)

    # style={{ ... }} objects first
    def style_obj(m):
        body = m.group(1)
        parts = []
        for sm in re.finditer(r"(\w+)\s*:\s*`([^`]*)`", body):
            prop = re.sub(r"([a-z])([A-Z])", r"\1-\2", sm.group(1)).lower()
            parts.append(f"{prop}:{sm.group(2)}")
            if prop == "mask-image":
                parts.append(f"-webkit-mask-image:{sm.group(2)}")
        for sm in re.finditer(r'(\w+)\s*:\s*"([^"]*)"', body):
            prop = re.sub(r"([a-z])([A-Z])", r"\1-\2", sm.group(1)).lower()
            parts.append(f"{prop}:{sm.group(2)}")
            if prop == "mask-image":
                parts.append(f"-webkit-mask-image:{sm.group(2)}")
        return 'style="' + ";".join(parts) + ';"'

    html = re.sub(r"style=\{\{([^\{\}]*)\}\}", style_obj, html)

    # className -> temporary data-tw; style={{}} already converted to style=
    def class_repl(m):
        style = tw_to_style(m.group(1))
        return f'class="fig" data-tw="{style.replace(chr(34), "&quot;")}"'

    html = re.sub(r'className="([^"]*)"', class_repl, html)

    def fix_tag_styles(tag_m):
        tag = tag_m.group(0)
        tw_m = re.search(r'data-tw="([^"]*)"', tag)
        if not tw_m:
            return tag
        tw = tw_m.group(1).replace("&quot;", '"')
        tag = re.sub(r'\s*data-tw="[^"]*"', "", tag)
        styles = re.findall(r'style="([^"]*)"', tag)
        tag = re.sub(r'\s*style="[^"]*"', "", tag)
        merged = ""
        seen = set()
        for s in styles + [tw]:
            for decl in s.split(";"):
                decl = decl.strip()
                if not decl:
                    continue
                key = decl.split(":", 1)[0].strip().lower()
                if key in seen:
                    continue
                seen.add(key)
                merged += decl + ";"
        if tag.endswith("/>"):
            return tag[:-2] + f' style="{merged}" />'
        if tag.endswith(">"):
            return tag[:-1] + f' style="{merged}">'
        return tag

    html = re.sub(r"<[^>]+>", fix_tag_styles, html)

    html = html.replace("aria-hidden={true}", 'aria-hidden="true"')
    def shader_repl(m: re.Match) -> str:
        block = m.group(0)
        lc_m = re.search(r"lineCount:\s*(\d+)", block)
        ml_m = re.search(r"marginLine:\s*(true|false)", block)
        line_count = lc_m.group(1) if lc_m else "11"
        margin = "1" if ml_m and ml_m.group(1) == "true" else "0"
        return (
            f'<div class="notebook-lines" data-line-count="{line_count}" '
            f'data-margin="{margin}" aria-hidden="true"></div>'
        )

    html = re.sub(
        r"<ShaderFill[^>]*/>|<ShaderFill[^>]*>.*?</ShaderFill>",
        shader_repl,
        html,
        flags=re.S,
    )
    html = re.sub(r"\{`([^`]*)`\}", r"\1", html)

    void = {"img", "br", "hr", "input", "meta", "link"}

    def expand(m):
        tag, attrs = m.group(1), m.group(2)
        if tag.lower() in void:
            return f"<{tag}{attrs}>"
        return f"<{tag}{attrs}></{tag}>"

    html = re.sub(r"<([A-Za-z][\w]*)([^>]*?)\s*/>", expand, html)
    html = re.sub(r"\{/\*.*?\*/\}", "", html, flags=re.S)
    html = html.replace("<>", "").replace("</>", "")
    html = re.sub(r"\{[^}]+\}", "", html)

    # Ensure root frame has width 1440
    html = re.sub(
        r'(data-node-id="[^"]+"[^>]*style=")([^"]*)(")',
        lambda m: m.group(1)
        + (
            m.group(2)
            if "width:" in m.group(2)
            else m.group(2) + "width:1440px;"
        )
        + m.group(3),
        html,
        count=1,
    )

    # Single Day display titles are single-line in the wireframes
    def nowrap_single_day(m):
        style = m.group(1)
        if "white-space:" in style:
            return m.group(0)
        return f'style="white-space:nowrap;{style}"'

    html = re.sub(
        r'style="([^"]*font-family:\'Single Day\'[^"]*)"',
        nowrap_single_day,
        html,
    )

    # Funnel cake strawberry underline is a separate Figma line node (391:5510)
    return html


def measure_height(html: str, minimum: int) -> int:
    bottoms = []
    for m in re.finditer(r"top:(-?[\d.]+)px", html):
        top = float(m.group(1))
        # find height nearby in same style attr
        # approximate
        bottoms.append(top)
    for m in re.finditer(r"top:(-?[\d.]+)px;[^\"]*?height:([\d.]+)px", html):
        bottoms.append(float(m.group(1)) + float(m.group(2)))
    for m in re.finditer(r"height:([\d.]+)px;[^\"]*?top:(-?[\d.]+)px", html):
        bottoms.append(float(m.group(2)) + float(m.group(1)))
    if not bottoms:
        return minimum
    return max(minimum, int(max(bottoms) + 40))


def hotspots(slug: str) -> str:
    # Shared nav (centered at ~50%, top ~202)
    if slug in ("home", "all-recipes"):
        prefix = ""
    else:
        prefix = "../"
    nav = f"""
<a class="hotspot" href="{prefix}index.html" style="left:calc(50% - 193px);top:195px;width:100px;height:50px" title="Home">Home</a>
<a class="hotspot" href="{prefix}index.html#about" data-nav="about" style="left:calc(50% - 50px);top:195px;width:100px;height:50px" title="About">About</a>
<a class="hotspot" href="{prefix}all-recipes.html" style="left:calc(50% + 100px);top:195px;width:100px;height:50px" title="Recipes">Recipes</a>
"""
    if slug == "home":
        return (
            nav
            + """
<a class="hotspot" href="all-recipes.html" style="left:315px;top:555px;width:224px;height:50px" title="View all Recipes">View all Recipes</a>
<a class="hotspot" href="recipes/brownies.html" style="left:179px;top:703px;width:150px;height:48px" title="Brownies">View Recipe</a>
<a class="hotspot" href="recipes/chocolate-chip-cookies.html" style="left:645px;top:703px;width:150px;height:48px" title="Cookies">View Recipe</a>
<a class="hotspot" href="recipes/banana-bread.html" style="left:1111px;top:703px;width:150px;height:48px" title="Banana Bread">View Recipe</a>
<!-- Also make entire special cards clickable -->
<a class="hotspot" href="recipes/brownies.html" style="left:75px;top:820px;width:350px;height:280px" title="Brownies card">Brownies</a>
<a class="hotspot" href="recipes/chocolate-chip-cookies.html" style="left:545px;top:820px;width:350px;height:280px" title="Cookies card">Cookies</a>
<a class="hotspot" href="recipes/banana-bread.html" style="left:1011px;top:820px;width:350px;height:280px" title="Banana card">Banana</a>
<button type="button" class="hotspot" data-carousel-prev aria-label="Previous" style="left:48px;top:1718px;width:56px;height:56px;border:0;background:transparent;color:transparent;text-indent:0">‹</button>
<button type="button" class="hotspot" data-carousel-next aria-label="Next" style="left:1332px;top:1718px;width:56px;height:56px;border:0;background:transparent;color:transparent;text-indent:0">›</button>
"""
        )
    if slug == "all-recipes":
        # Recipe list offset 566
        cards = [
            ("recipes/brownies.html", 56, 566 + 109),
            ("recipes/chocolate-chip-cookies.html", 522, 566 + 109),
            ("recipes/banana-bread.html", 988, 566 + 109),
            ("recipes/lemon-poppyseed-loaf.html", 63, 566 + 713),
            ("recipes/banana-crumble-muffins.html", 529, 566 + 713),
            ("recipes/funnel-cake.html", 995, 566 + 713),
            ("recipes/chocolate-chip-muffins.html", 63, 566 + 1317),
            ("recipes/strawberry-compote.html", 529, 566 + 1317),
            ("recipes/chocolate-ganache.html", 995, 566 + 1317),
        ]
        parts = [nav]
        for href, x, y in cards:
            parts.append(
                f'<a class="hotspot" href="{href}" style="left:{x}px;top:{y}px;width:380px;height:560px" title="View Recipe">View Recipe</a>'
            )
        return "\n".join(parts)
    # recipe pages
    extra = ""
    if slug == "funnel-cake":
        # strawberry compote ingredient — position refined after visual QA if needed
        # Ingredients section at page y=801; ingredient row top=808 → 1609
        extra = '<a class="hotspot" href="strawberry-compote.html" style="left:174px;top:1609px;width:229px;height:47px" title="Strawberry Compote">strawberry compote</a>'
    return (
        nav
        + f'<a class="hotspot" href="{prefix}all-recipes.html" style="left:90px;top:276px;width:251px;height:48px" title="Back to All Recipes">Back</a>\n'
        + extra
    )


FRAME_CSS = """@import url('https://fonts.googleapis.com/css2?family=Single+Day&family=Unkempt:wght@400;700&family=Vollkorn:ital,wght@0,400;0,600;0,700;1,400&display=swap');
html,body{margin:0;padding:0;background:#fcf6eb;}
body{overflow-x:hidden;}
.viewport{width:100%;display:flex;justify-content:flex-start;background:#fcf6eb;overflow-x:hidden;}
.frame-scale{width:1440px;zoom:calc(100vw / 1440px);}
.frame{position:relative;width:1440px;overflow:hidden;background:#fcf6eb;}
.frame *,.frame *::before,.frame *::after{box-sizing:border-box;}
/* Absolute Figma text uses <p>; kill UA margins so top/left match the wireframe. */
.frame p,.frame h1,.frame h2,.frame h3,.frame h4,.frame h5,.frame h6,.frame ul,.frame ol,.frame li{
  margin:0;padding:0;
}
.frame img{max-width:none;display:block;}
/* Lined paper from Figma ShaderFill: gap = height / lineCount; margin only when data-margin=1 */
.notebook-lines{
  --lc: 11;
  --line-gap: 49px;
  --line-offset: -20px; /* phase so card titles/body sit between rules */
  position:absolute;inset:0;pointer-events:none;
  background-color:transparent;
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent,
      transparent calc(var(--line-gap) - 1px),
      rgba(79,74,67,.22) var(--line-gap)
    );
  background-position: 0 var(--line-offset);
  background-size: 100% var(--line-gap);
  background-repeat: repeat;
}
.notebook-lines[data-line-count="3"]{--lc:3;}
.notebook-lines[data-line-count="4"]{--lc:4;--line-gap:43.75px;--line-offset:-8px;}
.notebook-lines[data-line-count="7"]{--lc:7;}
.notebook-lines[data-line-count="9"]{--lc:9;}
.notebook-lines[data-line-count="10"]{--lc:10;}
.notebook-lines[data-line-count="11"]{--lc:11;--line-gap:49px;--line-offset:-20px;}
.notebook-lines[data-line-count="12"]{--lc:12;}
.notebook-lines[data-line-count="14"]{--lc:14;}
.notebook-lines[data-margin="1"]{
  /* Recipe Ingredients paper: JS sets --line-gap/--line-offset so rows sit between rules */
  background-image:
    linear-gradient(to right, transparent 59px, rgba(224,159,127,.55) 59px, rgba(224,159,127,.55) 61px, transparent 61px),
    repeating-linear-gradient(
      to bottom,
      transparent,
      transparent calc(var(--line-gap) - 1px),
      rgba(79,74,67,.22) var(--line-gap)
    );
  background-size: auto, 100% var(--line-gap);
  background-position: 0 0, 0 var(--line-offset);
}
/* Looking for More native horizontal scrollbar (Figma Scroll Bar / 432:6517 strip) */
[data-name="Scroll Bar"]{
  overflow-x:auto !important;
  overflow-y:hidden !important;
  scrollbar-color:#c4b49a #f8f2e8;
  scrollbar-width:auto;
}
[data-name="Scroll Bar"]::-webkit-scrollbar{height:14px;}
[data-name="Scroll Bar"]::-webkit-scrollbar-track{
  background:#f8f2e8;
  border-radius:0;
}
[data-name="Scroll Bar"]::-webkit-scrollbar-thumb{
  background:#c4b49a;
  border:3px solid #f8f2e8;
  border-radius:8px;
}
[data-name="Scroll Bar"] .carousel-track{
  position:relative;
  height:100%;
}
a.hotspot,button.hotspot{
  position:absolute;z-index:60;display:block;cursor:pointer;
  text-indent:-9999px;overflow:hidden;border:0;background:transparent;padding:0;
}
a.hotspot:focus-visible,button.hotspot:focus-visible{
  outline:3px solid #e09f7f;outline-offset:2px;
}
"""


def shell(title: str, body: str, depth: int, height: int, active: str, spots: str) -> str:
    p = "../" * depth
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} | The Digital Recipe Book</title>
  <link rel="stylesheet" href="{p}css/figma-frame.css" />
</head>
<body data-active="{active}">
  <div class="viewport">
    <div class="frame-scale" data-frame-scale>
      <div class="frame" data-figma-frame style="height:{height}px;min-height:{height}px">
{body}
{spots}
      </div>
    </div>
  </div>
  <script src="{p}js/main.js"></script>
</body>
</html>
"""


def main():
    (ROOT / "css").mkdir(exist_ok=True)
    (ROOT / "css" / "figma-frame.css").write_text(FRAME_CSS)
    (ROOT / "recipes").mkdir(exist_ok=True)
    for page in PAGES:
        src: Path = page["src"]
        if not src.exists():
            raise SystemExit(f"Missing source {src}")
        text = src.read_text(errors="ignore")
        assets, jsx = extract_jsx(text)
        miss = [n for n, p in assets.items() if not (ROOT / p).exists()]
        print(f"{page['slug']}: assets={len(assets)} missing={len(miss)} from {src.name}")
        if miss[:5]:
            print("  e.g.", miss[:5])
        body = convert(jsx, assets, page["depth"])
        height = measure_height(body, page["min_h"])
        html = shell(
            page["title"],
            body,
            page["depth"],
            height,
            page["active"],
            hotspots(page["slug"]),
        )
        page["out"].write_text(html)
        print(f"  -> {page['out'].relative_to(ROOT)} ({height}px)")


if __name__ == "__main__":
    main()
