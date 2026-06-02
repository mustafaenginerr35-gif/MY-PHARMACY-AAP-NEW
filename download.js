import https from 'https';
import fs from 'fs';
import { URL } from 'url';

function downloadFile(fileUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(fileUrl);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };

    https.get(fileUrl, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        console.log(`Redirecting to: ${response.headers.location}`);
        downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${fileUrl}' (${response.statusCode})`));
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log('Download completed:', outputPath);
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Delete file on error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

const repoUrl = 'https://github.com/mustafaenginerr35-gif/MY-PHARMACY-AAP-NEW/archive/refs/heads/main.zip';
downloadFile(repoUrl, 'repo.zip')
  .then(() => {
    console.log('Zip file downloaded successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Download failed:', err);
    process.exit(1);
  });
