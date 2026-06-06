#!/usr/bin/env python3
"""Split Datastar attributes reference page into one Markdown file per heading."""
from __future__ import annotations

import argparse
import re
import urllib.request
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

DEFAULT_URL = "https://data-star.dev/reference/attributes"


def slugify(value: str) -> str:
    value = re.sub(r"<a\b[^>]*class=\"anchor\"[^>]*>.*?</a>", "", value, flags=re.S)
    value = re.sub(r"<[^>]+>", "", value)
    value = unescape(value).strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "section"


class MarkdownConverter(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.href_stack: list[str | None] = []
        self.skip_depth = 0
        self.in_pre = False
        self.in_inline_code = False
        self.in_li = False

    def text(self) -> str:
        text = "".join(self.out)
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip() + "\n"

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if self.skip_depth:
            self.skip_depth += 1
            return
        if tag in {"copy-button", "script", "style", "nav"}:
            self.skip_depth = 1
            return
        cls = attrs_dict.get("class", "") or ""
        if "copy-button-wrapper" in cls:
            self.skip_depth = 1
            return
        if tag in {"p", "div", "section"}:
            self.out.append("\n\n")
        elif tag in {"h2", "h3", "h4"}:
            level = {"h2": "##", "h3": "###", "h4": "####"}[tag]
            self.out.append(f"\n\n{level} ")
        elif tag == "br":
            self.out.append("\n")
        elif tag == "pre":
            self.in_pre = True
            self.out.append("\n\n```html\n")
        elif tag == "code" and not self.in_pre:
            self.in_inline_code = True
            self.out.append("`")
        elif tag == "a":
            self.href_stack.append(attrs_dict.get("href"))
        elif tag in {"ul", "ol"}:
            self.out.append("\n")
        elif tag == "li":
            self.in_li = True
            self.out.append("\n- ")
        elif tag == "strong":
            self.out.append("**")
        elif tag == "em":
            self.out.append("_")

    def handle_endtag(self, tag: str) -> None:
        if self.skip_depth:
            self.skip_depth -= 1
            return
        if tag == "pre":
            self.in_pre = False
            self.out.append("\n```\n")
        elif tag == "code" and self.in_inline_code:
            self.in_inline_code = False
            self.out.append("`")
        elif tag == "a":
            href = self.href_stack.pop() if self.href_stack else None
            # Keep link text only; the split files are mainly for local reference.
            _ = href
        elif tag in {"p", "div", "section", "h2", "h3", "h4", "ul", "ol"}:
            self.out.append("\n\n")
        elif tag == "li":
            self.in_li = False
            self.out.append("\n")
        elif tag == "strong":
            self.out.append("**")
        elif tag == "em":
            self.out.append("_")

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        if self.in_pre:
            # Syntax-highlighted code includes line-number spans; preserve readable text.
            self.out.append(data)
            return
        text = data if self.in_inline_code else re.sub(r"\s+", " ", data)
        self.out.append(text)


def html_to_markdown(html: str) -> str:
    html = re.sub(r"<a\b[^>]*class=\"anchor\"[^>]*>.*?</a>", "", html, flags=re.S)

    def code_block(match: re.Match[str]) -> str:
        # Keep entities escaped so HTMLParser treats sample markup as text inside <pre>.
        return f"<pre><code>{match.group(1)}</code></pre>"

    html = re.sub(
        r'<div class="code-highlight-wrapper">.*?<copy-button code="(.*?)"></copy-button>.*?</div></div>',
        code_block,
        html,
        flags=re.S,
    )
    parser = MarkdownConverter()
    parser.feed(html)
    md = parser.text()
    md = re.sub(r"```html\n\s*\n", "```html\n", md)
    md = re.sub(r"\n\s+```", "\n```", md)
    return md


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=DEFAULT_URL)
    ap.add_argument("--out-dir", default="docs/datastar-attributes")
    args = ap.parse_args()

    request = urllib.request.Request(
        args.url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; datastar-doc-splitter/1.0)"},
    )
    html = urllib.request.urlopen(request, timeout=30).read().decode("utf-8")
    article_match = re.search(r"<article>(.*?)</article>", html, flags=re.S)
    if not article_match:
        raise SystemExit("Could not find <article> content")
    article = article_match.group(1)

    heading_re = re.compile(r"<h([23])\b[^>]*\bid=\"([^\"]+)\"[^>]*>(.*?)</h\1>", re.S)
    headings = list(heading_re.finditer(article))
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    written = []
    for i, h in enumerate(headings):
        section_html = h.group(0) + article[h.end() : headings[i + 1].start() if i + 1 < len(headings) else len(article)]
        title_slug = h.group(2) or slugify(h.group(3))
        md = html_to_markdown(section_html)
        path = out_dir / f"{title_slug}.md"
        path.write_text(md, encoding="utf-8")
        written.append(path)

    print(f"Wrote {len(written)} files to {out_dir}")


if __name__ == "__main__":
    main()
