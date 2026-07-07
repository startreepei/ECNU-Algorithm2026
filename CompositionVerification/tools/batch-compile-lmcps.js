#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('批量编译LMCPS FRETish数据集\n');

const baseDir = path.resolve(__dirname, '../datasets/LMCPS_FRETish');
const components = fs.readdirSync(baseDir).filter(name => {
  const stat = fs.statSync(path.join(baseDir, name));
  return stat.isDirectory();
});

console.log(`发现 ${components.length} 个组件\n`);

let successCount = 0;
let failCount = 0;

for (const component of components.sort()) {
  console.log(`[${component}]`);

  const reqFile = path.join(baseDir, component, 'requirements.fretish.csv');
  const varFile = path.join(baseDir, component, 'variables.csv');
  const outFile = path.join(baseDir, component, 'compiled.json');

  if (!fs.existsSync(reqFile) || !fs.existsSync(varFile)) {
    console.log('  跳过（缺少文件）\n');
    continue;
  }

  try {
    const cmd = `node tools/compile-fretish.js --requirements "${reqFile}" --variables "${varFile}" --output "${outFile}" --project LM_requirements`;
    execSync(cmd, { stdio: 'pipe', cwd: path.resolve(__dirname, '..') });
    console.log('  ✓ 编译成功\n');
    successCount++;
  } catch (error) {
    console.log('  ✗ 编译失败\n');
    failCount++;
  }
}

console.log(`\n编译完成:`);
console.log(`  成功: ${successCount}`);
console.log(`  失败: ${failCount}`);

if (successCount > 0) {
  console.log(`\n下一步:`);
  console.log(`  node run.js compare --dataset datasets/LMCPS_FRETish/<component>/compiled.json`);
}
