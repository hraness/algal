/** Local Unix socket bridge for Valhalla's opt-in Habitat Link Iroh handler.
 * One length-prefixed JSON request per connection; the peer keeps reading.
 * Grants and applications are enrolled by the host, never by the wire peer.
 */
import { isAbsolute } from "node:path";
import { chmod, lstat } from "node:fs/promises";
import { asDigest } from "./digest";
import { AlgalError } from "./errors";
import { parseHabitatInvocation, parseHabitatMessage, type HabitatId } from "./habitat-link";
import type { LocalHabitatAcceptor } from "./habitat-link-host";
import { asObject, asSafeId, asString, canonicalize, noUnknownKeys, type JsonValue } from "./values";

export const HABITAT_LINK_SOCKET_BOUNDS = Object.freeze({ maxFrameBytes: 262_144, maxConnections: 64, timeoutMs: 10_000 });

export type HabitatLinkSocketOptions = {
  path: string;
  acceptor: LocalHabitatAcceptor;
  /** Host-owned scheduler hook, called after durable acceptance, including retries. */
  accepted?: (process: string) => Promise<void>;
  /** Local diagnostics; errors are never disclosed to the remote peer. */
  onError?: (error: unknown) => void;
};

type Connection = {
  bytes: Buffer;
  scheduled: boolean;
  finished: boolean;
  closed: boolean;
  deadline?: ReturnType<typeof setTimeout>;
  response?: Buffer;
  written: number;
};

/** Start in a host-owned private directory. Existing paths are never removed.
 * The length prefix completes the request. The peer keeps its write half
 * open until the asynchronous reply arrives; Bun closes Unix half-open
 * sockets before async work can reply. Extra data never starts another request;
 * if acceptance already happened, closing the reply channel cannot undo it.
 * The caller reconciles that uncertain outcome under the same operation id.
 * Closing releases the listener and every admitted connection. */
export async function serveHabitatLinkSocket(options: HabitatLinkSocketOptions): Promise<{ server: Bun.UnixSocketListener<Connection>; close(): Promise<void> }> {
  if (!isAbsolute(options.path)) throw new AlgalError("PARSE_FAILED", "Habitat Link socket path must be absolute");
  try {
    await lstat(options.path);
    throw new AlgalError("IO_FAILED", "Habitat Link socket path already exists");
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const sockets = new Set<Bun.Socket<Connection>>();
  let tail: Promise<unknown> = Promise.resolve();
  const report = (error: unknown) => { try { options.onError?.(error); } catch { /* Diagnostics cannot break request isolation. */ } };
  const flush = (socket: Bun.Socket<Connection>) => {
    const state = socket.data;
    if (state.closed || state.response === undefined) return;
    const written = socket.write(state.response.subarray(state.written));
    if (written < 0) { socket.terminate(); return; }
    state.written += written;
    if (state.written === state.response.length) socket.end();
  };
  const schedule = (socket: Bun.Socket<Connection>) => {
    const state = socket.data;
    if (state.scheduled || state.closed) return;
    state.scheduled = true;
    const run = async () => {
      if (state.closed) return;
      const bytes = state.bytes;
      if (bytes.length < 4 || bytes.readUInt32BE(0) !== bytes.length - 4) throw new Error("incomplete frame");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(4));
      const value: unknown = JSON.parse(text);
      const request = asObject(value, "Habitat Link envelope");
      let reply: JsonValue;
      switch (request.contract) {
        case "algal.habitat-invocation.v1": {
          const acceptance = await options.acceptor.invoke(parseHabitatInvocation(value));
          if (options.accepted) await options.accepted(acceptance.process);
          reply = acceptance;
          break;
        }
        case "algal.habitat-query.v1": {
          noUnknownKeys(request, ["contract", "operationId", "grant", "sender"], "query");
          const operationId = asString(request.operationId, "query.operationId", 32);
          if (!/^[0-9a-f]{32}$/.test(operationId)) throw new Error("invalid operation id");
          const sender = asObject(request.sender, "query.sender");
          noUnknownKeys(sender, ["habitat", "principal"], "query.sender");
          const habitat = asString(sender.habitat, "query.sender.habitat", 34);
          if (!/^h_[0-9a-f]{32}$/.test(habitat)) throw new Error("invalid habitat");
          reply = await options.acceptor.queryInvocation(operationId, asDigest(request.grant, "query.grant"), { habitat: habitat as HabitatId, principal: asSafeId(sender.principal, "query.sender.principal") });
          break;
        }
        case "algal.habitat-message.v1": {
          const message = parseHabitatMessage(value);
          reply = await options.acceptor.acceptMessage(message);
          break;
        }
        default: throw new Error("unsupported Habitat Link request");
      }
      const body = Buffer.from(canonicalize(reply));
      if (body.length > HABITAT_LINK_SOCKET_BOUNDS.maxFrameBytes) throw new Error("oversized reply");
      const header = Buffer.alloc(4);
      header.writeUInt32BE(body.length);
      state.response = Buffer.concat([header, body]);
      flush(socket);
    };
    tail = tail.then(run).catch((error) => { report(error); socket.terminate(); }).finally(() => {
      state.finished = true;
      if (state.closed) sockets.delete(socket);
    });
  };
  const server = Bun.listen<Connection>({
    unix: options.path,
    allowHalfOpen: true,
    socket: {
      open(socket) {
        socket.data = { bytes: Buffer.alloc(0), scheduled: false, finished: false, closed: false, written: 0 };
        if (sockets.size >= HABITAT_LINK_SOCKET_BOUNDS.maxConnections) { socket.terminate(); return; }
        sockets.add(socket);
        socket.data.deadline = setTimeout(() => socket.terminate(), HABITAT_LINK_SOCKET_BOUNDS.timeoutMs);
      },
      close(socket) {
        const state = socket.data;
        state.closed = true;
        clearTimeout(state.deadline);
        // A timed-out queued/running request still occupies capacity until
        // its work finishes, even if a host scheduling hook stalls.
        if (!state.scheduled || state.finished) sockets.delete(socket);
      },
      error(socket, error) { report(error); socket.terminate(); },
      data(socket, chunk) {
        const state = socket.data;
        if (state.scheduled || state.bytes.length + chunk.length > HABITAT_LINK_SOCKET_BOUNDS.maxFrameBytes + 4) { socket.terminate(); return; }
        state.bytes = Buffer.concat([state.bytes, chunk]);
        if (state.bytes.length >= 4) {
          const length = state.bytes.readUInt32BE(0);
          if (length === 0 || length > HABITAT_LINK_SOCKET_BOUNDS.maxFrameBytes || state.bytes.length > length + 4) { socket.terminate(); return; }
          if (state.bytes.length === length + 4) schedule(socket);
        }
      },
      drain: flush,
      end(socket) { socket.terminate(); },
    },
  });
  try { await chmod(options.path, 0o600); }
  catch (error) { server.stop(true); throw error; }
  return {
    server,
    async close() {
      server.stop(true);
      for (const socket of sockets) { clearTimeout(socket.data.deadline); socket.terminate(); }
    },
  };
}
