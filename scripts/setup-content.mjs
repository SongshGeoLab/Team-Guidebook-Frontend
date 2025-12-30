#!/usr/bin/env node
/**
 * Prepare content directory for Astro build/dev.
 *
 * Priority:
 * 1) CONTENT_DIR (local path) -> symlink to .content
 * 2) CONTENT_REPO_URL (optional branch CONTENT_REPO_REF) -> git clone to .content
 * 3) Fallback to ./Team-Guidebook if it exists.
 *
 * Exits with code 1 when no content source is available.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const dest = path.resolve(cwd, '.content');
const envContentDir = process.env.CONTENT_DIR;
const repoUrl = process.env.CONTENT_REPO_URL;
const repoRef = process.env.CONTENT_REPO_REF || 'main';
const fallback = path.resolve(cwd, 'Team-Guidebook');

const log = (message) => console.log(`[content] ${message}`);
const error = (message) => console.error(`[content] ${message}`);

const exists = (p) => {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
};

const resolveSource = () => {
  if (envContentDir) {
    const abs = path.resolve(cwd, envContentDir);
    if (exists(abs)) return abs;
    error(`CONTENT_DIR=${abs} not found.`);
    process.exit(1);
  }

  if (repoUrl) return null; // will clone

  if (exists(fallback)) return fallback;

  return null;
};

const cleanDest = (source) => {
  if (exists(dest)) {
    try {
      const stat = fs.lstatSync(dest);
      if (stat.isSymbolicLink()) {
        const target = fs.readlinkSync(dest);
        if (path.resolve(cwd, target) === source) {
          log(`Reusing existing symlink -> ${source}`);
          return false;
        }
      }
    } catch {
      // fall through to removal
    }
    fs.rmSync(dest, { recursive: true, force: true });
  }
  return true;
};

const linkSource = (source) => {
  const changed = cleanDest(source);
  if (changed) {
    fs.symlinkSync(source, dest, 'dir');
    log(`Linked ${source} -> ${dest}`);
  }
};

const cloneSource = () => {
  cleanDest(null);
  const args = ['clone', '--depth=1', '--branch', repoRef, repoUrl, dest];
  log(`Cloning content via: git ${args.join(' ')}`);
  execFileSync('git', args, { stdio: 'inherit' });
  log(`Cloned ${repoUrl} @ ${repoRef} into ${dest}`);
};

const main = () => {
  const source = resolveSource();

  if (source) {
    linkSource(source);
    return;
  }

  if (repoUrl) {
    cloneSource();
    return;
  }

  error('No content source found. Provide CONTENT_DIR or CONTENT_REPO_URL, or place Team-Guidebook in project root.');
  process.exit(1);
};

main();

