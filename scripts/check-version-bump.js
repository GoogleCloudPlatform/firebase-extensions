/**
 * Script to check that extension versions have been bumped correctly in a PR
 * Usage: node check-version-bump.js <extension-name1> [extension-name2] ...
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

/**
 * Parses YAML file (simple parser for extension.yaml structure)
 * @param {string} content - YAML content as string
 * @returns {object} Parsed YAML content with key fields
 */
function parseSimpleYaml(content) {
  const lines = content.split('\n');
  const result = {};

  for (const line of lines) {
    // Match key-value pairs at the start of lines (no indentation for top-level keys)
    const match = line.match(/^([a-zA-Z_]\w*):\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();

      // Skip if value is empty or starts with special YAML characters (arrays, objects, etc.)
      if (
        !value ||
        value.startsWith('[') ||
        value.startsWith('{') ||
        value.startsWith('>-') ||
        value.startsWith('|-')
      ) {
        continue;
      }

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  }

  return result;
}

/**
 * Makes an HTTPS GET request using curl
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} Response body
 */
function httpsGet(url) {
  try {
    // Use curl which handles SSL certificates better
    const result = execSync(`curl -sS -L "${url}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Check if result looks like an error page or is empty
    if (!result || result.trim().length === 0) {
      throw new Error('Empty response');
    }

    // Check for 404 error in HTML response
    if (result.includes('404: Not Found') || result.includes('404 Not Found')) {
      throw new Error('HTTP 404: Not Found');
    }

    return Promise.resolve(result);
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : '';
    const message = error.message || String(error);

    if (
      stderr.includes('404') ||
      message.includes('404') ||
      stderr.includes('Not Found')
    ) {
      return Promise.reject(new Error('HTTP 404: Not Found'));
    }

    return Promise.reject(error);
  }
}

/**
 * Fetches the published version of a Firebase extension from GitHub
 * @param {string} extensionName - Name of the extension
 * @returns {Promise<string|null>} Published version or null if not published yet
 */
async function getPublishedVersion(extensionName) {
  try {
    // Fetch extension.yaml from GitHub main branch
    const githubRawUrl = `https://raw.githubusercontent.com/GoogleCloudPlatform/firebase-extensions/main/${extensionName}/extension.yaml`;

    const data = await httpsGet(githubRawUrl);

    // Parse the YAML content from the response
    const yaml = parseSimpleYaml(data);

    if (!yaml.version) {
      return null;
    }

    return yaml.version;
  } catch (error) {
    const errorMessage = error.message || String(error);

    // If extension doesn't exist in published repo, it might be a new extension
    if (errorMessage.includes('HTTP 404')) {
      return null;
    }

    throw error;
  }
}

/**
 * Gets the local version from extension.yaml
 * @param {string} extensionName - Name of the extension directory
 * @returns {string} Local version
 */
function getLocalVersion(extensionName) {
  const extensionDir = path.join(__dirname, '..', extensionName);
  const yamlPath = path.join(extensionDir, 'extension.yaml');

  // Check if extension directory exists
  if (!fs.existsSync(extensionDir)) {
    throw new Error(
      `Extension directory "${extensionName}" does not exist in this repository`
    );
  }

  // Check if extension.yaml exists
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`extension.yaml not found in "${extensionName}" directory`);
  }

  // Read the file content
  const content = fs.readFileSync(yamlPath, 'utf8');
  const yaml = parseSimpleYaml(content);

  if (!yaml.version) {
    throw new Error(`Version field not found in ${yamlPath}`);
  }

  return yaml.version;
}

/**
 * Parses a semantic version string into components
 * @param {string} version - Version string (e.g., "1.2.3")
 * @returns {object} Version components {major, minor, patch, prerelease}
 */
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);

  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

/**
 * Compares two semantic versions
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(version1, version2) {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  // Compare major version
  if (v1.major !== v2.major) {
    return v1.major > v2.major ? 1 : -1;
  }

  // Compare minor version
  if (v1.minor !== v2.minor) {
    return v1.minor > v2.minor ? 1 : -1;
  }

  // Compare patch version
  if (v1.patch !== v2.patch) {
    return v1.patch > v2.patch ? 1 : -1;
  }

  // Compare prerelease versions
  if (v1.prerelease === null && v2.prerelease === null) {
    return 0;
  }

  // Release versions are greater than prerelease versions
  if (v1.prerelease === null) {
    return 1;
  }
  if (v2.prerelease === null) {
    return -1;
  }

  // Compare prerelease strings lexicographically
  if (v1.prerelease < v2.prerelease) {
    return -1;
  }
  if (v1.prerelease > v2.prerelease) {
    return 1;
  }

  return 0;
}

/**
 * Checks version bump for a single extension
 * @param {string} extensionName - Name of the extension
 * @returns {Promise<object>} Result object with status and message
 */
async function checkExtension(extensionName) {
  try {
    const localVersion = getLocalVersion(extensionName);
    const publishedVersion = await getPublishedVersion(extensionName);

    // If extension doesn't exist in published repo, it's a new extension
    if (publishedVersion === null) {
      return {
        extension: extensionName,
        status: 'new',
        localVersion,
        publishedVersion: 'N/A',
        message: 'New extension - no version check required',
      };
    }

    // Compare versions
    const comparison = compareVersions(localVersion, publishedVersion);

    if (comparison > 0) {
      return {
        extension: extensionName,
        status: 'pass',
        localVersion,
        publishedVersion,
        message: 'Version correctly bumped',
      };
    } else if (comparison === 0) {
      return {
        extension: extensionName,
        status: 'fail',
        localVersion,
        publishedVersion,
        message:
          'Version not bumped - local and published versions are the same',
      };
    } else {
      return {
        extension: extensionName,
        status: 'fail',
        localVersion,
        publishedVersion,
        message: 'Local version is LOWER than published version',
      };
    }
  } catch (error) {
    return {
      extension: extensionName,
      status: 'error',
      localVersion: 'N/A',
      publishedVersion: 'N/A',
      message: error.message,
    };
  }
}

/**
 * Main function
 */
async function main() {
  // Get extension names from command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: At least one extension name is required');
    console.error(
      'Usage: node check-version-bump.js <extension-name1> [extension-name2] ...'
    );
    console.error(
      'Example: node check-version-bump.js firestore-genai-chatbot firestore-semantic-search'
    );
    throw new Error('At least one extension name is required');
  }

  console.log('🔍 Checking extension version bumps...\n');

  const results = [];

  // Check each extension
  for (const extensionName of args) {
    console.log(`Checking ${extensionName}...`);
    const result = await checkExtension(extensionName);
    results.push(result);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  let hasFailures = false;

  for (const result of results) {
    const statusIcon =
      result.status === 'pass'
        ? '✅'
        : result.status === 'new'
        ? '🆕'
        : result.status === 'error'
        ? '❌'
        : '❌';

    console.log(`${statusIcon} ${result.extension}`);
    console.log(`   Local:     ${result.localVersion}`);
    console.log(`   Published: ${result.publishedVersion}`);
    console.log(`   Status:    ${result.message}`);
    console.log('');

    if (result.status === 'fail' || result.status === 'error') {
      hasFailures = true;
    }
  }

  console.log('='.repeat(80));

  if (hasFailures) {
    console.log('\n❌ Version check FAILED');
    console.log('\nPlease ensure that:');
    console.log(
      '1. All modified extensions have their version bumped in extension.yaml'
    );
    console.log(
      '2. The new version is semantically higher than the published version'
    );
    console.log(
      '3. Version follows semantic versioning format (MAJOR.MINOR.PATCH)'
    );
    console.log('');
    throw new Error('Version check failed');
  } else {
    console.log('\n✅ All version checks PASSED');
    console.log('');
  }
}

// Run the script
main().catch(err => {
  // Print any unhandled errors and fail loudly for CI/CD, breaking for the linter
  console.error(err && err.stack ? err.stack : err);
  // Don't use process.exit(); this ensures a non-zero exit code via uncaught errors.
  throw err;
});
