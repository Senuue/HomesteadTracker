'use strict';
// Cross-platform dev runner that starts API and UI in parallel without relying on cmd.exe shell
const { spawn } = require('child_process');

function run(name, command, opts = {}) {
  const child = spawn(command, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true, // improves Windows compatibility
    ...opts,
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${name}] ${d}`));
  child.on('exit', (code) => {
    process.stderr.write(`[${name}] exited with code ${code}\n`);
    process.exitCode = process.exitCode || code || 0;
  });
  return child;
}

// Start API via npm script
const api = run('API', 'npm run server', { env: process.env });

// Start UI via npm script
const ui = run('UI', 'npm run dev', { env: process.env });

// On Ctrl+C propagate to children
process.on('SIGINT', () => {
  api.kill('SIGINT');
  ui.kill('SIGINT');
  setTimeout(() => process.exit(0), 200);
});
