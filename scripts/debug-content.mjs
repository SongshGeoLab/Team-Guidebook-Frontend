#!/usr/bin/env node
/**
 * Debug script to check content setup and collections.
 * Run this to diagnose content loading issues.
 */

import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const contentDir = path.resolve(cwd, '.content');
const srcContentDir = path.resolve(cwd, 'src', 'content');

const log = (msg) => console.log(`[debug] ${msg}`);
const error = (msg) => console.error(`[debug] ERROR: ${msg}`);

log('=== Content Setup Debug ===\n');

// Check .content directory
log('1. Checking .content directory:');
if (fs.existsSync(contentDir)) {
  const stat = fs.lstatSync(contentDir);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(contentDir);
    log(`   ✓ .content is a symlink -> ${target}`);
  } else if (stat.isDirectory()) {
    log(`   ✓ .content is a directory`);
  } else {
    error(`   ✗ .content exists but is not a directory or symlink`);
  }
  
  // Check Team-Guidebook structure
  const teamGuidebook = path.join(contentDir, 'Team-Guidebook');
  const hasDirectStructure = fs.existsSync(path.join(contentDir, '通讯录')) || 
                             fs.existsSync(path.join(contentDir, '图书馆'));
  
  if (fs.existsSync(teamGuidebook)) {
    log(`   ✓ Found Team-Guidebook subdirectory`);
    log(`   Path: ${teamGuidebook}`);
  } else if (hasDirectStructure) {
    log(`   ✓ Content is directly in .content (Team-Guidebook structure)`);
    log(`   Path: ${contentDir}`);
  } else {
    error(`   ✗ No Team-Guidebook structure found`);
  }
} else {
  error(`   ✗ .content directory does not exist`);
}

log('');

// Check Content Collections symlinks
log('2. Checking Content Collections symlinks:');
const collections = ['people', 'projects', 'library', 'publications'];

for (const collection of collections) {
  const collectionPath = path.join(srcContentDir, collection);
  if (fs.existsSync(collectionPath)) {
    const stat = fs.lstatSync(collectionPath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(collectionPath);
      log(`   ✓ ${collection} -> ${target}`);
      
      // Check if target exists
      const resolvedTarget = path.isAbsolute(target) ? target : path.resolve(path.dirname(collectionPath), target);
      if (fs.existsSync(resolvedTarget)) {
        const files = fs.readdirSync(resolvedTarget);
        log(`     Files: ${files.length} items`);
        if (files.length > 0 && files.length <= 5) {
          log(`     Sample: ${files.slice(0, 3).join(', ')}`);
        }
      } else {
        error(`     ✗ Target does not exist: ${resolvedTarget}`);
      }
    } else if (stat.isDirectory()) {
      log(`   ⚠ ${collection} is a directory (should be symlink)`);
    } else {
      error(`   ✗ ${collection} exists but is not a symlink or directory`);
    }
  } else {
    error(`   ✗ ${collection} symlink does not exist`);
  }
}

log('');

// Check actual content files
log('3. Checking content files:');
const contentRoot = (() => {
  const teamGuidebook = path.join(contentDir, 'Team-Guidebook');
  if (fs.existsSync(teamGuidebook)) return teamGuidebook;
  if (fs.existsSync(path.join(contentDir, '通讯录'))) return contentDir;
  return null;
})();

if (contentRoot) {
  log(`   Content root: ${contentRoot}`);
  
  // Check people
  const peopleDir = path.join(contentRoot, '通讯录');
  if (fs.existsSync(peopleDir)) {
    const files = fs.readdirSync(peopleDir).filter(f => f.endsWith('.md'));
    log(`   People: ${files.length} files`);
    if (files.length > 0) {
      log(`     Sample: ${files.slice(0, 3).join(', ')}`);
    }
  } else {
    error(`   ✗ 通讯录 directory not found`);
  }
  
  // Check projects
  const projectsDir = path.join(contentRoot, '图书馆', '项目');
  if (fs.existsSync(projectsDir)) {
    const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.md'));
    log(`   Projects: ${files.length} files`);
    if (files.length > 0) {
      log(`     Sample: ${files.slice(0, 3).join(', ')}`);
    }
  } else {
    error(`   ✗ 图书馆/项目 directory not found`);
  }
  
  // Check library
  const libraryDir = path.join(contentRoot, '图书馆');
  if (fs.existsSync(libraryDir)) {
    const files = fs.readdirSync(libraryDir).filter(f => f.endsWith('.md'));
    log(`   Library (root): ${files.length} files`);
  } else {
    error(`   ✗ 图书馆 directory not found`);
  }
  
  // Check news (daily notes)
  const newsDir = path.join(contentRoot, '档案馆');
  if (fs.existsSync(newsDir)) {
    const files = fs.readdirSync(newsDir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
    log(`   News (daily notes): ${files.length} files`);
    if (files.length > 0) {
      log(`     Sample: ${files.slice(0, 3).join(', ')}`);
    }
  } else {
    error(`   ✗ 档案馆 directory not found`);
  }
} else {
  error(`   ✗ Could not determine content root`);
}

log('');
log('=== Debug Complete ===');

