#!/usr/bin/env node
// scripts/launch.mjs — one-command launch: install if needed, build, start, open browser
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import open from 'open';

const cwd = new URL('..', import.meta.url).pathname;
process.chdir(cwd);

function log(msg) { console.log(`\x1b[36m[clonecast]\x1b[0m ${msg}`); }

if (!existsSync('node_modules')) {
  log('Installing dependencies (this happens once)...');
  execSync('npm install', { stdio: 'inherit' });
}

if (!existsSync('.env.local')) {
  log('Creating .env.local from template...');
  execSync('cp .env.example .env.local && chmod 600 .env.local');
}

log('Starting Clonecast on http://localhost:4242');
const server = spawn('npx', ['next', 'dev', '-p', '4242'], { stdio: 'inherit' });

setTimeout(() => {
  open('http://localhost:4242').catch(() => {
    log('Could not open browser — visit http://localhost:4242 manually');
  });
}, 3000);

process.on('SIGINT', () => { server.kill(); process.exit(0); });
