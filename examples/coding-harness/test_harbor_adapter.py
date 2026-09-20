"""Stdlib-only transport checks: python3 -m unittest discover -s examples/coding-harness -p test_harbor_adapter.py.

These use a tiny Python JSONL peer and a fake environment, not a benchmark model,
container, hidden verifier, or installed Harbor. They prove adapter transport only.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
from pathlib import Path
import shlex
import sys
import tempfile
import textwrap
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

import harbor_adapter as adapter


def wrapper_request(command):
    return json.loads(base64.b64decode(shlex.split(command)[-1]))


def fake_envelope(request, stdout="", stderr="", exit_code=0):
    limit = request["maxOutputBytes"]
    envelope = {"version": 1,
                "result": adapter.bounded_terminal_result(stdout, stderr, exit_code, limit),
                "truncated": len(stdout.encode()) + len(stderr.encode()) > limit,
                "timedOut": False, "interrupted": None}
    return SimpleNamespace(stdout=json.dumps(envelope) + "\n", stderr="", return_code=0)


class FramingTests(unittest.TestCase):
    def test_round_trip_preserves_utf8_and_newlines(self):
        value = {"text": "line\n\"quoted\" 🦀"}
        encoded = adapter.encode_frame(value)
        self.assertEqual(encoded.count(b"\n"), 1)
        self.assertEqual(adapter.decode_frame(encoded), value)

    def test_malformed_frames_are_bounded_errors(self):
        for encoded in (b"{}", b"[]\n", b"NaN\n", b"{\"a\":NaN}\n", b"{\"a\":1,\"a\":2}\n", b"\xff\n", b"x" * (adapter.MAX_FRAME_BYTES + 1) + b"\n"):
            with self.subTest(encoded=encoded[:20]), self.assertRaises(adapter.AdapterProtocolError) as exc:
                adapter.decode_frame(encoded)
            self.assertLess(len(str(exc.exception)), 120)

    def test_request_validation_rejects_replay_and_unknown_fields(self):
        frame = {"type": "terminal", "id": 7, "request": {"command": "exit 5", "maxOutputBytes": 50, "timeoutMs": 1001}}
        seen = set()
        self.assertEqual(adapter.terminal_request(frame, seen)[0], 7)
        with self.assertRaises(adapter.AdapterProtocolError):
            adapter.terminal_request(frame, seen)
        for field, value in (("maxOutputBytes", True), ("maxOutputBytes", 0), ("timeoutMs", adapter.MAX_TIMEOUT_MS + 1), ("command", "bad\x00command")):
            changed = {**frame, "request": {**frame["request"], field: value}}
            with self.subTest(field=field, value=value), self.assertRaises(adapter.AdapterProtocolError):
                adapter.terminal_request(changed, set())
        with self.assertRaises(adapter.AdapterProtocolError):
            adapter.terminal_request({**frame, "host": True}, set())

    def test_output_bound_is_combined_utf8_bytes_with_visible_marker(self):
        for maximum in range(1, 130):
            result = adapter.bounded_terminal_result("🦀" * 200, "é" * 100, 3, maximum)
            self.assertEqual(set(result), {"stdout", "stderr", "exitCode"})
            self.assertLessEqual(len(result["stdout"].encode()) + len(result["stderr"].encode()), maximum)
            self.assertEqual(result["exitCode"], 3)
            self.assertIn("[output truncated]" if maximum >= 20 else "~", result["stdout"] + result["stderr"])

    def test_small_nonzero_output_is_not_changed(self):
        self.assertEqual(adapter.bounded_terminal_result(None, "bad\n", 42, 100), {"stdout": "", "stderr": "bad\n", "exitCode": 42})

    def test_host_model_is_not_silently_changed(self):
        values = {"ALGAL_HARNESS_CONFIG_JSON": json.dumps({"instruction": "wrong", "xcb": {"model": "m"}})}
        self.assertEqual(adapter.controller_config("actual", values, "m")["instruction"], "actual")
        with self.assertRaises(adapter.AdapterProtocolError):
            adapter.controller_config("actual", values, "different")
        with self.assertRaises(adapter.AdapterProtocolError):
            adapter.controller_config("actual", {**values, "ALGAL_HARNESS_MODEL": "different"}, "m")

    def test_config_rejects_artifact_path_override(self):
        values = {"ALGAL_HARNESS_CONFIG_JSON": json.dumps({"artifactDir": "/tmp/wrong", "xcb": {"model": "m"}})}
        with self.assertRaises(adapter.AdapterProtocolError):
            adapter.controller_config("actual", values, "m")


class TransportTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.logs = self.root / "logs"
        self.calls = []

    def tearDown(self):
        self.temporary.cleanup()

    def child(self, body):
        path = self.root / "peer.py"
        path.write_text("import json, sys, signal, time\n" + textwrap.dedent(body), encoding="utf-8")
        return [str(Path(sys.executable).resolve()), str(path.resolve())]

    def environment(self, stdout="result", stderr="", return_code=0):
        async def execute(**kwargs):
            self.calls.append(kwargs)
            return fake_envelope(wrapper_request(kwargs["command"]), stdout, stderr, return_code)
        return SimpleNamespace(exec=execute)

    def receipt(self):
        return json.loads((self.logs / "algal-harness-receipt.json").read_text())

    async def test_terminal_response_framing_and_nonzero_exit(self):
        argv = self.child('''
            initial = json.loads(sys.stdin.readline())
            assert initial['instruction'] == 'task'
            print(json.dumps({'type':'terminal','id':0,'request':{'command':'exit 17','maxOutputBytes':40,'timeoutMs':1001}}), flush=True)
            reply = json.loads(sys.stdin.readline())
            assert reply['type'] == 'terminal-result' and reply['id'] == 0
            assert set(reply['result']) == {'stdout','stderr','exitCode'}
            assert reply['result']['exitCode'] == 17 and reply['truncated'] is True
            print(json.dumps({'type':'result','result':{'termination':'finished'}}), flush=True)
        ''')
        result = await adapter.run_controller(argv, {"instruction": "task"}, self.environment("x" * 200, "diagnostic", 17), self.logs)
        self.assertEqual(result, {"termination": "finished"})
        self.assertEqual(wrapper_request(self.calls[0]["command"])["command"], "exit 17")
        self.assertEqual(self.calls[0]["timeout_sec"], 2 + adapter.SANDBOX_OUTER_SLACK_SEC)
        self.assertEqual(self.receipt()["status"], "controller_completed")
        self.assertNotIn("reward", self.receipt())

    async def test_environment_exception_is_sanitized_and_never_retried(self):
        argv = self.child('''
            json.loads(sys.stdin.readline())
            print(json.dumps({'type':'terminal','id':1,'request':{'command':'work','maxOutputBytes':64,'timeoutMs':1000}}), flush=True)
            reply = json.loads(sys.stdin.readline())
            assert reply['type'] == 'terminal-error' and 'SECRET' not in reply['error']
            print(json.dumps({'type':'result','result':{'termination':'failed'}}), flush=True)
        ''')
        async def execute(**kwargs):
            self.calls.append(kwargs)
            raise RuntimeError("SECRET provider credential " + "x" * 100000)
        with self.assertRaises(adapter.AdapterProtocolError):
            await adapter.run_controller(argv, {}, SimpleNamespace(exec=execute), self.logs)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.receipt()["terminalErrors"], 1)
        self.assertNotIn("SECRET", (self.logs / "algal-harness.jsonl").read_text())

    async def test_duplicate_terminal_id_is_not_executed_twice(self):
        argv = self.child('''
            json.loads(sys.stdin.readline())
            request = {'type':'terminal','id':1,'request':{'command':'once','maxOutputBytes':64,'timeoutMs':1000}}
            print(json.dumps(request), flush=True)
            json.loads(sys.stdin.readline())
            print(json.dumps(request), flush=True)
            sys.stdin.readline()
        ''')
        with self.assertRaises(adapter.AdapterProtocolError):
            await adapter.run_controller(argv, {}, self.environment(), self.logs)
        self.assertEqual(len(self.calls), 1)

    async def test_stderr_is_drained_and_capped(self):
        argv = self.child('''
            json.loads(sys.stdin.readline())
            sys.stderr.write('e' * 150000)
            sys.stderr.flush()
            print(json.dumps({'type':'result','result':{}}), flush=True)
        ''')
        await adapter.run_controller(argv, {}, self.environment(), self.logs)
        self.assertEqual((self.logs / "algal-harness-stderr.log").stat().st_size, adapter.MAX_STDERR_BYTES)
        self.assertEqual(self.receipt()["stderrBytes"], 150000)
        self.assertTrue(self.receipt()["stderrTruncated"])

    async def test_oversized_stdout_fails_without_huge_error(self):
        argv = self.child('''
            json.loads(sys.stdin.readline())
            print('x' * 5000000, flush=True)
        ''')
        with self.assertRaises(adapter.AdapterProtocolError) as exc:
            await adapter.run_controller(argv, {}, self.environment(), self.logs)
        self.assertLess(len(str(exc.exception)), 100)
        self.assertEqual(self.receipt()["status"], "failed")

    async def test_trailing_frame_is_rejected(self):
        argv = self.child('''
            json.loads(sys.stdin.readline())
            print(json.dumps({'type':'result','result':{}}), flush=True)
            print(json.dumps({'type':'result','result':{}}), flush=True)
        ''')
        with self.assertRaises(adapter.AdapterProtocolError):
            await adapter.run_controller(argv, {}, self.environment(), self.logs)

    async def test_cancellation_sends_term_and_waits_for_settlement(self):
        marker = self.root / "settled"
        argv = self.child('''
            stopped = False
            def stop(*args):
                global stopped
                stopped = True
            signal.signal(signal.SIGTERM, stop)
            initial = json.loads(sys.stdin.readline())
            print(json.dumps({'type':'terminal','id':0,'request':{'command':'wait','maxOutputBytes':64,'timeoutMs':1000}}), flush=True)
            sys.stdin.readline()
            assert stopped
            from pathlib import Path
            Path(initial['marker']).write_text('settled')
        ''')
        started = asyncio.Event()
        sandbox_settled = asyncio.Event()
        async def execute(**kwargs):
            self.calls.append(kwargs)
            started.set()
            await asyncio.sleep(0.1)
            sandbox_settled.set()
            return fake_envelope(wrapper_request(kwargs["command"]))
        task = asyncio.create_task(adapter.run_controller(argv, {"marker": str(marker)}, SimpleNamespace(exec=execute), self.logs))
        await asyncio.wait_for(started.wait(), 5)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertEqual(marker.read_text(), "settled")
        self.assertTrue(sandbox_settled.is_set())
        self.assertEqual(self.receipt()["status"], "cancelled")
        self.assertEqual(self.receipt()["controllerExitCode"], 0)

    async def test_actual_agent_uses_unmounted_paths_despite_task_symlinks(self):
        shared = self.root / "agent"
        shared.mkdir()
        victim = self.root / "protected.txt"
        victim.write_text("protected")
        (shared / "algal-harness-receipt.json").symlink_to(victim)
        (shared / "algal").symlink_to(self.root)
        agent = object.__new__(adapter.AlgalHarborAgent)
        agent.logs_dir = shared
        agent.model_name = "m"
        config = {"ALGAL_HARNESS_CONFIG_JSON": json.dumps({"xcb": {"model": "m"}})}
        if adapter.HARBOR_AVAILABLE:
            agent._extra_env = config
        else:
            agent.extra_env = config
        environment = SimpleNamespace(_mounts=[SimpleNamespace(source=str(shared))])
        with patch.object(adapter, "run_controller", new=AsyncMock()) as controller:
            await agent.run("instruction", environment, SimpleNamespace(metadata=None))
        self.assertEqual(controller.call_args.args[3], self.root.resolve() / "algal-host")
        self.assertEqual(controller.call_args.args[1]["artifactDir"], str(self.root.resolve() / "algal-host" / "algal"))
        self.assertEqual(victim.read_text(), "protected")
        self.assertTrue((shared / "algal").is_symlink())

    async def test_host_evidence_refuses_custom_mount_of_trial_parent(self):
        shared = self.root / "agent"
        shared.mkdir()
        environment = SimpleNamespace(_mounts=[SimpleNamespace(source=str(self.root))])
        with self.assertRaises(adapter.AdapterProtocolError):
            adapter.host_evidence_dir(shared, environment)


class SandboxCaptureTests(unittest.IsolatedAsyncioTestCase):
    """Run only fixed test commands locally as a stand-in for environment.exec.

    Production execute_terminal never launches these commands on the host: it
    hands the wrapper to Harbor's sandbox API. Tests inspect how much output that
    API would buffer, as well as the command's post-output side effects and exit.
    """

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.buffered_responses = []
        self.processes = []

    def tearDown(self):
        self.temporary.cleanup()

    def python_command(self, code):
        return "python3 -c " + shlex.quote(code)

    def environment(self):
        async def execute(command, timeout_sec, env=None):
            process = await asyncio.create_subprocess_exec(
                "/bin/bash", "-lc", command, stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE, cwd=str(self.root),
                env={**os.environ, **(env or {})},
            )
            self.processes.append(process)
            out, err = await asyncio.wait_for(process.communicate(), timeout_sec)
            self.buffered_responses.append((out, err))
            return SimpleNamespace(stdout=out.decode(), stderr=err.decode(), return_code=process.returncode)
        return SimpleNamespace(exec=execute)

    async def test_megabytes_are_drained_before_host_buffering_without_sigpipe(self):
        marker = self.root / "reached-end"
        code = ("import os,sys,pathlib; "
                "os.write(1,b'a'*8000000); os.write(2,b'e'*4000000); "
                "pathlib.Path(" + repr(str(marker)) + ").write_text('done'); sys.exit(19)")
        reply = await adapter.execute_terminal(self.environment(), 4, {
            "command": self.python_command(code), "maxOutputBytes": 512, "timeoutMs": 5000,
        })
        self.assertEqual(marker.read_text(), "done")
        self.assertEqual(reply["result"]["exitCode"], 19)
        self.assertTrue(reply["truncated"])
        self.assertLessEqual(sum(len(reply["result"][key].encode()) for key in ("stdout", "stderr")), 512)
        self.assertLess(len(self.buffered_responses[0][0]), 4096)
        self.assertEqual(self.buffered_responses[0][1], b"")
        self.assertIsNotNone(self.processes[0].returncode)

    async def test_utf8_prefixes_and_literal_shell_text(self):
        code = "import sys; sys.stdout.write('🦀'*1000); sys.stderr.write('é'*1000); sys.exit(7)"
        reply = await adapter.execute_terminal(self.environment(), 2, {
            "command": self.python_command(code), "maxOutputBytes": 83, "timeoutMs": 5000,
        })
        result = reply["result"]
        self.assertEqual(result["exitCode"], 7)
        self.assertLessEqual(len(result["stdout"].encode()) + len(result["stderr"].encode()), 83)
        self.assertIn("[output truncated]", result["stdout"] + result["stderr"])
        self.assertNotIn("\ufffd", result["stdout"] + result["stderr"])
        literal = "`not-a-command` $(not-a-command) 'quoted'\n"
        reply = await adapter.execute_terminal(self.environment(), 3, {
            "command": self.python_command("import sys; sys.stdout.write(" + repr(literal) + ")"),
            "maxOutputBytes": 200, "timeoutMs": 5000,
        })
        self.assertEqual(reply["result"], {"stdout": literal, "stderr": "", "exitCode": 0})
        self.assertFalse(reply["truncated"])

    async def test_timeout_terms_and_reaps_command(self):
        marker = self.root / "term-handled"
        code = ("import signal,time,pathlib,sys; "
                "signal.signal(signal.SIGTERM,lambda *args:(pathlib.Path(" + repr(str(marker)) + ").write_text('term'),sys.exit(23))); "
                "time.sleep(30)")
        reply = await adapter.execute_terminal(self.environment(), 5, {
            "command": self.python_command(code), "maxOutputBytes": 100, "timeoutMs": 400,
        })
        self.assertTrue(reply["timedOut"])
        self.assertIn(reply["result"]["exitCode"], (23, 143))
        self.assertEqual(marker.read_text(), "term")
        self.assertIsNotNone(self.processes[0].returncode)

    async def test_timeout_kills_command_that_ignores_term_and_joins(self):
        pidfile = self.root / "pid"
        code = ("import signal,time,pathlib,os; signal.signal(signal.SIGTERM,signal.SIG_IGN); "
                "pathlib.Path(" + repr(str(pidfile)) + ").write_text(str(os.getpid())); time.sleep(30)")
        reply = await adapter.execute_terminal(self.environment(), 6, {
            "command": self.python_command(code), "maxOutputBytes": 100, "timeoutMs": 400,
        })
        self.assertTrue(reply["timedOut"])
        self.assertEqual(reply["result"]["exitCode"], 137)
        with self.assertRaises(ProcessLookupError):
            os.kill(int(pidfile.read_text()), 0)

    async def test_cancellation_joins_existing_exec_before_propagating(self):
        finished = asyncio.Event()
        started = asyncio.Event()
        async def execute(**kwargs):
            started.set()
            await asyncio.sleep(0.08)
            finished.set()
            return fake_envelope(wrapper_request(kwargs["command"]))
        notified = []
        pending = asyncio.create_task(adapter.execute_terminal(SimpleNamespace(exec=execute), 0, {
            "command": "true", "maxOutputBytes": 100, "timeoutMs": 1000,
        }, on_cancel=lambda: notified.append("term")))
        await started.wait()
        pending.cancel()
        await asyncio.sleep(0)
        self.assertEqual(notified, ["term"])
        self.assertFalse(pending.done())
        pending.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await pending
        self.assertTrue(finished.is_set())

    async def test_host_backend_configuration_is_blanked_for_task_commands(self):
        code = "import os,sys; sys.stdout.write(os.environ.get('ALGAL_HARNESS_CONFIG_JSON','missing'))"
        with patch.dict(os.environ, {"ALGAL_HARNESS_CONFIG_JSON": "private-account-routing"}):
            reply = await adapter.execute_terminal(self.environment(), 7, {
                "command": self.python_command(code), "maxOutputBytes": 100, "timeoutMs": 3000,
            })
        self.assertEqual(reply["result"]["stdout"], "")

    async def test_wrapper_skips_task_python_startup_hooks(self):
        (self.root / "sitecustomize.py").write_text("print('unexpected-startup-output')\n")
        with patch.dict(os.environ, {"PYTHONPATH": str(self.root)}):
            reply = await adapter.execute_terminal(self.environment(), 8, {
                "command": "printf task-output", "maxOutputBytes": 100, "timeoutMs": 3000,
            })
        self.assertEqual(reply["result"], {"stdout": "task-output", "stderr": "", "exitCode": 0})
        self.assertEqual(self.buffered_responses[0][1], b"")


if __name__ == "__main__":
    unittest.main()
