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
        if (source && path.resolve(cwd, target) === source) {
          log(`Reusing existing symlink -> ${source}`);
          return false;
        }
      } else if (stat.isFile()) {
        // .content is a regular file (shouldn't be committed, but handle it)
        log(`Removing regular file ${dest} (should be a symlink)`);
      } else if (stat.isDirectory()) {
        // .content is a directory (shouldn't happen, but handle it)
        log(`Removing directory ${dest} (should be a symlink)`);
      }
    } catch {
      // fall through to removal
    }
    // Remove file, directory, or symlink
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

/**
 * Get the Team-Guidebook root path from content root.
 * Handles both .content/Team-Guidebook and direct Team-Guidebook scenarios.
 * Also handles when .content is a symlink directly to Team-Guidebook.
 */
const getTeamGuidebookPath = (contentRoot) => {
  // If contentRoot is directly Team-Guidebook, return it
  if (path.basename(contentRoot) === 'Team-Guidebook') {
    return contentRoot;
  }
  
  // Check if contentRoot directly contains Team-Guidebook directories (通讯录, 图书馆, etc.)
  // This happens when .content is a symlink directly to Team-Guidebook
  const hasTeamGuidebookDirs = exists(path.resolve(contentRoot, '通讯录')) || 
                                exists(path.resolve(contentRoot, '图书馆'));
  
  if (hasTeamGuidebookDirs) {
    // contentRoot is already the Team-Guidebook root
    return contentRoot;
  }
  
  // Otherwise, assume Team-Guidebook is a subdirectory
  return path.resolve(contentRoot, 'Team-Guidebook');
};

const syncAttachments = (contentRoot) => {
  const attachmentsDir = path.resolve(cwd, 'public', 'attachments');
  const teamGuidebookPath = getTeamGuidebookPath(contentRoot);
  const sourceAssets = path.resolve(teamGuidebookPath, 'assets');
  const sourceImages = path.resolve(teamGuidebookPath, '图片库');

  // Create public/attachments if it doesn't exist
  if (!exists(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
  }

  const copyDir = (src, destBase) => {
    if (!exists(src)) {
      log(`Source directory ${src} not found, skipping...`);
      return;
    }

    const items = fs.readdirSync(src, { withFileTypes: true });
    for (const item of items) {
      const srcPath = path.join(src, item.name);
      const destPath = path.join(destBase, item.name);

      if (item.isDirectory()) {
        if (!exists(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        copyDir(srcPath, destPath);
      } else {
        // Check for name collisions
        if (exists(destPath)) {
          log(`Warning: File ${item.name} already exists in attachments, skipping ${srcPath}`);
          continue;
        }
        fs.copyFileSync(srcPath, destPath);
        log(`Copied ${item.name} to attachments`);
      }
    }
  };

  log('Syncing attachments from content source...');
  copyDir(sourceAssets, attachmentsDir);
  copyDir(sourceImages, attachmentsDir);
  log('Attachments sync completed');
};

/**
 * Setup symlinks in src/content/ to map Content Collections to .content/Team-Guidebook/
 * This enables Direct Map strategy: Content Collections read from Obsidian vault structure.
 */
const setupContentCollections = (contentRoot) => {
  const teamGuidebookPath = getTeamGuidebookPath(contentRoot);
  const contentDir = path.resolve(cwd, 'src', 'content');

  // Ensure src/content exists
  if (!exists(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }

  /**
   * Create symlink for a collection.
   * @param {string} collectionName - Collection name (e.g., 'people')
   * @param {string} sourcePath - Source path in Team-Guidebook
   */
  const linkCollection = (collectionName, sourcePath) => {
    const source = path.resolve(teamGuidebookPath, sourcePath);
    const target = path.resolve(contentDir, collectionName);

    if (!exists(source)) {
      log(`Source directory ${source} not found, skipping ${collectionName} collection...`);
      return;
    }

    // Remove existing symlink or directory
    if (exists(target)) {
      try {
        const stat = fs.lstatSync(target);
        if (stat.isSymbolicLink()) {
          const existingTarget = fs.readlinkSync(target);
          if (path.resolve(cwd, existingTarget) === source) {
            log(`Reusing existing symlink: ${collectionName} -> ${sourcePath}`);
            return;
          }
        }
        fs.rmSync(target, { recursive: true, force: true });
      } catch (err) {
        log(`Warning: Could not remove existing ${target}: ${err.message}`);
      }
    }

    try {
      fs.symlinkSync(source, target, 'dir');
      log(`Linked ${collectionName} collection: ${target} -> ${sourcePath}`);
    } catch (err) {
      error(`Failed to create symlink for ${collectionName}: ${err.message}`);
    }
  };

  log('Setting up Content Collections symlinks...');
  
  // Map collections to Team-Guidebook directories
  // Note: News requires custom loader (handled separately in src/content/loaders/)
  linkCollection('people', '通讯录');
  linkCollection('projects', '图书馆/项目');
  
  // Library: We need to include 图书馆/** but exclude 项目/ and 文献/
  // Since Astro Content Collections doesn't support glob exclusions natively,
  // we create a symlink to the entire 图书馆 directory.
  // The exclusion will be handled at query time or via a custom loader.
  // Alternative: Create individual symlinks for each subdirectory (more complex)
  linkCollection('library', '图书馆');
  
  // Publications: map to 图书馆/文献 (short-term, markdown-based)
  linkCollection('publications', '图书馆/文献');
  
  // Note: News collection requires a custom loader to extract bullet items
  // from Daily Notes (档案馆/YYYY-MM-DD.md). This will be implemented
  // in src/content/loaders/news.ts and wired via config.ts loader option.
  
  log('Content Collections symlinks setup completed');
};

const main = () => {
  const source = resolveSource();
  let contentRoot = null;

  if (source) {
    linkSource(source);
    contentRoot = dest; // .content points to source
    syncAttachments(contentRoot);
    setupContentCollections(contentRoot);
    return;
  }

  if (repoUrl) {
    cloneSource();
    contentRoot = dest; // .content is the clone destination
    syncAttachments(contentRoot);
    setupContentCollections(contentRoot);
    return;
  }

  // Fallback: use local Team-Guidebook if it exists
  if (exists(fallback)) {
    log(`Using fallback content source: ${fallback}`);
    contentRoot = fallback;
    syncAttachments(contentRoot);
    setupContentCollections(contentRoot);
    return;
  }

  error('No content source found. Provide CONTENT_DIR or CONTENT_REPO_URL, or place Team-Guidebook in project root.');
  process.exit(1);
};

main();

