import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Install adm-zip dynamically if not present
try {
  require.resolve('adm-zip');
} catch (e) {
  console.log('Installing adm-zip...');
  execSync('npm install adm-zip', { stdio: 'inherit' });
}

import AdmZip from 'adm-zip';

const zipFile = 'repo.zip';
const targetDir = './';

try {
  console.log('Extracting zip...');
  const zip = new AdmZip(zipFile);
  zip.extractAllTo(targetDir, true);
  console.log('Extraction complete.');

  // Find the extracted root folder (usually repo name + branch name, e.g. MY-PHARMACY-AAP-NEW-main)
  const files = fs.readdirSync(targetDir);
  const extractedFolderName = files.find(f => f.startsWith('MY-PHARMACY-AAP-NEW-'));

  if (extractedFolderName) {
    const extractedFolderPath = path.join(targetDir, extractedFolderName);
    console.log(`Moving files from ${extractedFolderPath} to ${targetDir}...`);
    
    const subfiles = fs.readdirSync(extractedFolderPath);
    for (const subfile of subfiles) {
      const srcPath = path.join(extractedFolderPath, subfile);
      const destPath = path.join(targetDir, subfile);

      // Overwrite if exists
      if (fs.existsSync(destPath)) {
        // If directory, remove recursively
        const stat = fs.statSync(destPath);
        if (stat.isDirectory()) {
          fs.rmSync(destPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(destPath);
        }
      }
      fs.renameSync(srcPath, destPath);
    }

    // Remove empty nested folder and zip file
    fs.rmSync(extractedFolderPath, { recursive: true, force: true });
    fs.unlinkSync(zipFile);
    console.log('Organizing files completed successfully.');
  } else {
    console.log('No nested directory found, files extracted directly.');
  }
} catch (err) {
  console.error('Extraction failed:', err);
  process.exit(1);
}
