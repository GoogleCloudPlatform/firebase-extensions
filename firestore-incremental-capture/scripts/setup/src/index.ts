import {program} from 'commander';
// import chalk from 'chalk';
import {exec} from 'child_process';
import {chmod} from 'fs';

program
  .option('-p, --project <project>', 'Project ID')
  .option('-d, --database <database>', 'Database ID')
  .option('-l, --location <location>', 'Location')
  .option('-dl --databaseLocation <databaseLocation>', 'Database location')
  .option('-e, --extInstanceId <extInstanceId>', 'Extension instance ID')
  //   .option('-j, --jarPath <jarPath>', 'Path to the JAR file')
  .parse(process.argv);

const jarPath = 'restore-firestore.jar';

const {
  project: projectId,
  database: databaseId,
  location: location,
  databaseLocation: databaseLocation,
  extInstanceId,
} = program.opts();

process.env.PROJECT_ID = projectId;
process.env.DATABASE_ID = databaseId;
process.env.DATABASE_LOCATION = databaseLocation;
process.env.LOCATION = location;
process.env.EXT_INSTANCE_ID = extInstanceId;
process.env.JAR_PATH = jarPath;

// export RED='\033[0;31m'
// export GREEN='\033[0;32m'
// export YELLOW='\033[1;33m'
// export NC='\033[0m'
// export TICK="✓"

process.env.RED = '\\033[0;31m';
process.env.GREEN = '\\033[0;32m';
process.env.YELLOW = '\\033[1;33m';
process.env.NC = '\\033[0m';
process.env.TICK = '✓';

const cwd = __dirname;

console.log('cwd', __dirname);

const scripts = cwd + '/bash';

// Require dependent scripts
const downloadRestoreFirestoreScript =
  scripts + '/download_restore_firestore.sh';

const enablePitrScript = scripts + '/enable_pitr.sh';

const setupFirestoreScript = scripts + '/setup_firestore.sh';

const setupArtifactRegistryScript = scripts + '/setup_artifact_registry.sh';

const setupServiceAccountScript = scripts + '/setup_service_account.sh';

const buildDataflowTemplateScript = scripts + '/build_dataflow_template.sh';

[
  downloadRestoreFirestoreScript,
  enablePitrScript,
  setupFirestoreScript,
  setupArtifactRegistryScript,
  setupServiceAccountScript,
  buildDataflowTemplateScript,
].forEach(filePath => {
  chmod(filePath, 0o755, () => {});
  exec(filePath, (error, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    if (error !== null) {
      console.log(`exec error: ${error}`);
    }
  });
});
