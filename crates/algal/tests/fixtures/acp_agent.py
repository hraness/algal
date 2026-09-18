import json
import sys
import time

mode = sys.argv[1] if len(sys.argv) > 1 else "normal"


def send(value):
    print(json.dumps({"jsonrpc": "2.0", **value}), flush=True)


def receive():
    line = sys.stdin.buffer.readline(1048577)
    if not line:
        return None
    if len(line) > 1048576:
        raise ValueError("frame limit")
    return json.loads(line)


while True:
    request = receive()
    if request is None:
        break
    method = request.get("method")
    request_id = request.get("id")
    if method == "initialize":
        send({"id": request_id, "result": {"protocolVersion": 2 if mode == "version" else 1, "agentCapabilities": {}, "authMethods": []}})
    elif method == "session/new":
        if mode in ("early", "early-foreign"):
            send({"method": "session/update", "params": {"sessionId": "foreign" if mode == "early-foreign" else "fixture-session", "update": {"sessionUpdate": "available_commands_update", "availableCommands": []}}})
        send({"id": request_id, "result": {"sessionId": "fixture-session"}})
    elif method == "session/prompt":
        if mode == "hang":
            time.sleep(30)
        if mode == "eof":
            break
        text = "fixture-ok"
        if mode == "permission":
            send({"method": "session/update", "params": {"sessionId": "fixture-session", "update": {"sessionUpdate": "tool_call", "toolCallId": "read-one", "title": "Read fixture", "kind": "read", "status": "pending"}}})
            send({"id": "permission-1", "method": "session/request_permission", "params": {"sessionId": "fixture-session", "toolCall": {"toolCallId": "read-one"}, "options": [{"optionId": "allow", "name": "Allow once", "kind": "allow_once"}, {"optionId": "reject", "name": "Reject", "kind": "reject_once"}]}})
            permission = receive()
            allowed = permission.get("result", {}).get("outcome", {}).get("optionId") == "allow"
            text = "approved" if allowed else "denied"
            send({"method": "session/update", "params": {"sessionId": "fixture-session", "update": {"sessionUpdate": "tool_call_update", "toolCallId": "read-one", "status": "completed" if allowed else "failed"}}})
        send({"method": "session/update", "params": {"sessionId": "foreign" if mode == "foreign" else "fixture-session", "update": {"sessionUpdate": "agent_message_chunk", "content": {"type": "text", "text": json.dumps(text)}}}})
        send({"id": request_id, "result": {"stopReason": "end_turn"}})
    elif method == "session/cancel":
        break
    elif request_id is not None:
        send({"id": request_id, "error": {"code": -32601, "message": "unsupported"}})
