const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');
const util = require('util');
const pipeline = util.promisify(require('stream').pipeline);

// Creates a client
const storage = new Storage(); //replace with your path to service account json

async function downloadFiles(bucketName, prefix) {
  const options = {
    prefix: prefix,
  };

  async function downloadFile(srcFilename, destFilename) {
    const options = {
      destination: destFilename,
    };

    // Downloads the file
    await storage.bucket(bucketName).file(srcFilename).download(options);
    console.log(`File ${srcFilename} downloaded.`);
  }

  const [files] = await storage.bucket(bucketName).getFiles(options);
  
  files.forEach(file => {
    let localFilePath = path.join('staging', file.name);
    let localFileDirectory = path.dirname(localFilePath);

    // create directory if not exists
    if (!fs.existsSync(localFileDirectory)){
        fs.mkdirSync(localFileDirectory, { recursive: true });
    }
    
    downloadFile(file.name, localFilePath);
  });
}

function sleep(sec) {
  return new Promise(resolve => setTimeout(resolve, sec));
}

function uploadDir(bucketName, directoryPath,destinationDir) {

  fs.readdirSync(directoryPath).forEach(file => {
    sleep(1000).then(() => {

      const fullPath = path.join(directoryPath, file);
      const stat = fs.lstatSync(fullPath);
      if (stat.isFile()) {
        storage.bucket(bucketName).upload(fullPath, {destination: destinationDir + '/' + file})
        .then(() => console.log(`${fullPath} uploaded to ${bucketName}/${destinationDir}/${file}`))
        .catch(err => console.error('ERROR:', err));
      }
    })
  });
}

const directoryPath = './staging/staging' // specify the directory to upload
const bucketName = 'gs://invertase--palm-demo.appspot.com'
uploadDir(bucketName, directoryPath, 'staging')