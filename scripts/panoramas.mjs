#!/usr/bin/env node
/**
 * Converts equirectangular 360° renders into the AVIF files the site uses.
 *
 *   bun run panoramas ~/Downloads/360_viz_Byt1_den.png ~/Downloads/360_viz_Byt3_noc.png
 *
 * File names follow the designers' convention, 360_viz_Byt<N>_<den|noc>.<ext>,
 * and land in src/assets/images/units/1039-<N>/pano-<den|noc>.avif, scaled to
 * at most 1000 px tall (2:1, so 2000 × 1000) to keep the page light.
 */
import { mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MAX_HEIGHT = 1000;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2);

if (!files.length) {
  console.error('Usage: bun run panoramas <360_viz_Byt<N>_<den|noc>.png> [...]');
  process.exit(1);
}

for (const file of files) {
  const match = /Byt(\d+)_(den|noc)/i.exec(basename(file));
  if (!match) {
    console.error(`Skipping ${file}: expected a name like 360_viz_Byt1_den.png`);
    process.exitCode = 1;
    continue;
  }
  const [, unit, time] = match;
  const outDir = join(root, 'src/assets/images/units', `1039-${unit}`);
  const out = join(outDir, `pano-${time.toLowerCase()}.avif`);
  mkdirSync(outDir, { recursive: true });

  const info = await sharp(file, { limitInputPixels: false })
    .resize({ height: MAX_HEIGHT, withoutEnlargement: true })
    .avif({ quality: 60, effort: 7 })
    .toFile(out);
  console.log(`${basename(file)} -> ${out.replace(root + '/', '')} (${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB)`);
}
