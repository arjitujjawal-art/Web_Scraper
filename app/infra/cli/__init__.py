"""Bright Data CLI adapter.

`protocol` defines the seam, `bdata` implements it against the real binary,
`fake` replays recorded output, and `parsers` handles the two distinct JSON
shapes the CLI emits.
"""

from app.infra.cli.protocol import (
    CliError,
    CliFailure,
    CliJobStatus,
    CliNotAvailable,
    CliOutputError,
    CliTimeout,
    JobOutcome,
    RunOutcome,
    ScraperCli,
)

__all__ = [
    "CliError",
    "CliFailure",
    "CliJobStatus",
    "CliNotAvailable",
    "CliOutputError",
    "CliTimeout",
    "JobOutcome",
    "RunOutcome",
    "ScraperCli",
]
