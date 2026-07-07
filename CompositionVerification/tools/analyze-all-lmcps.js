#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('批量分析所有LMCPS组件\n');

const baseDir = path.resolve(__dirname, '../datasets/LMCPS_FRETish');
const components = fs.readdirSync(baseDir).filter(name => {
  const stat = fs.statSync(path.join(baseDir, name));
  return stat.isDirectory();
});

console.log(`发现 ${components.length} 个组件\n`);

const results = [];

for (const component of components.sort()) {
  const compiledFile = path.join(baseDir, component, 'compiled.json');

  if (!fs.existsSync(compiledFile)) {
    console.log(`[${component}] 跳过（未编译）\n`);
    continue;
  }

  console.log(`[${component}] 分析中...`);

  try {
    const cmd = `node run.js compare --dataset "${compiledFile}"`;
    const output = execSync(cmd, {
      stdio: 'pipe',
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8'
    });

    // 解析输出
    const match = output.match(/- (\w+): NASA=(\d+) CCs \(max (\d+)\), Ours=(\d+) groups \(max (\d+)\), edges=(\d+)/);
    if (match) {
      results.push({
        component: match[1],
        nasa_ccs: parseInt(match[2]),
        nasa_max: parseInt(match[3]),
        ours_groups: parseInt(match[4]),
        ours_max: parseInt(match[5]),
        edges: parseInt(match[6])
      });
      console.log(`  ✓ NASA=${match[2]} CCs, Ours=${match[4]} groups, edges=${match[6]}\n`);
    }
  } catch (error) {
    console.log(`  ✗ 分析失败\n`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('汇总结果');
console.log('='.repeat(80) + '\n');

// 生成汇总表格
console.log('| Component | Reqs | NASA CCs | NASA Max | Ours Groups | Ours Max | Edges |');
console.log('|-----------|------|----------|----------|-------------|----------|-------|');

for (const r of results) {
  // 读取需求数
  const compiledFile = path.join(baseDir, r.component, 'compiled.json');
  const data = JSON.parse(fs.readFileSync(compiledFile, 'utf8'));
  const reqCount = data.requirements.length;

  console.log(`| ${r.component.padEnd(17)} | ${String(reqCount).padStart(4)} | ${String(r.nasa_ccs).padStart(8)} | ${String(r.nasa_max).padStart(8)} | ${String(r.ours_groups).padStart(11)} | ${String(r.ours_max).padStart(8)} | ${String(r.edges).padStart(5)} |`);
}

console.log('\n统计:');
console.log(`  总组件数: ${results.length}`);
console.log(`  总需求数: ${results.reduce((sum, r) => {
    const compiledFile = path.join(baseDir, r.component, 'compiled.json');
    const data = JSON.parse(fs.readFileSync(compiledFile, 'utf8'));
    return sum + data.requirements.length;
  }, 0)}`);
console.log(`  总依赖边: ${results.reduce((sum, r) => sum + r.edges, 0)}`);

// 保存结果
const outputFile = path.resolve(__dirname, '../outputs/LMCPS_summary.json');
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf8');
console.log(`\n结果已保存: ${outputFile}`);
