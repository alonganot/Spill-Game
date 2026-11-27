// `npm run electron:dev`: starts the Vite dev server, then opens it in Electron
// (with hot reload). Closing the window stops the server.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import electron from 'electron';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root });
await server.listen();
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite dev server has no local URL');
server.printUrls();

// Extra arguments (`npm run electron:dev -- --some-flag`) go to Electron.
const child = spawn(electron, ['.', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, SPILL_DEV_URL: url },
});
child.on('exit', async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
