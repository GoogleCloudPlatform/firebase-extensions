/**
 * Script to publish RC versions of extensions that have version bumps vs main.
 *
 * Usage:
 *   node scripts/publish-rc.js [extension-name]   - Publish RCs for all bumped extensions, or a specific one
 *   node scripts/publish-rc.js --dry-run           - Preview without publishing
 *   node scripts/publish-rc.js --yes               - Skip confirmation prompt
 *
 * Requirements:
 *   - Firebase CLI installed and authenticated
 *   - Current branch must be pushed to GitHub (Firebase CLI pulls source from remote)
 *   - Must not be on main
 */

'use strict';

const {execSync, spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const REPO_URL =
  'https://github.com/googlecloudplatform/firebase-extensions';
const PROJECT = 'pub-ext-gcloud';
const ROOT_DIR = path.join(__dirname, '..');

/**
 * Parses top-level key-value pairs from a YAML string.
 * @param {string} content
 * @returns {Record<string, string>}
 */
function parseSimpleYaml(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([a-zA-Z_]\w*):\s*(.+)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      value.startsWith('[') ||
      value.startsWith('{') ||
      value.startsWith('>-') ||
      value.startsWith('|-')
    ) {
      continue;
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Strip inline YAML comments (e.g. "1.0.0 # some note")
    const commentIdx = value.indexOf(' #');
    if (commentIdx !== -1) value = value.slice(0, commentIdx).trim();
    result[match[1]] = value;
  }
  return result;
}

/**
 * Returns all extension directory names (those containing extension.yaml).
 * @returns {string[]}
 */
function getAllExtensions() {
  return fs
    .readdirSync(ROOT_DIR, {withFileTypes: true})
    .filter(
      item =>
        item.isDirectory() &&
        fs.existsSync(path.join(ROOT_DIR, item.name, 'extension.yaml'))
    )
    .map(item => item.name)
    .sort();
}

/**
 * Gets the version from a local extension.yaml.
 * @param {string} extName
 * @returns {string}
 */
function getLocalVersion(extName) {
  const content = fs.readFileSync(
    path.join(ROOT_DIR, extName, 'extension.yaml'),
    'utf8'
  );
  const yaml = parseSimpleYaml(content);
  if (!yaml.version) throw new Error(`No version found in ${extName}/extension.yaml`);
  return yaml.version;
}

/**
 * Gets the version from main branch via git show.
 * Returns null if the file doesn't exist on main.
 * @param {string} extName
 * @returns {string | null}
 */
function getMainVersion(extName) {
  try {
    const content = execSync(
      `git show main:${extName}/extension.yaml`,
      {cwd: ROOT_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']}
    );
    const yaml = parseSimpleYaml(content);
    return yaml.version || null;
  } catch {
    return null; // extension doesn't exist on main yet
  }
}

/**
 * Returns the current git branch name.
 * @returns {string}
 */
function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  }).trim();
}

/**
 * Checks whether the Firebase CLI is available.
 * @returns {boolean}
 */
function hasFirebaseCli() {
  try {
    execSync('firebase --version', {stdio: 'pipe'});
    return true;
  } catch {
    return false;
  }
}

/**
 * Prompts the user for a yes/no answer.
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(`${question} [y/N] `, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const autoYes = args.includes('--yes') || args.includes('-y');
  const targetExt = args.find(a => !a.startsWith('-')) || null;

  // Validate environment
  const branch = getCurrentBranch();
  if (branch === 'main') {
    console.error('✗ Error: Cannot publish RC from main. Switch to a feature branch first.');
    process.exit(1);
  }

  if (!dryRun && !hasFirebaseCli()) {
    console.error('✗ Error: Firebase CLI not found. Install with: npm install -g firebase-tools');
    process.exit(1);
  }

  // Collect extensions to check
  const extensions = targetExt ? [targetExt] : getAllExtensions();

  if (targetExt && !fs.existsSync(path.join(ROOT_DIR, targetExt, 'extension.yaml'))) {
    console.error(`✗ Error: "${targetExt}" is not a valid extension directory.`);
    process.exit(1);
  }

  console.log(`\nBranch: ${branch}`);
  console.log('Scanning for version bumps vs main...\n');

  // Find bumped extensions
  const bumped = [];
  for (const ext of extensions) {
    const branchVersion = getLocalVersion(ext);
    const mainVersion = getMainVersion(ext);

    if (mainVersion === null) {
      // New extension not on main yet
      bumped.push({ext, branchVersion, mainVersion: '(new)', isNew: true});
    } else if (branchVersion !== mainVersion) {
      bumped.push({ext, branchVersion, mainVersion, isNew: false});
    }
  }

  if (bumped.length === 0) {
    console.log('No version bumps detected vs main. Nothing to publish.');
    return;
  }

  // Print summary table
  console.log('Extensions to publish as RC:\n');
  const nameW = Math.max(...bumped.map(b => b.ext.length), 10);
  console.log(
    `  ${'Extension'.padEnd(nameW)}  ${'main'.padEnd(12)}  branch`
  );
  console.log(`  ${'-'.repeat(nameW)}  ${'-'.repeat(12)}  ------`);
  for (const {ext, branchVersion, mainVersion} of bumped) {
    console.log(
      `  ${ext.padEnd(nameW)}  ${String(mainVersion).padEnd(12)}  ${branchVersion}`
    );
  }
  console.log();

  // Build commands
  const commands = bumped.map(({ext}) =>
    [
      'firebase ext:dev:upload',
      `googlecloud/${ext}`,
      `--repo=${REPO_URL}`,
      `--root=${ext}`,
      `--ref=${branch}`,
      '--stage=rc',
      `--project=${PROJECT}`,
      '--force',
    ].join(' ')
  );

  if (dryRun) {
    console.log('Dry run — commands that would be executed:\n');
    for (const cmd of commands) {
      console.log(`  ${cmd}`);
    }
    console.log();
    return;
  }

  // Confirm
  if (!autoYes) {
    const ok = await confirm(
      `Publish ${bumped.length} RC(s) from branch "${branch}"?`
    );
    if (!ok) {
      console.log('Aborted.');
      return;
    }
  }

  console.log();

  // Publish
  let failed = 0;
  for (const {ext} of bumped) {
    console.log(`Publishing RC for ${ext}...`);
    const result = spawnSync(
      'firebase',
      [
        'ext:dev:upload',
        `googlecloud/${ext}`,
        `--repo=${REPO_URL}`,
        `--root=${ext}`,
        `--ref=${branch}`,
        '--stage=rc',
        `--project=${PROJECT}`,
        '--force',
      ],
      {cwd: ROOT_DIR, stdio: 'inherit'}
    );

    if (result.status !== 0) {
      console.error(`✗ Failed to publish RC for ${ext}`);
      failed++;
    } else {
      console.log(`✓ Published RC for ${ext}\n`);
    }
  }

  if (failed > 0) {
    console.error(`\n✗ ${failed} extension(s) failed to publish.`);
    process.exit(1);
  } else {
    console.log(`\n✓ All ${bumped.length} RC(s) published successfully.`);
  }
}

main().catch(err => {
  console.error(`\n✗ Unexpected error: ${err.message}`);
  process.exit(1);
});
