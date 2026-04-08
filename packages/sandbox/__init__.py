"""
Sovereign Sandbox — Fluid Enterprise
=====================================
Isolated execution environment for generated capabilities.

Stub implementation using subprocess + resource.setrlimit.
Clean interface so E2B, Firecracker, or gVisor swaps in later.

Constraints enforced:
  - 30s wall clock timeout
  - CPU + memory limits via setrlimit
  - Allowlisted imports only (stdlib, httpx, pydantic, jsonschema)
  - Per-capability budget tracking
  - No network except via declared tools
"""

from .runner import SandboxRunner, SandboxResult, SandboxError

__all__ = ["SandboxRunner", "SandboxResult", "SandboxError"]
