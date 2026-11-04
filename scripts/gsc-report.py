#!/usr/bin/env python3
"""Summarise a Search Console export.

Usage:  python3 scripts/gsc-report.py ~/Downloads/<export>.zip

Search Console exports a zip of per-dimension CSVs in the interface language.
Screenshots of the overview only carry four totals; the queries file is where the
decisions are, so this reads the export and answers three questions: which
queries are close enough to move, which pages carry the impressions, and whether
the average position is being dragged by newly indexed pages rather than by real
movement.

No network access and no credentials: it only reads a file the user already has.
"""

from __future__ import annotations

import csv
import io
import sys
import zipfile

POSITION_BUCKETS = [(1, 3), (4, 10), (11, 20), (21, 40), (41, 100)]


def read_dimension(archive: zipfile.ZipFile, needle: str) -> list[dict[str, str]]:
    for info in archive.infolist():
        name = info.filename
        try:  # the archive stores utf-8 names as cp437
            name = name.encode("cp437").decode("utf-8")
        except Exception:
            pass
        if needle not in name:
            continue
        raw = archive.read(info.filename).decode("utf-8-sig")
        return list(csv.DictReader(io.StringIO(raw)))
    return []


def pick(row: dict[str, str], *names: str) -> str:
    for name in names:
        if name in row:
            return row[name]
    return ""


def number(text: str) -> float:
    cleaned = text.replace(",", "").replace("%", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def table(rows: list[dict[str, str]], label_key: str) -> list[tuple[str, int, float, float]]:
    out = []
    for row in rows:
        label = pick(row, label_key)
        if not label:
            continue
        out.append(
            (
                label,
                int(number(pick(row, "点击次数", "Clicks"))),
                number(pick(row, "展示", "Impressions")),
                number(pick(row, "排名", "Position")),
            )
        )
    return out


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(2)

    with zipfile.ZipFile(sys.argv[1]) as archive:
        queries = table(read_dimension(archive, "查询"), "热门查询")
        pages = table(read_dimension(archive, "网页"), "排名靠前的网页")
        dates = table(read_dimension(archive, "图表"), "日期")
        devices = table(read_dimension(archive, "设备"), "设备")
        countries = table(read_dimension(archive, "国家"), "国家/地区")

    if not queries:
        print("no query rows in this export")
        raise SystemExit(1)

    impressions = sum(q[2] for q in queries)
    clicks = sum(q[1] for q in queries)
    weighted = sum(q[2] * q[3] for q in queries) / impressions if impressions else 0
    plain = sum(q[3] for q in queries) / len(queries)
    site_impressions = sum(d[2] for d in dates)

    print(f"queries {len(queries)}   pages {len(pages)}   impressions {impressions:.0f}   clicks {clicks}")
    print(f"position: impression-weighted {weighted:.1f}   plain mean {plain:.1f}")
    if site_impressions:
        covered = 100 * impressions / site_impressions
        print(f"query table covers {covered:.0f}% of the {site_impressions:.0f} impressions the site received")
        if covered < 60:
            print("  the rest is below Search Console's privacy threshold, so low-volume queries are invisible here")
    print()
    print("impressions by position")
    for low, high in POSITION_BUCKETS:
        selected = [q for q in queries if low <= q[3] <= high]
        share = sum(q[2] for q in selected)
        print(f"  {low:>3}-{high:<3} {len(selected):>3} queries  {share:>6.0f} impressions  {100 * share / impressions:>5.1f}%")

    print()
    print("queries worth optimising (position 11-30, at least one impression)")
    movers = sorted([q for q in queries if 11 <= q[3] <= 30], key=lambda q: -q[2])
    if not movers:
        print("  none — nothing sits close enough to page one to move by editing")
    for label, clicks_, impressions_, position in movers[:15]:
        print(f"  pos {position:5.1f}  imp {impressions_:>3.0f}  clk {clicks_:>2}  {label[:78]}")

    print()
    print("pages carrying the impressions")
    total = sum(p[2] for p in pages) or 1
    for label, _clicks, impressions_, position in sorted(pages, key=lambda p: -p[2])[:12]:
        print(f"  {impressions_:>4.0f} ({100 * impressions_ / total:>4.1f}%)  pos {position:5.1f}  {label.replace('https://www.shoulin.shop', '') or '/'}")

    if dates:
        print()
        print("daily impressions (last 10 days present)")
        for label, _c, impressions_, _p in dates[-10:]:
            print(f"  {label}  {impressions_:>4.0f}")

    for name, rows in (("device", devices), ("country", countries)):
        if not rows:
            continue
        print()
        print(f"{name} split")
        for label, _c, impressions_, position in sorted(rows, key=lambda r: -r[2]):
            print(f"  {impressions_:>4.0f} impressions  pos {position:5.1f}  {label}")


if __name__ == "__main__":
    main()
