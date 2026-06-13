import fs from 'fs';
import path from 'path';

const sourceDir = './';
const backupDir = './_checkpoint_PreChange_2026_06_02_10_04_UTC';

const excludeList = ['node_modules', '.git', 'dist', '_backup_original', '_checkpoint_PreChange_2026_06_02_10_04_UTC', '.cache', '.npm'];

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  const files = fs.readdirSync(from);
  for (const file of files) {
    if (excludeList.includes(file)) {
      continue;
    }
    const fromPath = path.join(from, file);
    const toPath = path.join(to, file);
    const stat = fs.statSync(fromPath);
    if (stat.isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

try {
  console.log('Creating full checkpoint archive...');
  copyFolderSync(sourceDir, backupDir);
  console.log('Checkpoint archive successfully created at ./_checkpoint_PreChange_2026_06_02_10_04_UTC');
  process.exit(0);
} catch (err) {
  console.error('Checkpoint failed:', err);
  process.exit(1);
}
