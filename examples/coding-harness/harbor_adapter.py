"""Harbor 0.23 external adapter for the host-side ALGAL coding pilot.

Only the explicitly configured Bun controller executes on the host. Model-produced
terminal commands always go through BaseEnvironment.exec. No verifier or solution
files are provided to the controller. Importing the transport helpers needs only
the Python standard library; running AlgalHarborAgent requires pinned Harbor.

Configuration: ALGAL_HARNESS_BUN, ALGAL_HARNESS_CLI (absolute file paths),
ALGAL_HARNESS_CONFIG_JSON (object), and optional ALGAL_HARNESS_MODE,
ALGAL_HARNESS_POLICY (JSON object), ALGAL_HARNESS_MODEL (must match xcb.model).
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import inspect
import json
import math
import os
from pathlib import Path
import shlex
from typing import Any, Callable, Mapping

try:
    from harbor.agents.base import BaseAgent
    from harbor.environments.base import BaseEnvironment
    from harbor.models.agent.context import AgentContext
except ModuleNotFoundError as exc:
    if exc.name != "harbor":
        raise
    BaseAgent = object  # type: ignore[misc,assignment]
    BaseEnvironment = Any  # type: ignore[misc,assignment]
    AgentContext = Any  # type: ignore[misc,assignment]
    HARBOR_AVAILABLE = False
else:
    HARBOR_AVAILABLE = True

MAX_FRAME_BYTES = 1_048_576
MAX_OUTPUT_BYTES = 65_536
MAX_COMMAND_BYTES = 65_536
MAX_TIMEOUT_MS = 300_000
MAX_TERMINAL_REQUESTS = 256
MAX_STDERR_BYTES = 65_536
MAX_TRACE_BYTES = 4_194_304
SANDBOX_TERM_GRACE_SEC = 2.0
SANDBOX_OUTER_SLACK_SEC = 8
HOST_CONFIG_ENV_KEYS = (
    "ALGAL_HARNESS_CONFIG_JSON", "ALGAL_HARNESS_BUN", "ALGAL_HARNESS_CLI",
    "ALGAL_HARNESS_MODE", "ALGAL_HARNESS_POLICY", "ALGAL_HARNESS_MODEL",
    "ALGAL_HARNESS_ACCOUNT", "ALGAL_HARNESS_XCB_EXECUTABLE",
)


class AdapterProtocolError(RuntimeError):
    """A bounded diagnostic; never embeds a raw controller frame."""


def _unique_fields(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON field")
        result[key] = value
    return result


def encode_frame(value: Mapping[str, Any]) -> bytes:
    try:
        encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8") + b"\n"
    except (TypeError, ValueError, RecursionError) as exc:
        raise AdapterProtocolError("Frame is not valid JSON data") from exc
    if len(encoded) > MAX_FRAME_BYTES:
        raise AdapterProtocolError("JSONL frame exceeds the byte limit")
    return encoded


def decode_frame(line: bytes) -> dict[str, Any]:
    if not line or not line.endswith(b"\n") or len(line) > MAX_FRAME_BYTES:
        raise AdapterProtocolError("Expected one bounded newline-terminated JSON frame")
    try:
        value = json.loads(line.decode("utf-8"), object_pairs_hook=_unique_fields,
                           parse_constant=lambda _: (_ for _ in ()).throw(ValueError("non-finite JSON")))
    except (UnicodeError, ValueError, RecursionError) as exc:
        raise AdapterProtocolError("Controller emitted invalid UTF-8 JSON") from exc
    if not isinstance(value, dict):
        raise AdapterProtocolError("Controller frame must be an object")
    return value


def terminal_request(frame: Mapping[str, Any], seen: set[int]) -> tuple[int, dict[str, Any]]:
    if set(frame) != {"type", "id", "request"} or frame.get("type") != "terminal":
        raise AdapterProtocolError("Unexpected terminal frame fields")
    ident = frame["id"]
    if type(ident) is not int or ident < 0 or ident > 2**53 - 1 or ident in seen:
        raise AdapterProtocolError("Terminal id must be a fresh nonnegative safe integer")
    if len(seen) >= MAX_TERMINAL_REQUESTS:
        raise AdapterProtocolError("Terminal request limit exceeded")
    request = frame["request"]
    if not isinstance(request, dict) or set(request) != {"command", "maxOutputBytes", "timeoutMs"}:
        raise AdapterProtocolError("Unexpected terminal request fields")
    command = request["command"]
    if not isinstance(command, str) or not command or "\x00" in command or len(command.encode("utf-8")) > MAX_COMMAND_BYTES:
        raise AdapterProtocolError("Terminal command must be a bounded nonempty string")
    for key, ceiling in (("maxOutputBytes", MAX_OUTPUT_BYTES), ("timeoutMs", MAX_TIMEOUT_MS)):
        if type(request[key]) is not int or not 1 <= request[key] <= ceiling:
            raise AdapterProtocolError("Terminal request has invalid " + key)
    seen.add(ident)  # Never replay an id, including after an uncertain failure.
    return ident, request


def bounded_terminal_result(stdout: str | None, stderr: str | None, exit_code: int, max_bytes: int) -> dict[str, Any]:
    """Bound stdout plus stderr in UTF-8 bytes; partial characters are discarded."""
    if type(max_bytes) is not int or not 1 <= max_bytes <= MAX_OUTPUT_BYTES:
        raise AdapterProtocolError("Invalid terminal output limit")
    if type(exit_code) is not int:
        raise AdapterProtocolError("Environment returned a noninteger exit code")
    if any(value is not None and not isinstance(value, str) for value in (stdout, stderr)):
        raise AdapterProtocolError("Environment returned nontext terminal output")
    out = (stdout or "").encode("utf-8", errors="replace")
    err = (stderr or "").encode("utf-8", errors="replace")
    if len(out) + len(err) <= max_bytes:
        return {"stdout": out.decode("utf-8"), "stderr": err.decode("utf-8"), "exitCode": exit_code}
    marker = b"\n[output truncated]\n" if max_bytes >= 20 else b"~"
    content_budget = max_bytes - len(marker)
    # A noisy stdout must not entirely hide a useful stderr diagnostic.
    stderr_budget = min(len(err), content_budget // 2) if out else content_budget
    stdout_budget = content_budget - stderr_budget
    bounded_out = out[:stdout_budget].decode("utf-8", errors="ignore")
    remaining = content_budget - len(bounded_out.encode("utf-8"))
    bounded_err = err[:remaining].decode("utf-8", errors="ignore")
    if out:
        bounded_out += marker.decode("ascii")
    else:
        bounded_err += marker.decode("ascii")
    return {"stdout": bounded_out, "stderr": bounded_err, "exitCode": exit_code}


# This code executes in the task sandbox, never on the controller host. It keeps
# at most maxOutputBytes per stream and drains all remaining bytes. In particular,
# it never uses `head` or closes a pipe early, which would inject SIGPIPE into the
# task command and could falsely report a successful/failed build.
_SANDBOX_CAPTURE_SOURCE = r'''
import base64
import json
import os
import selectors
import signal
import subprocess
import sys
import time

def capture_command(request):
    limit = request["maxOutputBytes"]
    requested_signal = [None]
    def receive_signal(signum, frame):
        requested_signal[0] = signum
    signal.signal(signal.SIGTERM, receive_signal)
    signal.signal(signal.SIGINT, receive_signal)
    process = None
    selector = selectors.DefaultSelector()
    buffers = {"stdout": bytearray(), "stderr": bytearray()}
    raw_bytes = 0
    timed_out = False
    stopping_at = None
    killed = False
    def signal_group(signum):
        if process is not None:
            try:
                os.killpg(process.pid, signum)
            except ProcessLookupError:
                pass
    try:
        process = subprocess.Popen(
            ["bash", "-lc", request["command"]], stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True,
        )
        for name, stream in (("stdout", process.stdout), ("stderr", process.stderr)):
            os.set_blocking(stream.fileno(), False)
            selector.register(stream, selectors.EVENT_READ, name)
        deadline = time.monotonic() + request["timeoutMs"] / 1000.0
        while selector.get_map() or process.poll() is None:
            now = time.monotonic()
            if stopping_at is None and (requested_signal[0] is not None or now >= deadline):
                timed_out = requested_signal[0] is None
                stopping_at = now
                signal_group(signal.SIGTERM)
            if stopping_at is not None and not killed and now - stopping_at >= TERM_GRACE_SEC:
                signal_group(signal.SIGKILL)
                killed = True
            for key, events in selector.select(0.025):
                try:
                    chunk = os.read(key.fileobj.fileno(), 8192)
                except (BlockingIOError, InterruptedError):
                    continue
                if not chunk:
                    selector.unregister(key.fileobj)
                    key.fileobj.close()
                    continue
                raw_bytes = min(limit + 1, raw_bytes + len(chunk))
                buffer = buffers[key.data]
                if len(buffer) < limit:
                    buffer.extend(chunk[:limit - len(buffer)])
        return_code = process.wait()
        # Match shell-style signal exit status; ordinary exit codes are unchanged.
        if return_code < 0:
            return_code = 128 - return_code
        out = bytes(buffers["stdout"]).decode("utf-8", errors="replace")
        err = bytes(buffers["stderr"]).decode("utf-8", errors="replace")
        decoded_bytes = len(out.encode("utf-8")) + len(err.encode("utf-8"))
        truncated = raw_bytes > limit or decoded_bytes > limit
        if truncated and decoded_bytes <= limit:
            # Retaining exactly the cap can hide that more bytes were drained.
            # Add one byte solely to activate the shared bounded marker logic.
            if out:
                out += " " * (limit - decoded_bytes + 1)
            else:
                err += " " * (limit - decoded_bytes + 1)
        result = bounded_terminal_result(out, err, return_code, limit)
        return {"version": 1, "result": result, "truncated": truncated,
                "timedOut": timed_out, "interrupted": requested_signal[0]}
    finally:
        if process is not None:
            if process.poll() is None or stopping_at is not None:
                signal_group(signal.SIGKILL)
            process.wait()
            for stream in (process.stdout, process.stderr):
                if stream is not None:
                    stream.close()
        selector.close()

try:
    request = json.loads(base64.b64decode(sys.argv[1]).decode("utf-8"))
    envelope = capture_command(request)
    print(json.dumps(envelope, ensure_ascii=True, separators=(",", ":")), flush=True)
except BaseException as exc:
    print(json.dumps({"version": 1, "error": "Sandbox wrapper failed: " + type(exc).__name__[:80]}), flush=True)
    sys.exit(70)
'''


def sandbox_terminal_command(request: Mapping[str, Any]) -> str:
    """Encode trusted wrapper code and untrusted command data separately."""
    terminal_request({"type": "terminal", "id": 0, "request": dict(request)}, set())
    payload = base64.b64encode(encode_frame(request)).decode("ascii")
    source = (
        "from __future__ import annotations\nfrom typing import Any\n"
        "MAX_OUTPUT_BYTES = " + str(MAX_OUTPUT_BYTES) + "\n"
        "TERM_GRACE_SEC = " + repr(SANDBOX_TERM_GRACE_SEC) + "\n"
        "class AdapterProtocolError(RuntimeError): pass\n"
        + inspect.getsource(bounded_terminal_result) + _SANDBOX_CAPTURE_SOURCE
    )
    # Task Python startup hooks must not run before the bounded capture begins.
    # This wrapper needs only the stdlib; the task command keeps its normal env.
    return "exec python3 -I -S -c " + shlex.quote(source) + " " + shlex.quote(payload)


async def execute_terminal(
    environment: Any, ident: int, request: Mapping[str, Any],
    *, on_cancel: Callable[[], None] | None = None,
) -> dict[str, Any]:
    # Only this bounded JSON envelope reaches Harbor's otherwise unbounded exec
    # buffer. The sandbox wrapper owns the command deadline and group cleanup;
    # Harbor's deadline provides extra time for TERM/KILL, draining and reaping.
    pending = asyncio.create_task(environment.exec(
        command=sandbox_terminal_command(request),
        timeout_sec=math.ceil(request["timeoutMs"] / 1000) + SANDBOX_OUTER_SLACK_SEC,
        # Harbor automatically overlays agent.env onto every sandbox exec. These
        # settings are host routing/configuration and must not enter task prompts.
        env={key: "" for key in HOST_CONFIG_ENV_KEYS},
    ))
    try:
        response = await asyncio.shield(pending)
    except asyncio.CancelledError:
        if on_cancel:
            on_cancel()
        # Do not cancel the provider call and lose custody of the command. The
        # existing wrapper reaches its own deadline; join it before closing the
        # controller input and letting Harbor tear down the environment.
        while not pending.done():
            try:
                await asyncio.shield(pending)
            except asyncio.CancelledError:
                pass
            except Exception:
                break
        if pending.done() and not pending.cancelled():
            pending.exception()  # Retrieve a provider failure without hiding cancellation.
        raise
    if response.return_code != 0 or response.stderr:
        raise AdapterProtocolError("Sandbox output wrapper did not complete cleanly")
    if not isinstance(response.stdout, str):
        raise AdapterProtocolError("Sandbox output wrapper returned no JSON envelope")
    envelope = decode_frame(response.stdout.encode("utf-8"))
    if set(envelope) != {"version", "result", "truncated", "timedOut", "interrupted"} or envelope["version"] != 1:
        raise AdapterProtocolError("Sandbox output wrapper returned an invalid envelope")
    result = envelope["result"]
    if not isinstance(result, dict) or set(result) != {"stdout", "stderr", "exitCode"}:
        raise AdapterProtocolError("Sandbox output wrapper returned invalid terminal data")
    if type(envelope["truncated"]) is not bool or type(envelope["timedOut"]) is not bool:
        raise AdapterProtocolError("Sandbox output wrapper returned invalid status data")
    if envelope["interrupted"] is not None and (type(envelope["interrupted"]) is not int or envelope["interrupted"] not in (2, 15)):
        raise AdapterProtocolError("Sandbox output wrapper returned invalid signal data")
    bounded = bounded_terminal_result(result["stdout"], result["stderr"], result["exitCode"], request["maxOutputBytes"])
    if bounded != result:
        raise AdapterProtocolError("Sandbox output wrapper exceeded the requested byte limit")
    return {"type": "terminal-result", "id": ident, "result": result,
            "truncated": envelope["truncated"], "timedOut": envelope["timedOut"],
            "interrupted": envelope["interrupted"]}


def controller_config(instruction: str, values: Mapping[str, str], model_name: str | None) -> dict[str, Any]:
    try:
        config = json.loads(values.get("ALGAL_HARNESS_CONFIG_JSON", "{}"))
    except ValueError as exc:
        raise AdapterProtocolError("ALGAL_HARNESS_CONFIG_JSON must contain JSON") from exc
    if not isinstance(config, dict):
        raise AdapterProtocolError("ALGAL_HARNESS_CONFIG_JSON must be an object")
    allowed = {"instruction", "mode", "policy", "xcb", "maxModelAttempts", "maxTerminalOutputBytes", "terminalTimeoutMs", "modelTimeoutMs"}
    if set(config) - allowed:
        raise AdapterProtocolError("Unknown controller configuration fields")
    if "ALGAL_HARNESS_MODE" in values:
        config["mode"] = values["ALGAL_HARNESS_MODE"]
    if "ALGAL_HARNESS_POLICY" in values:
        try:
            config["policy"] = json.loads(values["ALGAL_HARNESS_POLICY"])
        except ValueError as exc:
            raise AdapterProtocolError("ALGAL_HARNESS_POLICY must contain JSON") from exc
        if not isinstance(config["policy"], dict):
            raise AdapterProtocolError("ALGAL_HARNESS_POLICY must be an object")
    xcb = config.get("xcb")
    if not isinstance(xcb, dict) or not isinstance(xcb.get("model"), str) or not xcb["model"]:
        raise AdapterProtocolError("Host configuration requires xcb.model")
    for selected in (values.get("ALGAL_HARNESS_MODEL"), model_name):
        if selected is not None and selected != xcb["model"]:
            raise AdapterProtocolError("Selected model must exactly match xcb.model")
    config["instruction"] = instruction  # Configuration cannot substitute a task.
    encode_frame(config)
    return config


def host_evidence_dir(agent_logs_dir: Path, environment: Any) -> Path:
    """Use a trusted, unmounted sibling of Harbor's task-writable agent logs.

    Harbor 0.23 mounts trial/agent, trial/verifier, and the published artifact
    subdirectory, not the trial root. Never resolve *through* trial/agent: task
    code can create symlinks beneath that mount which host file writes follow.
    Reject an explicitly added parent mount rather than assuming isolation.
    """
    trial_dir = agent_logs_dir.absolute().parent.resolve(strict=True)
    private = trial_dir / "algal-host"
    if private.is_symlink():
        raise AdapterProtocolError("Host evidence directory must not be a symlink")
    for mount in getattr(environment, "_mounts", ()):
        source = getattr(mount, "source", None)
        if source and Path(source).is_absolute():
            mounted = Path(source).resolve()
            if private == mounted or mounted in private.parents:
                raise AdapterProtocolError("Host evidence directory is exposed by a sandbox mount")
    private.mkdir(mode=0o700, exist_ok=True)
    if not private.is_dir():
        raise AdapterProtocolError("Host evidence path is not a directory")
    return private


async def settle_child(process: asyncio.subprocess.Process) -> None:
    if process.returncode is not None:
        await process.wait()
        return
    try:
        process.terminate()
    except ProcessLookupError:
        pass
    # A cancelled controller may be awaiting the reply to its last terminal
    # request. SIGTERM does not resolve stdin.next(); close the input after the
    # shielded sandbox operation has settled, before joining the controller.
    if process.stdin is not None:
        process.stdin.close()
    # The host controller joins its XCB custody operation before exiting. Never
    # SIGKILL it or abandon that settlement because a grace timer elapsed.
    await process.wait()


async def run_controller(
    argv: list[str], config: Mapping[str, Any], environment: Any, logs_dir: Path,
    *, child_env: Mapping[str, str] | None = None, finish_grace_sec: float = 30.0,
    on_progress: Callable[[dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    """Pump the controller protocol; no model-produced text enters host exec."""
    if len(argv) != 2 or any(not Path(part).is_absolute() or not Path(part).is_file() for part in argv):
        raise AdapterProtocolError("Controller executable and CLI must be absolute existing files")
    initial_frame = encode_frame(config)
    logs_dir.mkdir(parents=True, exist_ok=True)
    trace_path = logs_dir / "algal-harness.jsonl"
    receipt: dict[str, Any] = {
        "schema": "algal.coding-harness.harbor.v1", "status": "running",
        "initialConfigSha256": hashlib.sha256(initial_frame).hexdigest(),
        "terminalRequests": 0, "terminalReplies": 0, "controllerExitCode": None,
        "traceTruncated": False, "stderrBytes": 0, "stderrTruncated": False,
    }
    process: asyncio.subprocess.Process | None = None
    stderr_task: asyncio.Task | None = None
    stderr_tail = bytearray()
    trace_bytes = 0

    def persist() -> None:
        (logs_dir / "algal-harness-receipt.json").write_text(json.dumps(receipt, indent=2, allow_nan=False) + "\n", encoding="utf-8")
        if on_progress:
            on_progress(dict(receipt))

    with trace_path.open("wb") as trace:
        def log(value: Mapping[str, Any]) -> None:
            nonlocal trace_bytes
            data = encode_frame(value)
            if trace_bytes + len(data) <= MAX_TRACE_BYTES:
                trace.write(data)
                trace.flush()
                trace_bytes += len(data)
            else:
                receipt["traceTruncated"] = True

        async def drain_stderr() -> None:
            assert process is not None and process.stderr is not None
            while True:
                chunk = await process.stderr.read(8192)
                if not chunk:
                    break
                receipt["stderrBytes"] += len(chunk)
                stderr_tail.extend(chunk)
                if len(stderr_tail) > MAX_STDERR_BYTES:
                    del stderr_tail[:-MAX_STDERR_BYTES]
                    receipt["stderrTruncated"] = True

        async def read_line() -> bytes:
            assert process is not None and process.stdout is not None
            try:
                return await process.stdout.readline()
            except ValueError as exc:
                raise AdapterProtocolError("Controller stdout exceeded the JSONL frame limit") from exc

        try:
            persist()
            launch = asyncio.create_task(asyncio.create_subprocess_exec(
                *argv, stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE, limit=MAX_FRAME_BYTES,
                cwd=str(Path(argv[1]).parent), env=dict(child_env) if child_env is not None else None,
            ))
            try:
                process = await asyncio.shield(launch)
            except asyncio.CancelledError:
                # Subprocess creation can finish after cancellation. Acquire its
                # handle before propagating so the finally block can join it.
                while not launch.done():
                    try:
                        await asyncio.shield(launch)
                    except asyncio.CancelledError:
                        pass
                process = launch.result()
                raise
            stderr_task = asyncio.create_task(drain_stderr())
            assert process.stdin is not None
            process.stdin.write(initial_frame)
            await process.stdin.drain()
            seen: set[int] = set()
            terminal_failure = False
            while True:
                line = await asyncio.wait_for(read_line(), finish_grace_sec) if terminal_failure else await read_line()
                if not line:
                    raise AdapterProtocolError("Controller exited before a result frame")
                frame = decode_frame(line)
                if frame.get("type") == "terminal":
                    if terminal_failure:
                        raise AdapterProtocolError("Controller requested another command after uncertain terminal failure")
                    ident, request = terminal_request(frame, seen)
                    receipt["terminalRequests"] += 1
                    log(frame)
                    persist()
                    try:
                        def stop_controller() -> None:
                            try:
                                process.terminate()
                            except ProcessLookupError:
                                pass
                        reply = await execute_terminal(environment, ident, request, on_cancel=stop_controller)
                    except Exception as exc:
                        terminal_failure = True
                        # Exception text may contain provider credentials or huge output.
                        reply = {"type": "terminal-error", "id": ident,
                                 "error": "Sandbox execution failed (" + type(exc).__name__[:80] + "); completion is unknown; command was not retried"}
                    process.stdin.write(encode_frame(reply))
                    await process.stdin.drain()
                    if terminal_failure:
                        receipt["terminalErrors"] = receipt.get("terminalErrors", 0) + 1
                    else:
                        receipt["terminalReplies"] += 1
                    log(reply)
                    persist()
                elif frame.get("type") == "result" and set(frame) == {"type", "result"} and isinstance(frame["result"], dict):
                    log(frame)
                    process.stdin.close()
                    async def finish() -> None:
                        if await read_line():
                            raise AdapterProtocolError("Controller emitted data after its result")
                        await process.wait()
                    await asyncio.wait_for(finish(), finish_grace_sec)
                    if process.returncode != 0:
                        raise AdapterProtocolError("Controller returned a result but exited unsuccessfully")
                    if terminal_failure:
                        raise AdapterProtocolError("Sandbox command failed; task completion is unknown")
                    receipt["status"] = "controller_completed"
                    receipt["controllerResult"] = frame["result"]
                    (logs_dir / "algal-harness-result.json").write_bytes(encode_frame(frame["result"]))
                    return frame["result"]
                else:
                    raise AdapterProtocolError("Unexpected controller frame")
        except asyncio.CancelledError:
            receipt["status"] = "cancelled"
            raise
        except BaseException as exc:
            receipt["status"] = "failed"
            receipt["errorType"] = type(exc).__name__
            # Raw command/provider output remains in bounded logs, not exceptions.
            if isinstance(exc, AdapterProtocolError):
                receipt["error"] = str(exc)
            raise
        finally:
            cancelled_during_cleanup = False
            if process is not None:
                async def discard_remaining_stdout() -> None:
                    assert process is not None and process.stdout is not None
                    while await process.stdout.read(8192):
                        pass
                async def settle_and_drain() -> None:
                    assert process is not None
                    # Discard unread output while joining: a paused StreamReader
                    # after a too-large frame must not deadlock Process.wait().
                    stdout_drain = asyncio.create_task(discard_remaining_stdout())
                    active_stderr = stderr_task or asyncio.create_task(drain_stderr())
                    await settle_child(process)
                    await asyncio.gather(stdout_drain, active_stderr)
                cleanup = asyncio.create_task(settle_and_drain())
                # Do not leave the controller running if Harbor cancels twice.
                while not cleanup.done():
                    try:
                        await asyncio.shield(cleanup)
                    except asyncio.CancelledError:
                        receipt["status"] = "cancelled"
                        cancelled_during_cleanup = True
                await cleanup
                receipt["controllerExitCode"] = process.returncode
            (logs_dir / "algal-harness-stderr.log").write_bytes(bytes(stderr_tail))
            persist()
            if cancelled_during_cleanup:
                raise asyncio.CancelledError


class AlgalHarborAgent(BaseAgent):
    """Import with `-a harbor_adapter:AlgalHarborAgent` from this directory."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        if not HARBOR_AVAILABLE:
            raise RuntimeError("AlgalHarborAgent requires harbor==0.23.0 and Python>=3.12")
        super().__init__(*args, **kwargs)

    @staticmethod
    def name() -> str:
        return "algal-coding-harness"

    def version(self) -> str:
        return "0.1.0"

    async def setup(self, environment: BaseEnvironment) -> None:
        # The controller stays on the Mac; the benchmark image stays unchanged.
        pass

    async def run(self, instruction: str, environment: BaseEnvironment, context: AgentContext) -> None:
        values = {**os.environ, **self.extra_env}
        config = controller_config(instruction, values, self.model_name)
        private_logs = host_evidence_dir(self.logs_dir, environment)
        config["artifactDir"] = str(private_logs / "algal")
        argv = [values.get("ALGAL_HARNESS_BUN", "/Users/benguo/.bun/bin/bun"), values.get("ALGAL_HARNESS_CLI", "")]
        def progress(receipt: dict[str, Any]) -> None:
            context.metadata = {**(context.metadata or {}), "algal_harness": {
                **receipt, "hostEvidenceDir": str(private_logs),
            }}
        await run_controller(argv, config, environment, private_logs, child_env=values, on_progress=progress)
