/**
 * Script to compare published Firebase extension version with local extension.yaml version
 * Usage: node check-extension-version.js <extension-name>
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
  const extensionDir = path.join(__dirname, extensionName);
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
 * Main function
 */
async function main() {
  // Get extension name from command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: Extension name is required');
    console.error('Usage: node check-extension-version.js <extension-name>');
    console.error(
      'Example: node check-extension-version.js firestore-genai-chatbot'
    );
    throw new Error('Extension name is required');
  }

  const extensionName = args[0];

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
