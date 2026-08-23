"""One error shape for the whole API: `{"detail": ..., "code": ...}`.

Services raise typed exceptions and know nothing about HTTP. The mapping from
exception to status code lives here, in one table, so a frontend developer can read
a single file to learn every failure this API can produce — and so adding a service
error cannot accidentally become a 500.

FastAPI's own validation errors are rewritten into the same envelope. A client
should not need two error parsers because one failure came from pydantic and the
other from a service.
"""

import logging
from collections.abc import Mapping

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import ConfigurationError
from app.domain.validator import ValidationError
from app.infra.cli.protocol import CliError, CliFailure, CliNotAvailable, CliTimeout
from app.infra.registry import RegistryError
from app.services.errors import (
    CollectorDisabled,
    CollectorNotProvisioned,
    CopilotUnavailable,
    NothingToApprove,
    RunNotFound,
    ServiceError,
    ZoneNotFound,
)

logger = logging.getLogger(__name__)

# Most specific first is irrelevant here — this is an exact-type lookup, and every
# key is a concrete class that services actually raise.
_SERVICE_ERROR_STATUS: dict[type[ServiceError], int] = {
    RunNotFound: status.HTTP_404_NOT_FOUND,
    ZoneNotFound: status.HTTP_404_NOT_FOUND,
    # 409, not 400: the request is well-formed, the collector's state refuses it.
    CollectorNotProvisioned: status.HTTP_409_CONFLICT,
    CollectorDisabled: status.HTTP_409_CONFLICT,
    NothingToApprove: status.HTTP_409_CONFLICT,
    CopilotUnavailable: status.HTTP_503_SERVICE_UNAVAILABLE,
}

_CLI_ERROR_STATUS: dict[type[CliError], int] = {
    # The CLI is a dependency of ours, not something the client got wrong.
    CliTimeout: status.HTTP_504_GATEWAY_TIMEOUT,
    CliNotAvailable: status.HTTP_503_SERVICE_UNAVAILABLE,
    CliFailure: status.HTTP_502_BAD_GATEWAY,
}


def _envelope(
    status_code: int,
    detail: str,
    code: str,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail, "code": code},
        headers=dict(headers) if headers else None,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach every handler. Called once by the app factory."""

    @app.exception_handler(ServiceError)
    async def _service_error(_: Request, exc: ServiceError) -> JSONResponse:
        code = _SERVICE_ERROR_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
        return _envelope(code, str(exc), exc.code)

    @app.exception_handler(ValidationError)
    async def _domain_validation_error(_: Request, exc: ValidationError) -> JSONResponse:
        """A domain rule rejected the input.

        An over-long heal prompt, a malformed collector id. Same status code as a
        pydantic failure, because to a client it is the same class of problem: the
        request was not acceptable as written.
        """
        return _envelope(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc), "invalid_input")

    @app.exception_handler(RegistryError)
    async def _registry_error(_: Request, exc: RegistryError) -> JSONResponse:
        """An unknown collector key is a 404, and the message lists the valid keys.

        `RegistryError` also covers a malformed registry file, which is a server
        fault — but that variant fails at startup, before any request exists.
        """
        return _envelope(status.HTTP_404_NOT_FOUND, str(exc), "unknown_collector")

    @app.exception_handler(CliError)
    async def _cli_error(_: Request, exc: CliError) -> JSONResponse:
        """Rarely reached: services record CLI failures on the run row instead.

        Kept because the alternative is a 500 with a stack trace when a background
        boundary is missed, and because `argv` is logged as a list — never joined
        into something that looks like a shell command to paste.
        """
        logger.warning("api.cli_error", extra={"argv": list(exc.argv)})
        code = _CLI_ERROR_STATUS.get(type(exc), status.HTTP_502_BAD_GATEWAY)
        return _envelope(code, str(exc), "cli_error")

    @app.exception_handler(ConfigurationError)
    async def _configuration_error(_: Request, exc: ConfigurationError) -> JSONResponse:
        logger.error("api.misconfigured", extra={"reason": str(exc)})
        return _envelope(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc), "misconfigured")

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        """Flatten pydantic's error list into one readable sentence.

        The full list stays available in the logs; the response gives a client the
        field and the reason, which is what a 422 is for.
        """
        problems = "; ".join(
            f"{'.'.join(str(part) for part in error['loc'][1:]) or 'body'}: {error['msg']}"
            for error in exc.errors()
        )
        return _envelope(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            problems or "request validation failed",
            "validation_error",
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Put FastAPI's own aborts (auth, 404 routing) into the same envelope.

        `exc.headers` is carried through: the 401 from `require_admin_key` sets
        `WWW-Authenticate`, and dropping it here would leave a client guessing which
        credential the route wants.
        """
        return _envelope(
            exc.status_code,
            str(exc.detail),
            _http_code_name(exc.status_code),
            headers=exc.headers,
        )


def _http_code_name(status_code: int) -> str:
    """A stable string code for a bare HTTP abort."""
    return {
        status.HTTP_401_UNAUTHORIZED: "unauthorized",
        status.HTTP_403_FORBIDDEN: "forbidden",
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
        status.HTTP_503_SERVICE_UNAVAILABLE: "unavailable",
    }.get(status_code, "error")
