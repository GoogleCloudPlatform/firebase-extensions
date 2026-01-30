/**
 * Script to compare published Firebase extension version with local extension.yaml version
 * Usage:
 *   node check-extension-version.js <extension-name>  - Check a specific extension
 *   node check-extension-version.js *                 - Check all extensions
 */

const fs = require('fs');
const path = require('path');

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
 * Makes an HTTPS GET request using curl as a fallback for SSL issues
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} Response body
 */
function httpsGet(url) {
  const {execSync} = require('child_process');

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
 * @param {string} extensionName - Name of the extension (e.g., 'firestore-genai-chatbot')
 * @returns {Promise<string>} Published version
 */
async function getPublishedVersion(extensionName) {
  try {
    console.log(`Fetching published version for ${extensionName}...`);

    // Fetch extension.yaml from GitHub main branch
    // These extensions are published from the GoogleCloudPlatform/firebase-extensions repo
    const githubRawUrl = `https://raw.githubusercontent.com/GoogleCloudPlatform/firebase-extensions/main/${extensionName}/extension.yaml`;

    const data = await httpsGet(githubRawUrl);

    // Parse the YAML content from the response
    const yaml = parseSimpleYaml(data);

    if (!yaml.version) {
      throw new Error('Version field not found in published extension.yaml');
    }

    return yaml.version;
  } catch (error) {
    const errorMessage = error.message || String(error);

    if (errorMessage.includes('HTTP 404')) {
      throw new Error(
        `Extension "${extensionName}" not found in the published repository.\n` +
          'Make sure the extension exists at:\n' +
          `https://github.com/GoogleCloudPlatform/firebase-extensions/tree/main/${extensionName}`
      );
    }

    throw new Error(`Failed to fetch published version: ${errorMessage}`);
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
 * Gets all extension directories in the repository
 * @returns {string[]} Array of extension directory names
 */
function getAllExtensions() {
  const rootDir = path.join(__dirname, '..');
  const items = fs.readdirSync(rootDir, {withFileTypes: true});

  const extensions = [];

  for (const item of items) {
    if (!item.isDirectory()) {
      continue;
    }

    const extensionYamlPath = path.join(rootDir, item.name, 'extension.yaml');
    if (fs.existsSync(extensionYamlPath)) {
      extensions.push(item.name);
    }
  }

  return extensions.sort();
}

/**
 * Checks a single extension and returns the result
 * @param {string} extensionName - Name of the extension
 * @returns {Promise<object>} Result object with status and version info
 */
async function checkExtension(extensionName) {
  try {
    const localVersion = getLocalVersion(extensionName);

    let publishedVersion;
    let publishedError = null;

    try {
      publishedVersion = await getPublishedVersion(extensionName);
    } catch (error) {
      publishedError = error.message || String(error);
      publishedVersion = null;
    }

    return {
      name: extensionName,
      localVersion,
      publishedVersion,
      publishedError,
      match: publishedVersion === localVersion,
    };
  } catch (error) {
    return {
      name: extensionName,
      error: error.message || String(error),
    };
  }
}

/**
 * Checks all extensions and displays a summary
 * @returns {Promise<number>} Exit code
 */
async function checkAllExtensions() {
  const extensions = getAllExtensions();

  if (extensions.length === 0) {
    console.log('No extensions found in the repository.');
    return 0;
  }

  console.log(
    `\nFound ${extensions.length} extension(s). Checking versions...\n`
  );

  const results = [];

  for (const extensionName of extensions) {
    process.stdout.write(`Checking ${extensionName}... `);
    const result = await checkExtension(extensionName);
    results.push(result);

    if (result.error) {
      console.log('✗ Error');
    } else if (result.publishedError) {
      console.log('⚠ Not published');
    } else if (result.match) {
      console.log('✓ Match');
    } else {
      console.log('⚠ Mismatch');
    }
  }

  // Display summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const matching = [];
  const mismatched = [];
  const notPublished = [];
  const errors = [];

  for (const result of results) {
    if (result.error) {
      errors.push(result);
    } else if (result.publishedError) {
      notPublished.push(result);
    } else if (result.match) {
      matching.push(result);
    } else {
      mismatched.push(result);
    }
  }

  if (matching.length > 0) {
    console.log(`\n✓ Matching (${matching.length}):`);
    for (const result of matching) {
      console.log(`  ${result.name.padEnd(50)} ${result.localVersion}`);
    }
  }

  if (mismatched.length > 0) {
    console.log(`\n⚠ Mismatched (${mismatched.length}):`);
    for (const result of mismatched) {
      console.log(
        `  ${result.name.padEnd(50)} Local: ${
          result.localVersion
        } | Published: ${result.publishedVersion}`
      );
    }
  }

  if (notPublished.length > 0) {
    console.log(`\n⚠ Not Published (${notPublished.length}):`);
    for (const result of notPublished) {
      console.log(`  ${result.name.padEnd(50)} ${result.localVersion}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n✗ Errors (${errors.length}):`);
    for (const result of errors) {
      console.log(`  ${result.name.padEnd(50)} ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(
    `Total: ${results.length} | Matching: ${matching.length} | Mismatched: ${mismatched.length} | Not Published: ${notPublished.length} | Errors: ${errors.length}`
  );
  console.log('='.repeat(80) + '\n');

  // Return non-zero exit code if there are mismatches or errors
  return mismatched.length > 0 || errors.length > 0 ? 1 : 0;
}

/**
 * Main function
 */
async function main() {
  // Get extension name from command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: Extension name is required');
    console.error('Usage: node check-extension-version.js <extension-name|*>');
    console.error(
      'Example: node check-extension-version.js firestore-genai-chatbot'
    );
    console.error(
      'Example: node check-extension-version.js * (check all extensions)'
    );
    throw new Error('Extension name is required');
  }

  const extensionName = args[0];

  // Check if user wants to check all extensions
  if (extensionName === '*') {
    return await checkAllExtensions();
  }

  console.log(`\nChecking version for extension: ${extensionName}\n`);

  // Get local version
  const localVersion = getLocalVersion(extensionName);
  console.log(`✓ Local version (extension.yaml):  ${localVersion}`);

  // Get published version
  const publishedVersion = await getPublishedVersion(extensionName);
  console.log(`✓ Published version (registry):    ${publishedVersion}`);

  // Compare versions
  console.log('\n' + '='.repeat(50));
  if (localVersion === publishedVersion) {
    console.log('✓ Versions match! Extension is up to date.');
    console.log('='.repeat(50) + '\n');
    return 0;
  } else {
    console.log('⚠ Version mismatch detected!');
    console.log(`  Local:     ${localVersion}`);
    console.log(`  Published: ${publishedVersion}`);
    console.log('='.repeat(50) + '\n');
    throw new Error('Version mismatch detected');
  }
}

// Run the script
main()
  .then(exitCode => {
    process.exitCode = exitCode || 0;
  })
  .catch(error => {
    if (
      error.message !== 'Extension name is required' &&
      error.message !== 'Version mismatch detected'
    ) {
      console.error(`\n✗ Error: ${error.message}\n`);
    }
    process.exitCode = 1;
  });
