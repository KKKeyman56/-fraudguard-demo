"""LLM provider protocol."""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    name: str

    async def complete(self, system: str, user: str, max_tokens: int = 4096) -> str:
        """Return the model's text completion for the given system+user prompt."""
        ...
