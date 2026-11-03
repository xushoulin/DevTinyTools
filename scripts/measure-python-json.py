#!/usr/bin/env python3
"""Reproduce the JSONDecodeError table on /guides/json-decode-error.

Every message quoted on that page came out of this script. Run it with the
interpreter you care about:

    python3 scripts/measure-python-json.py

The version column on the page came from running the same script under CPython
3.9.6, 3.10.8, 3.12.14 and 3.13.12 side by side; exactly one row moved.
"""

import json
import sys

CASES = [
    ("single quotes around a key", "{'a': 1}"),
    ("trailing comma", '{"a": 1,}'),
    ("unquoted key", "{a: 1}"),
    ("True / None literals", '{"a": True, "b": None}'),
    ("NaN literal", '{"a": NaN}'),
    ("comment after the document", '{"a": 1} // note'),
    ("empty body", ""),
    ("two documents", '{"a":1}{"b":2}'),
    ("BOM kept in the string", '\ufeff{"a":1}'),
    ("literal newline in a string", '{"a": "line\nbreak"}'),
    ("leading zero", '{"a": 01}'),
    ("whole document quoted", "'{\"a\":1}'"),
    ("html page", "<!DOCTYPE html><html></html>"),
    ("json inside an assignment", 'const cfg = {"a":1};'),
]

BYTES_CASES = [
    ("bom, read as bytes", b'\xef\xbb\xbf{"a": 1}'),
    ("bom, read as text", b'\xef\xbb\xbf{"a": 1}'.decode("utf-8")),
    ("utf-16, read as bytes", '{"a":1}'.encode("utf-16")),
    ("latin-1, read as bytes", b'{"name": "caf\xe9"}'),
]


def main() -> int:
    print(f"CPython {sys.version.split()[0]}\n")

    width = max(len(label) for label, _ in CASES)
    for label, document in CASES:
        try:
            value = json.loads(document)
        except json.JSONDecodeError as error:
            print(f"{label:<{width}}  {error.msg}: line {error.lineno} "
                  f"column {error.colno} (char {error.pos})")
        except Exception as error:  # noqa: BLE001 - reported verbatim on purpose
            print(f"{label:<{width}}  {type(error).__name__}: {error}")
        else:
            print(f"{label:<{width}}  accepted -> {value!r}")

    print("\nbytes or text")
    for label, payload in BYTES_CASES:
        try:
            value = json.loads(payload)
        except Exception as error:  # noqa: BLE001
            print(f"  {label:<24} {type(error).__name__}: {error}")
        else:
            print(f"  {label:<24} accepted -> {value!r}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
