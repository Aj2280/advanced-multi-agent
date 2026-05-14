class WorkbenchError(ValueError):
    """User or agent input violated workbench safety or size limits."""


class PathEscapeError(WorkbenchError):
    """Resolved path would leave the session workspace root."""


class CommandNotAllowedError(WorkbenchError):
    """Command is not on the allowlist for this workbench."""


class LimitExceededError(WorkbenchError):
    """File count or byte budget exceeded."""
