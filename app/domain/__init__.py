"""Pure domain layer.

Nothing in this package performs I/O. No database, no HTTP, no subprocess, no
filesystem, and no implicit clock — the current time is always passed in. Every
module here is a set of functions over frozen dataclasses, which is why the unit
suite covers it exhaustively in milliseconds.

The rule is enforced by the `import-linter` contracts in `pyproject.toml`, so a
violation fails CI rather than relying on reviewer discipline.
"""
