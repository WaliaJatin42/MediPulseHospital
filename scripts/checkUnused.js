const fs = require('fs');
const path = require('path');

function getFiles(dir, ext = '.js') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules') results = results.concat(getFiles(fullPath, ext));
    } else if (file.endsWith(ext)) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getFiles(path.join(__dirname, '..', 'src'));
console.log('Total JS files in src:', files.length);

let totalImportIssues = 0;
let totalVarIssues = 0;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');

  // Check unused require imports
  const requireRegex = /const\s+([A-Za-z0-9_{},\s]+)\s*=\s*require\([^)]+\);/g;
  let match;
  while ((match = requireRegex.exec(content)) !== null) {
    const raw = match[1];
    const imported = raw.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
    imported.forEach(ident => {
      const actualName = ident.includes(':') ? ident.split(':')[1].trim() : ident;
      const identRegex = new RegExp('\\b' + actualName + '\\b', 'g');
      const matches = content.match(identRegex) || [];
      if (matches.length <= 1) {
        console.log(`Unused import '${actualName}' in ${path.relative(path.join(__dirname, '..'), f)}`);
        totalImportIssues++;
      }
    });
  }

  // Check declared variables (let/const name = ...) that only appear once in file
  const varRegex = /(?:const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*[^;\n]+/g;
  let varMatch;
  while ((varMatch = varRegex.exec(content)) !== null) {
    const varName = varMatch[1];
    // Ignore common req/res/next/router/options
    if (['req', 'res', 'next', 'router', 'options', 'app', 'module', 'exports', 'total', 'skip'].includes(varName)) continue;
    const varCountRegex = new RegExp('\\b' + varName + '\\b', 'g');
    const matches = content.match(varCountRegex) || [];
    if (matches.length === 1) {
      console.log(`Unused variable '${varName}' in ${path.relative(path.join(__dirname, '..'), f)}`);
      totalVarIssues++;
    }
  }
});

console.log(`Summary: ${totalImportIssues} unused imports, ${totalVarIssues} unused variables`);
