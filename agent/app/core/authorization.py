"""Authorization guardrail.

Every analysis request must carry an explicit attestation that the requester
is authorized to assess the target. This keeps the agent firmly in the
defensive / authorized-testing lane.
"""

from __future__ import annotations

import logging

from fastapi import HTTPException, status

from .schemas import Authorization

logger = logging.getLogger("sentinel.authz")


def require_authorization(auth: Authorization) -> None:
    """Raise 403 unless the caller has attested authorization.

    Also emits an audit-log line so engagements are traceable.
    """
    if not auth.authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Otorisasi wajib. Set authorization.authorized=true dan isi "
                "owner_attestation + engagement_id. Agent ini hanya untuk aset "
                "yang Anda miliki atau diberi izin tertulis untuk diuji."
            ),
        )
    logger.info(
        "authorized analysis | engagement=%s | scope=%s",
        auth.engagement_id,
        auth.owner_attestation,
    )
