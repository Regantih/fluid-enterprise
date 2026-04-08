"""
Sovereign Sandbox Runner
========================
Executes capability code in an isolated subprocess with resource limits.

Interface:
    result = SandboxRunner.run(manifest, inputs) -> SandboxResult

Capability code contract:
    - Single-file module exposing `def run(inputs: dict) -> dict`
    - Imports only from: stdlib, httpx, pydantic, jsonschema
    - No network except via declared tools
    - Reversible or idempotent
"""

import json
import os
import resource
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional


# ─── Allowlisted imports ───
ALLOWED_IMPORTS = frozenset({
    # stdlib (common)
    "os", "sys", "json", "re", "math", "datetime", "collections",
    "itertools", "functools", "typing", "dataclasses", "enum",
    "hashlib", "hmac", "base64", "uuid", "copy", "io", "csv",
    "statistics", "decimal", "fractions", "operator", "string",
    "textwrap", "pathlib", "logging", "traceback", "contextlib",
    "abc", "time",
    # Approved third-party
    "httpx", "pydantic", "jsonschema",
})

# ─── Resource limits ───
MAX_CPU_SECONDS = 30
MAX_MEMORY_BYTES = 256 * 1024 * 1024  # 256 MB
MAX_WALL_CLOCK_SECONDS = 30
MAX_OUTPUT_BYTES = 1 * 1024 * 1024  # 1 MB


class SandboxError(Exception):
    """Raised when sandbox execution fails."""
    pass


@dataclass
class SandboxResult:
    """Result of a sandboxed capability execution."""
    success: bool
    output: Optional[dict] = None
    error: Optional[str] = None
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    memory_peak_bytes: int = 0
    cost_usd: float = 0.0


@dataclass
class CapabilityManifest:
    """Parsed SKILL.md frontmatter for sandbox execution."""
    id: str
    name: str
    kind: str
    code_path: str  # absolute path to capability.py
    tools: list = field(default_factory=list)
    budget_monthly_usd: float = 100.0
    budget_consumed_usd: float = 0.0


# ─── Import validator ───
def validate_imports(code: str) -> list[str]:
    """Check that code only imports from allowed modules. Returns violations."""
    import ast
    violations = []
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [f"SyntaxError: {e}"]

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                if root not in ALLOWED_IMPORTS:
                    violations.append(f"Disallowed import: {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root = node.module.split(".")[0]
                if root not in ALLOWED_IMPORTS:
                    violations.append(f"Disallowed import from: {node.module}")
    return violations


# ─── Sandbox wrapper script ───
WRAPPER_TEMPLATE = '''
import json
import sys
import resource

# Set resource limits
resource.setrlimit(resource.RLIMIT_CPU, ({max_cpu}, {max_cpu}))
resource.setrlimit(resource.RLIMIT_AS, ({max_mem}, {max_mem}))

# Load inputs
inputs = json.loads(sys.argv[1])

# Import and run the capability
sys.path.insert(0, "{code_dir}")
import capability
result = capability.run(inputs)

# Output result as JSON
print(json.dumps({{"success": True, "output": result}}))
'''


class SandboxRunner:
    """
    Executes capability code in an isolated subprocess.
    
    Usage:
        manifest = CapabilityManifest(id="cap_vendor_risk", ...)
        result = SandboxRunner.run(manifest, {"vendors": [...]})
    """

    @staticmethod
    def run(manifest: CapabilityManifest, inputs: dict) -> SandboxResult:
        """
        Execute a capability in a sandboxed subprocess.
        
        Args:
            manifest: Capability manifest with code path and constraints
            inputs: Dict of typed inputs matching the capability's input schema
            
        Returns:
            SandboxResult with output or error details
        """
        start = time.monotonic()

        # ─── Step 1: Validate the code ───
        code_path = Path(manifest.code_path)
        if not code_path.exists():
            return SandboxResult(
                success=False,
                error=f"Capability code not found: {code_path}",
                duration_ms=0,
            )

        code = code_path.read_text()
        violations = validate_imports(code)
        if violations:
            return SandboxResult(
                success=False,
                error=f"Import policy violations: {'; '.join(violations)}",
                duration_ms=0,
            )

        # ─── Step 2: Check budget ───
        estimated_cost = 0.001  # $0.001 per execution (stub)
        if manifest.budget_consumed_usd + estimated_cost > manifest.budget_monthly_usd:
            return SandboxResult(
                success=False,
                error=f"Budget exceeded: ${manifest.budget_consumed_usd:.2f} / ${manifest.budget_monthly_usd:.2f}",
                duration_ms=0,
            )

        # ─── Step 3: Prepare wrapper script ───
        wrapper_code = WRAPPER_TEMPLATE.format(
            max_cpu=MAX_CPU_SECONDS,
            max_mem=MAX_MEMORY_BYTES,
            code_dir=str(code_path.parent),
        )

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False, prefix="sandbox_"
        ) as f:
            f.write(wrapper_code)
            wrapper_path = f.name

        # ─── Step 4: Execute in subprocess ───
        try:
            inputs_json = json.dumps(inputs)
            proc = subprocess.run(
                [sys.executable, wrapper_path, inputs_json],
                capture_output=True,
                text=True,
                timeout=MAX_WALL_CLOCK_SECONDS,
                env={
                    "PATH": os.environ.get("PATH", ""),
                    "PYTHONPATH": "",
                    "HOME": tempfile.gettempdir(),
                },
            )

            duration_ms = int((time.monotonic() - start) * 1000)

            if proc.returncode != 0:
                return SandboxResult(
                    success=False,
                    error=proc.stderr[:2000] if proc.stderr else f"Exit code: {proc.returncode}",
                    stdout=proc.stdout[:MAX_OUTPUT_BYTES],
                    stderr=proc.stderr[:MAX_OUTPUT_BYTES],
                    duration_ms=duration_ms,
                )

            # Parse output
            try:
                result_data = json.loads(proc.stdout)
                return SandboxResult(
                    success=True,
                    output=result_data.get("output"),
                    stdout=proc.stdout[:MAX_OUTPUT_BYTES],
                    stderr=proc.stderr[:MAX_OUTPUT_BYTES],
                    duration_ms=duration_ms,
                    cost_usd=estimated_cost,
                )
            except json.JSONDecodeError:
                return SandboxResult(
                    success=False,
                    error=f"Invalid JSON output from capability",
                    stdout=proc.stdout[:1000],
                    stderr=proc.stderr[:1000],
                    duration_ms=duration_ms,
                )

        except subprocess.TimeoutExpired:
            duration_ms = int((time.monotonic() - start) * 1000)
            return SandboxResult(
                success=False,
                error=f"Execution timeout ({MAX_WALL_CLOCK_SECONDS}s)",
                duration_ms=duration_ms,
            )
        except Exception as e:
            duration_ms = int((time.monotonic() - start) * 1000)
            return SandboxResult(
                success=False,
                error=f"Sandbox error: {str(e)}",
                duration_ms=duration_ms,
            )
        finally:
            # Clean up wrapper
            try:
                os.unlink(wrapper_path)
            except OSError:
                pass

    @staticmethod
    def run_eval(manifest: CapabilityManifest, eval_path: str) -> list[dict]:
        """
        Run the full eval suite for a capability.
        
        Args:
            manifest: Capability manifest
            eval_path: Path to JSONL eval file
            
        Returns:
            List of eval results with pass/fail per case
        """
        results = []
        eval_file = Path(eval_path)
        if not eval_file.exists():
            return [{"error": f"Eval file not found: {eval_path}"}]

        for i, line in enumerate(eval_file.read_text().strip().split("\n")):
            if not line.strip():
                continue
            case = json.loads(line)
            result = SandboxRunner.run(manifest, case["input"])

            passed = False
            if result.success and result.output:
                # Simple equality check — rubric evaluation would use Claude
                expected = case.get("expected", {})
                if expected:
                    passed = all(
                        result.output.get(k) == v
                        for k, v in expected.items()
                        if k in result.output
                    )
                else:
                    passed = result.success

            results.append({
                "case": i,
                "input": case["input"],
                "expected": case.get("expected"),
                "actual": result.output,
                "passed": passed,
                "rubric": case.get("rubric", ""),
                "duration_ms": result.duration_ms,
                "error": result.error,
            })

        return results
