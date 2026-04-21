"""HttpRequestNode — makes outbound HTTP calls with SSRF protection.

SSRF mitigations
----------------
Scheme is restricted to http/https. The resolved hostname is DNS-resolved and
checked against blocked ranges before any connection is made:
  - Loopback:      127.0.0.0/8, ::1
  - RFC1918:       10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  - Link-local:    169.254.0.0/16  (includes AWS/GCP metadata 169.254.169.254)
  - Unspecified:   0.0.0.0, ::

Known limitation: only the first DNS result is checked; round-robin DNS or
DNS rebinding after the check could bypass this. A network-layer firewall
egress policy is the reliable enforcement point in production.
"""
from __future__ import annotations

import ipaddress
import socket
from typing import Any
from urllib.parse import urlparse

import httpx

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry

_ALLOWED_SCHEMES = {"http", "https"}
_DEFAULT_TIMEOUT = 10.0


def _check_ssrf(url: str) -> None:
    """Raise NodeExecutionError if url targets a blocked network range."""
    parsed = urlparse(url)
    scheme = (parsed.scheme or "").lower()
    if scheme not in _ALLOWED_SCHEMES:
        raise NodeExecutionError(f"HttpRequestNode: scheme '{scheme}' not allowed (use http/https)")

    host = parsed.hostname or ""
    if not host:
        raise NodeExecutionError("HttpRequestNode: could not parse hostname from URL")

    try:
        resolved_ip = socket.gethostbyname(host)
    except socket.gaierror as exc:
        raise NodeExecutionError(f"HttpRequestNode: DNS resolution failed for '{host}': {exc}") from exc

    try:
        addr = ipaddress.ip_address(resolved_ip)
    except ValueError as exc:
        raise NodeExecutionError(f"HttpRequestNode: invalid IP '{resolved_ip}'") from exc

    if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_unspecified:
        raise NodeExecutionError(
            f"HttpRequestNode: URL targets blocked network address {addr} "
            f"(private/loopback/link-local/unspecified ranges are blocked)"
        )


@NodeRegistry.register
class HttpRequestNode(BaseNode):
    definition = NodeDefinition(
        type="http_request",
        category=NodeCategory.TOOL,
        label="HTTP Request",
        description=(
            "Makes an outbound HTTP request. "
            "Blocked: localhost, RFC1918 private ranges, link-local (169.254.x.x), unspecified. "
            "Scheme must be http or https."
        ),
        icon="globe",
        inputs=[
            NodeInput(name="method", type="string", required=False, default="GET"),
            NodeInput(name="url", type="string", required=True),
            NodeInput(name="headers", type="object", required=False, default=None),
            NodeInput(name="body", type="any", required=False, default=None),
            NodeInput(name="timeout", type="number", required=False, default=_DEFAULT_TIMEOUT),
        ],
        outputs=[
            NodeOutput(name="status_code", type="number"),
            NodeOutput(name="body", type="string"),
            NodeOutput(name="headers", type="object"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        method = ctx.resolve(ctx.inputs.get("method", "GET")).upper()
        url = ctx.resolve(ctx.inputs.get("url", ""))
        headers = ctx.inputs.get("headers") or {}
        body = ctx.inputs.get("body")
        timeout = float(ctx.inputs.get("timeout") or _DEFAULT_TIMEOUT)

        if not url:
            raise NodeExecutionError("HttpRequestNode: 'url' input is required")

        _check_ssrf(url)

        if isinstance(headers, str):
            import json as _json
            try:
                headers = _json.loads(headers)
            except Exception:
                headers = {}

        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    content=body if isinstance(body, (bytes, str)) else None,
                    json=body if isinstance(body, dict) else None,
                )
            except httpx.TimeoutException as exc:
                raise NodeExecutionError(f"HttpRequestNode: request timed out: {exc}") from exc
            except httpx.RequestError as exc:
                raise NodeExecutionError(f"HttpRequestNode: request failed: {exc}") from exc

        return {
            "status_code": response.status_code,
            "body": response.text,
            "headers": dict(response.headers),
        }
