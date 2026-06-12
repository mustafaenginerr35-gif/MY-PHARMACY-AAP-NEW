import fs from 'fs';
import path from 'path';

const sourceDir = './';
const backupDir = './_backup_original';

const excludeList = ['node_modules', '.git', 'dist', '_backup_original', '.cache', '.npm'];

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
  console.log('Creating full project checkpoint...');
  copyFolderSync(sourceDir, backupDir);
  console.log('Backup checkpoint successfully created at ./_backup_original');
  process.exit(0);
} catch (err) {
  console.error('Backup creation failed:', err);
  process.exit(1);
}
