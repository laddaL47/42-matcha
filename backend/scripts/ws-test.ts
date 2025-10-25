declare const process: any;
import { io } from 'socket.io-client';

const WS_URL = process.env.WS_URL || 'http://localhost:3000';
const WS_PATH = process.env.WS_PATH || '/ws';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 5000);

function done(exitCode: number, msg?: string) {
  if (msg) console.log(msg);
  // Give socket time to flush any final packets
  setTimeout(() => process.exit(exitCode), 50);
}

async function main() {
  const socket = io(WS_URL, {
    path: WS_PATH,
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  let gotHello = false;
  let gotPong = false;

  const to = setTimeout(() => {
    console.error('Timeout waiting for WS events', { gotHello, gotPong });
    try { socket.close(); } catch {}
    done(1);
  }, TIMEOUT_MS);

  socket.on('connect_error', (err) => {
    console.error('connect_error:', err.message);
  });

  socket.on('connect', () => {
    console.log('[client] connected', socket.id);
  });

  socket.on('hello', (payload: unknown) => {
    gotHello = true;
    console.log('[server->client] hello', payload);
    // After hello, test ping/pong
    socket.emit('ping');
  });

  socket.on('pong', () => {
    gotPong = true;
    console.log('[server->client] pong');
    clearTimeout(to);
    try { socket.close(); } catch {}
    done(0, 'OK: hello + ping/pong verified');
  });
}

main().catch((e) => {
  console.error(e);
  done(1);
});
