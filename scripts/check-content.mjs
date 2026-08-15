#!/usr/bin/env node
/**
 * Validate a content vault before it reaches a build.
 *
 * `npm run build` already rejects a note that breaks its Zod schema, and that
 * is the easy half. This script exists for the half the build says nothing
 * about: **cross-references between notes**.
 *
 * A research theme naming a `featured_publications` key that no .bib defines
 * builds cleanly and simply renders without that paper. Same for a project
 * listing a person who does not exist, or a resource citing a missing bib_key.
 * The page comes out looking finished and quietly missing something, which is
 * the worst failure mode a content maintainer can be handed — there is nothing
 * to notice.
 *
 * It also reports **vault-relative paths** (`通讯录/song-shuang.md`), where a
 * build error points at `src/content/people/song-shuang.md` — a symlink the
 * content author never sees and cannot act on.
 *
 * Read-only. Safe to run against a real vault at any time.
 *
 *   npm run check:content
 *   CONTENT_DIR=../Team-Guidebook npm run check:content
 */
import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import {
  findContentRoot,
  VAULT_DIRS,
  PUBLICATION_SIDECAR_DIR,
} from '../src/utils/contentLayout.js';
import { normalizeRole, ROLES } from '../src/utils/roles.ts';

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

// CONTENT_DIR is how the rest of the tooling is pointed at a vault; honour it
// here too rather than inventing a second convention.
const override = process.env.CONTENT_DIR;
const root = override ? path.resolve(override) : findContentRoot();
if (!root || !fs.existsSync(root)) {
  console.error(
    `Content root not found${override ? ` at ${override}` : ''}. Run npm run setup:content.`,
  );
  process.exit(2);
}

/** Read every .md under `dir`, keyed by vault-relative path. */
function readDir(dir, { translations = false } = {}) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fg
    .sync('**/*.md', { cwd: abs })
    .filter((f) => translations === /\.(zh|en)\.md$/.test(f))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(abs, f), 'utf-8'));
      return { file: path.join(dir, f), rel: f, data: data ?? {}, body: content };
    });
}

const people = readDir(VAULT_DIRS.people);
const projects = readDir(`${VAULT_DIRS.library}/项目`);
const research = readDir(`${VAULT_DIRS.library}/研究`);
const resources = readDir(`${VAULT_DIRS.library}/资源`);
const sidecars = readDir(`${VAULT_DIRS.library}/文献/${PUBLICATION_SIDECAR_DIR}`);

/** Frontmatter id, falling back to the filename, matching entrySlug's rule. */
const idOf = (e) => String(e.data.id ?? path.basename(e.rel, '.md')).trim();

const peopleIds = new Set(people.map(idOf));
const projectIds = new Set(projects.map(idOf));
const researchIds = new Set(research.map(idOf));

// Citation keys, straight out of the .bib files. Deliberately a plain scan and
// not citation-js: this must run without the build's dependencies resolving.
const bibKeys = new Set();
for (const dir of [`${VAULT_DIRS.library}/文献`, VAULT_DIRS.library]) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fg.sync('*.bib', { cwd: abs })) {
    const text = fs.readFileSync(path.join(abs, f), 'utf-8');
    for (const m of text.matchAll(/@\w+\s*\{([^,\s]+)\s*,/g)) bibKeys.add(m[1].trim());
  }
  if (bibKeys.size) break; // 文献/ wins, matching publicationsLoader's search order
}

/** Check one reference list against a known set. */
function checkRefs(entry, field, known, label) {
  const refs = entry.data[field];
  if (!Array.isArray(refs)) return;
  for (const ref of refs) {
    if (!known.has(String(ref).trim())) {
      err(entry.file, `${field}: "${ref}" matches no ${label} — it will be dropped silently`);
    }
  }
}

// ---- duplicate ids -------------------------------------------------------
for (const [label, list] of [
  ['people', people],
  ['projects', projects],
  ['research', research],
  ['resources', resources],
]) {
  const seen = new Map();
  for (const e of list) {
    const id = idOf(e);
    if (seen.has(id)) {
      err(e.file, `duplicate id "${id}" — also declared in ${seen.get(id)} (${label})`);
    } else seen.set(id, e.file);
  }
}

// ---- people --------------------------------------------------------------
for (const p of people) {
  if (!p.data.name) err(p.file, 'missing required field: name');
  if (!p.data.role) {
    err(p.file, 'missing required field: role');
  } else if (normalizeRole(p.data.role) === 'other' && String(p.data.role).trim()) {
    warn(
      p.file,
      `role "${p.data.role}" is not in the vocabulary — this person will appear under ` +
        `"其他成员 / Others". Use one of: ${ROLES.filter((r) => r !== 'other').join(', ')}`,
    );
  }
  if (p.data.status === 'alumni' && !p.data.destination) {
    warn(p.file, 'status: alumni without a destination — the alumni card will have no "now at"');
  }
}

// ---- cross-references ----------------------------------------------------
for (const e of projects) {
  if (!e.data.title) err(e.file, 'missing required field: title');
  if (!e.data.start_date) err(e.file, 'missing required field: start_date');
  checkRefs(e, 'people', peopleIds, 'person id in 通讯录/');
  checkRefs(e, 'research', researchIds, 'research theme id in 图书馆/研究/');
  if (e.data.bib_key && !bibKeys.has(String(e.data.bib_key).trim())) {
    err(e.file, `bib_key: "${e.data.bib_key}" matches no .bib entry`);
  }
}

for (const e of research) {
  if (!e.data.title) err(e.file, 'missing required field: title');
  checkRefs(e, 'people', peopleIds, 'person id in 通讯录/');
  checkRefs(e, 'projects', projectIds, 'project id in 图书馆/项目/');
  checkRefs(e, 'featured_publications', bibKeys, 'BibTeX citation key');
}

for (const e of resources) {
  if (!e.data.title) err(e.file, 'missing required field: title');
  if (!e.data.type) err(e.file, 'missing required field: type');
  if (!e.data.url) err(e.file, 'missing required field: url');
  checkRefs(e, 'people', peopleIds, 'person id in 通讯录/');
  if (e.data.bib_key && !bibKeys.has(String(e.data.bib_key).trim())) {
    err(e.file, `bib_key: "${e.data.bib_key}" matches no .bib entry`);
  }
}

for (const e of sidecars) {
  const key = String(e.data.bib_key ?? path.basename(e.rel, '.md')).trim();
  if (!bibKeys.has(key)) {
    err(e.file, `bib_key "${key}" matches no .bib entry — this highlight will never appear`);
  }
}

// ---- orphan translations -------------------------------------------------
for (const dir of [
  VAULT_DIRS.people,
  `${VAULT_DIRS.library}/项目`,
  `${VAULT_DIRS.library}/研究`,
  `${VAULT_DIRS.library}/资源`,
  VAULT_DIRS.library,
]) {
  for (const t of readDir(dir, { translations: true })) {
    const base = t.rel.replace(/\.(zh|en)\.md$/, '.md');
    if (!fs.existsSync(path.join(root, dir, base))) {
      err(t.file, `translation has no base note (${path.join(dir, base)}) — it renders nowhere`);
    }
    if (!t.data.lang) warn(t.file, 'translation is missing `lang:` in its frontmatter');
  }
}

// ---- site.md -------------------------------------------------------------
if (!fs.existsSync(path.join(root, 'site.md'))) {
  warn('site.md', 'absent — the site falls back to a generic name ("实验室" / "Lab")');
}

// ---- report --------------------------------------------------------------
const fmt = (list) => list.map(({ file, msg }) => `  ${file}\n      ${msg}`).join('\n');

console.log(`Checked ${root}`);
console.log(
  `  ${people.length} people · ${projects.length} projects · ${research.length} research · ` +
    `${resources.length} resources · ${bibKeys.size} publications · ${sidecars.length} sidecars\n`,
);

if (warnings.length)
  console.log(
    `Warnings (${warnings.length}) — the site builds, but check these:\n${fmt(warnings)}\n`,
  );
if (errors.length)
  console.log(
    `Errors (${errors.length}) — content will be missing from the site:\n${fmt(errors)}\n`,
  );

if (errors.length) {
  console.log('Nothing here fails `npm run build`. That is why this script exists.');
  process.exit(1);
}
console.log(warnings.length ? 'No errors.' : 'All good.');
