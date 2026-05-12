import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const repoRoot = process.cwd();
const manifestPath = join(repoRoot, 'data/gallery-manifest.json');
const publicGalleryDir = join(repoRoot, 'public/gallery/rotating');
const sourceDir = process.env.GALLERY_LOCAL_SOURCE_DIR || '/opt/already-here-gallery/source';
const rotationDays = Number(process.env.GALLERY_ROTATION_DAYS || '21');
const publishLimit = Number(process.env.GALLERY_PUBLISH_LIMIT || '6');
const gitBranch = process.env.GALLERY_GIT_BRANCH || 'main';
const gitRemote = process.env.GALLERY_GIT_REMOTE || 'origin';
const commitPrefix = process.env.GALLERY_COMMIT_PREFIX || 'rotate project gallery';
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const deniedNamePatterns = [/do[-_\s]?not[-_\s]?publish/i, /private/i, /credential/i, /badge/i, /license/i, /medical/i, /patient/i, /serial/i, /secret/i];

function nowIso() {
  return new Date().toISOString();
}

function readManifest() {
  if (!existsSync(manifestPath)) {
    return { schemaVersion: 1, source: 'oci-agent', generatedAt: null, rotationDays, images: [], audit: [] };
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function writeManifest(manifest) {
  mkdirSync(join(repoRoot, 'data'), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

function shouldRotate(manifest) {
  if (process.env.GALLERY_FORCE_ROTATION === 'true') return true;
  if (!manifest.generatedAt) return true;
  const last = new Date(manifest.generatedAt).getTime();
  if (!Number.isFinite(last)) return true;
  const ageMs = Date.now() - last;
  return ageMs >= rotationDays * 24 * 60 * 60 * 1000;
}

function listCandidateImages(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (deniedNamePatterns.some((pattern) => pattern.test(entry.name))) continue;
      out.push(...listCandidateImages(full));
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext)) continue;
    if (deniedNamePatterns.some((pattern) => pattern.test(entry.name))) continue;
    const stats = statSync(full);
    if (stats.size <= 0) continue;
    out.push({ path: full, name: entry.name, modifiedMs: stats.mtimeMs, size: stats.size, ext });
  }
  return out;
}

function safeSlug(value) {
  return value.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'project-photo';
}

function rotateSelection(candidates, manifest) {
  const previous = new Set((manifest.images || []).map((img) => img.originalName).filter(Boolean));
  const sorted = [...candidates].sort((a, b) => b.modifiedMs - a.modifiedMs);
  const fresh = sorted.filter((item) => !previous.has(item.name));
  const pool = [...fresh, ...sorted.filter((item) => previous.has(item.name))];
  return pool.slice(0, publishLimit);
}

function resetPublicGallery() {
  if (existsSync(publicGalleryDir)) rmSync(publicGalleryDir, { recursive: true, force: true });
  mkdirSync(publicGalleryDir, { recursive: true });
}

function copySelected(selected) {
  return selected.map((item, index) => {
    const filename = `${String(index + 1).padStart(2, '0')}-${safeSlug(item.name)}${item.ext}`;
    const destination = join(publicGalleryDir, filename);
    const bytes = readFileSync(item.path);
    writeFileSync(destination, bytes);
    return {
      id: `gallery-${index + 1}`,
      src: `/gallery/rotating/${filename}`,
      originalName: item.name,
      title: process.env.GALLERY_DEFAULT_TITLE || 'Field execution example',
      category: process.env.GALLERY_DEFAULT_CATEGORY || 'Project work',
      description: process.env.GALLERY_DEFAULT_DESCRIPTION || 'Approved project photo from the rotating gallery source.',
      redaction: 'Approved source folder; sensitive filenames and blocked patterns excluded.',
      updatedAt: nowIso()
    };
  });
}

function runGit(args, options = {}) {
  return execFileSync('git', args, { cwd: repoRoot, stdio: options.stdio || 'pipe', encoding: 'utf8' });
}

function commitIfChanged() {
  runGit(['checkout', gitBranch], { stdio: 'inherit' });
  runGit(['add', 'data/gallery-manifest.json', 'public/gallery/rotating'], { stdio: 'inherit' });
  const diff = runGit(['diff', '--cached', '--name-only']).trim();
  if (!diff) return false;
  runGit(['commit', '-m', `${commitPrefix} ${nowIso().slice(0, 10)}`], { stdio: 'inherit' });
  runGit(['push', gitRemote, gitBranch], { stdio: 'inherit' });
  return true;
}

function main() {
  const manifest = readManifest();
  if (!shouldRotate(manifest)) {
    console.log('Gallery rotation skipped; interval has not elapsed.');
    return;
  }

  const candidates = listCandidateImages(sourceDir);
  if (!candidates.length) {
    const next = {
      ...manifest,
      rotationDays,
      audit: [...(manifest.audit || []), { at: nowIso(), event: 'rotation_skipped', detail: `No approved images found in ${sourceDir}` }].slice(-50)
    };
    writeManifest(next);
    console.log('No candidate images found. Manifest audit updated.');
    commitIfChanged();
    return;
  }

  const selected = rotateSelection(candidates, manifest);
  resetPublicGallery();
  const images = copySelected(selected);
  const next = {
    schemaVersion: 1,
    source: 'oci-agent-local-approved-folder',
    generatedAt: nowIso(),
    rotationDays,
    sourceDir,
    images,
    audit: [...(manifest.audit || []), { at: nowIso(), event: 'rotation_complete', detail: `Published ${images.length} gallery images from ${candidates.length} candidates.` }].slice(-50)
  };
  writeManifest(next);
  const committed = commitIfChanged();
  console.log(committed ? 'Gallery rotation committed and pushed.' : 'Gallery rotation produced no git changes.');
}

main();
