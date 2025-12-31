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

// Log script execution start
log('='.repeat(60));
log('Content setup script started');
log(`Node version: ${process.version}`);
log(`Working directory: ${cwd}`);
log(`CI environment: ${process.env.CI || process.env.VERCEL || 'false'}`);
log('='.repeat(60));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  // Use lstat to check if path exists (valid or broken symlink)
  let stat;
  try {
    stat = fs.lstatSync(dest);
  } catch (e) {
    // Path does not exist
    return true;
  }

  // If we have a source and it's a symlink pointing to that source, keep it
  if (stat.isSymbolicLink()) {
    try {
      const target = fs.readlinkSync(dest);
      if (source && path.resolve(cwd, target) === source) {
        log(`Reusing existing symlink -> ${source}`);
        return false;
      }
    } catch (e) {
      // Broken link or readlink failed, proceed to remove
    }
  } else if (stat.isFile()) {
    log(`Removing regular file ${dest} (should be a symlink)`);
  } else if (stat.isDirectory()) {
    log(`Removing directory ${dest} (should be a symlink)`);
  }

  // Remove file, directory, or symlink
  try {
    fs.rmSync(dest, { recursive: true, force: true });
  } catch (e) {
    error(`Failed to remove ${dest}: ${e.message}`);
    // Try to continue anyway, maybe it was removed by another process
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
  
  // Support GitHub token for HTTPS URLs (private repos)
  let finalRepoUrl = repoUrl;
  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken && repoUrl.startsWith('https://github.com/')) {
    // Insert token into URL: https://github.com/user/repo -> https://token@github.com/user/repo
    finalRepoUrl = repoUrl.replace('https://github.com/', `https://${githubToken}@github.com/`);
    log('Using GITHUB_TOKEN for authentication');
  }
  
  const args = ['clone', '--depth=1', '--branch', repoRef, finalRepoUrl, dest];
  log(`Cloning content via: git clone --depth=1 --branch ${repoRef} <repo> ${dest}`);
  try {
    execFileSync('git', args, { stdio: 'inherit' });
    log(`Cloned ${repoUrl} @ ${repoRef} into ${dest}`);
    return true;
  } catch (err) {
    error(`Failed to clone ${repoUrl}: ${err.message}`);
    return false;
  }
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
const setupContentCollections = async (contentRoot) => {
  const teamGuidebookPath = getTeamGuidebookPath(contentRoot);
  
  log(`Resolved Team-Guidebook path: ${teamGuidebookPath}`);
  try {
    if (exists(teamGuidebookPath)) {
      const contents = fs.readdirSync(teamGuidebookPath);
      log(`Directory structure at resolved path: ${contents.join(', ')}`);
    } else {
      error(`Resolved path does not exist!`);
    }
  } catch (e) {
    error(`Could not list resolved path: ${e.message}`);
  }

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
  const linkCollection = async (collectionName, sourcePath) => {
    const source = path.resolve(teamGuidebookPath, sourcePath);
    const target = path.resolve(contentDir, collectionName);

    log(`Setting up ${collectionName} collection:`);
    log(`  Team-Guidebook path: ${teamGuidebookPath}`);
    log(`  Source path: ${source}`);
    log(`  Target path: ${target}`);
    log(`  Source exists: ${exists(source)}`);

    if (!exists(source)) {
      error(`Source directory ${source} not found, skipping ${collectionName} collection...`);
      // List what's actually in the teamGuidebookPath
      if (exists(teamGuidebookPath)) {
        try {
          const dirContents = fs.readdirSync(teamGuidebookPath);
          log(`  Contents of ${teamGuidebookPath}: ${dirContents.join(', ')}`);
        } catch (err) {
          log(`  Could not read directory: ${err.message}`);
        }
      }
      return;
    }

    // Ensure parent directory exists for the target symlink
    // This is crucial for deeply nested paths or fresh builds
    const targetDir = path.dirname(target);
    if (!exists(targetDir)) {
      log(`Creating parent directory for ${collectionName}: ${targetDir}`);
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Determine if we should use symlink or copy
    // In CI/Vercel environments, copying is safer to avoid symlink resolution issues with Astro's glob loader
    const isCI = process.env.CI || process.env.VERCEL || process.env.NETLIFY;
    const useCopy = isCI;

    // Remove existing symlink or directory
    // CRITICAL: Must remove before creating new symlink, especially in CI environments
    // Always check and remove, even if it seems like it shouldn't exist
    if (exists(target)) {
      log(`  Target already exists, removing: ${target}`);
      try {
        const stat = fs.lstatSync(target);
        if (stat.isSymbolicLink()) {
          const existingTarget = fs.readlinkSync(target);
          const resolvedExisting = path.isAbsolute(existingTarget) 
            ? existingTarget 
            : path.resolve(path.dirname(target), existingTarget);
          if (resolvedExisting === source && !useCopy) {
            log(`Reusing existing symlink: ${collectionName} -> ${sourcePath}`);
            // Verify the symlink actually works
            try {
              const testFiles = fs.readdirSync(target);
              log(`  Verified: symlink is valid and accessible (${testFiles.length} items)`);
              return;
            } catch (verifyErr) {
              log(`  Warning: symlink exists but is broken (${verifyErr.message}), will recreate`);
            }
          } else {
            log(`Removing existing symlink with different target or switching to copy mode: ${existingTarget}`);
          }
        } else {
          log(`Removing existing directory/file: ${target} (isDirectory: ${stat.isDirectory()}, isFile: ${stat.isFile()})`);
        }
        
        // Force remove with multiple attempts if needed
        let removed = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            // Re-check stat on each attempt (might have changed)
            if (exists(target)) {
              const currentStat = fs.lstatSync(target);
              // Try unlink first for symlinks, then rmSync for directories/files
              if (currentStat.isSymbolicLink()) {
                log(`  Attempt ${attempt + 1}: Removing symlink`);
                fs.unlinkSync(target);
              } else if (currentStat.isDirectory()) {
                log(`  Attempt ${attempt + 1}: Removing directory`);
                fs.rmSync(target, { recursive: true, force: true });
              } else if (currentStat.isFile()) {
                log(`  Attempt ${attempt + 1}: Removing file`);
                fs.unlinkSync(target);
              } else {
                log(`  Attempt ${attempt + 1}: Removing unknown type`);
                fs.rmSync(target, { recursive: true, force: true });
              }
            } else {
              // Target doesn't exist anymore, consider it removed
              log(`  Target no longer exists (removed by previous attempt)`);
              removed = true;
              break;
            }
            removed = true;
            break;
          } catch (rmErr) {
            if (attempt < 4) {
              log(`  Removal attempt ${attempt + 1} failed: ${rmErr.message}, retrying...`);
              await sleep(200 * (attempt + 1)); // Exponential backoff
            } else {
              error(`  All removal attempts failed. Last error: ${rmErr.message}`);
              throw rmErr;
            }
          }
        }
        
        if (removed) {
          // Wait a bit and verify it's actually gone
          await sleep(50);
          if (exists(target)) {
            error(`  ERROR: ${target} still exists after removal!`);
            // Last resort: try to remove parent directory and recreate
            try {
              const parentDir = path.dirname(target);
              if (exists(parentDir)) {
                fs.rmSync(target, { recursive: true, force: true, maxRetries: 3 });
                await sleep(100);
              }
            } catch (lastErr) {
              error(`  Final removal attempt also failed: ${lastErr.message}`);
              throw new Error(`Cannot remove ${target} - blocking symlink creation`);
            }
          } else {
            log(`  ✓ Successfully removed ${target}`);
          }
        }
      } catch (err) {
        error(`Failed to remove existing ${target}: ${err.message}`);
        error(`  This will prevent symlink creation. Aborting ${collectionName} setup.`);
        return;
      }
    }

    try {
      if (useCopy) {
        log(`CI environment detected, copying ${collectionName} collection instead of symlink...`);
        fs.cpSync(source, target, { recursive: true });
        log(`✓ Copied ${collectionName} collection: ${target} <- ${sourcePath}`);
      } else {
        // Use absolute path for symlink to avoid issues in build environments
        fs.symlinkSync(source, target, 'dir');
        log(`✓ Linked ${collectionName} collection: ${target} -> ${sourcePath}`);
      }
      
      // Verify the operation was successful
      if (exists(target)) {
        const stat = fs.lstatSync(target);
        if (useCopy) {
           if (stat.isDirectory()) {
             const copiedFiles = fs.readdirSync(target);
             log(`  ✓ Copy verified: ${copiedFiles.length} items`);
           } else {
             error(`  Warning: Target exists but is not a directory (copy failed?)`);
           }
        } else if (stat.isSymbolicLink()) {
          const actualTarget = fs.readlinkSync(target);
          log(`  Verified: symlink points to ${actualTarget}`);
          
          // Test if we can actually read from the symlink
          try {
            const testFiles = fs.readdirSync(target);
            log(`  Verified: symlink is accessible (${testFiles.length} items)`);
          } catch (readErr) {
            error(`  ERROR: Symlink exists but cannot read from it: ${readErr.message}`);
            error(`  Falling back to copy instead of symlink`);
            // Remove broken symlink and copy instead
            fs.unlinkSync(target);
            fs.cpSync(source, target, { recursive: true });
            log(`  Copied ${collectionName} collection instead of symlink`);
          }
        } else {
          error(`  Warning: ${target} exists but is not a symlink`);
        }
      } else {
        error(`  ERROR: Operation reported success but target does not exist`);
      }
    } catch (err) {
      error(`Failed to create symlink/copy for ${collectionName}: ${err.message}`);
      error(`  Source: ${source}`);
      error(`  Target: ${target}`);
      
      // If symlink fails, try copying as fallback (especially for CI environments)
      if (!useCopy && (err.code === 'EEXIST' || err.code === 'EACCES' || err.code === 'EPERM')) {
        log(`  Attempting to copy instead of symlink (CI environment compatibility)...`);
        try {
          // CRITICAL: Force remove target first, regardless of type
          // This is a fallback, so we need to be extra aggressive about removal
          if (exists(target)) {
            log(`  Force removing existing target before copy: ${target}`);
            
            // Try multiple removal strategies
            for (let removalAttempt = 0; removalAttempt < 5; removalAttempt++) {
              try {
                if (!exists(target)) {
                  log(`  Target already removed`);
                  break;
                }
                
                const targetStat = fs.lstatSync(target);
                log(`  Removal attempt ${removalAttempt + 1}: Type is symlink=${targetStat.isSymbolicLink()}, dir=${targetStat.isDirectory()}, file=${targetStat.isFile()}`);
                
                if (targetStat.isSymbolicLink()) {
                  fs.unlinkSync(target);
                } else if (targetStat.isDirectory()) {
                  fs.rmSync(target, { recursive: true, force: true });
                } else if (targetStat.isFile()) {
                  fs.unlinkSync(target);
                } else {
                  // Unknown type, try both
                  try {
                    fs.unlinkSync(target);
                  } catch {
                    fs.rmSync(target, { recursive: true, force: true });
                  }
                }
                
                await sleep(100);
                
                // Verify removal
                if (!exists(target)) {
                  log(`  ✓ Target successfully removed`);
                  break;
                } else {
                  log(`  Warning: Target still exists after removal attempt ${removalAttempt + 1}`);
                  if (removalAttempt < 4) {
                    await sleep(200 * (removalAttempt + 1));
                  }
                }
              } catch (rmErr) {
                if (removalAttempt < 4) {
                  log(`  Removal attempt ${removalAttempt + 1} failed: ${rmErr.message}, retrying...`);
                  await sleep(200 * (removalAttempt + 1));
                } else {
                  error(`  All removal attempts failed: ${rmErr.message}`);
                  throw new Error(`Cannot remove ${target} for copy fallback: ${rmErr.message}`);
                }
              }
            }
            
            // Final check
            if (exists(target)) {
              throw new Error(`Target ${target} still exists after all removal attempts - cannot proceed with copy`);
            }
          }
          
          // Now copy
          log(`  Copying ${source} to ${target}...`);
          fs.cpSync(source, target, { recursive: true });
          log(`  ✓ Copied ${collectionName} collection: ${target} <- ${sourcePath}`);
          
          // Verify copy succeeded
          if (exists(target)) {
            const copiedFiles = fs.readdirSync(target);
            log(`  ✓ Copy verified: ${copiedFiles.length} items`);
          } else {
            throw new Error(`Copy reported success but target does not exist`);
          }
        } catch (copyErr) {
          error(`  Failed to copy as fallback: ${copyErr.message}`);
          error(`  Source: ${source}`);
          error(`  Target: ${target}`);
          // Don't throw - allow build to continue, but collection will be empty
        }
      }
    }
  };

  log('Setting up Content Collections symlinks...');
  
  // Map collections to Team-Guidebook directories
  // Note: News requires custom loader (handled separately in src/content/loaders/)
  // Use async/await to ensure proper sequencing
  await linkCollection('people', '通讯录');
  await linkCollection('projects', '图书馆/项目');
  
  // Library: We need to include 图书馆/** but exclude 项目/ and 文献/
  // Since Astro Content Collections doesn't support glob exclusions natively,
  // we create a symlink to the entire 图书馆 directory.
  // The exclusion will be handled at query time or via a custom loader.
  // Alternative: Create individual symlinks for each subdirectory (more complex)
  await linkCollection('library', '图书馆');
  
  // Publications: map to 图书馆/文献 (short-term, markdown-based)
  await linkCollection('publications', '图书馆/文献');
  
  // Note: News collection requires a custom loader to extract bullet items
  // from Daily Notes (档案馆/YYYY-MM-DD.md). This will be implemented
  // in src/content/loaders/news.ts and wired via config.ts loader option.
  
  log('Content Collections symlinks setup completed');
};

const main = async () => {
  const source = resolveSource();
  let contentRoot = null;

  if (source) {
    linkSource(source);
    contentRoot = dest; // .content points to source
    syncAttachments(contentRoot);
    await setupContentCollections(contentRoot);
    return;
  }

  if (repoUrl) {
    const cloned = cloneSource();
    if (cloned) {
      contentRoot = dest; // .content is the clone destination
      syncAttachments(contentRoot);
      await setupContentCollections(contentRoot);
      return;
    }
    // Clone failed, try fallback
    log(`Clone failed, attempting to use local fallback...`);
  }

  // Fallback: use local Team-Guidebook if it exists
  if (exists(fallback)) {
    log(`Using fallback content source: ${fallback}`);
    contentRoot = fallback;
    syncAttachments(contentRoot);
    await setupContentCollections(contentRoot);
    return;
  }

  error('No content source found. Provide CONTENT_DIR or CONTENT_REPO_URL, or place Team-Guidebook in project root.');
  process.exit(1);
};

main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});

