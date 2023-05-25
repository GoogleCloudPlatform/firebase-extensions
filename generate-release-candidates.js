const {exec} = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

// get all CHANGELOG.md files that have been modified

function main() {
  // get all CHANGELOG.md files that have been modified
  exec(
    'git diff --name-only --diff-filter=AM origin/next origin/main | grep CHANGELOG.md',
    (err, stdout, stderr) => {
      const extensionNames = stdout.split('\n').map(line => {
        return line.split('/')[0];
      });

      console.log('Creating release candidates for ' + extensionNames);

      const createReleaseCandidate = extensionName => {
        const command = `y | firebase ext:dev:upload ${process.env.RC_PUBLISHER}/${extensionName} --repo=${process.env.RC_REPO} --root=${extensionName} --ref=next --project ${process.env.RC_PROJECT} -s rc`;

        console.log(command);
        exec(command, (err, stdout, stderr) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log(stdout);
        });
      };

      createReleaseCandidate(extensionNames[0]);
    //   extensionNames.forEach(createReleaseCandidate);
    }
  );
}

main();
