#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('LMCPS JSON → FRETish CSV 转换工具\n');

// 读取LMCPS JSON
const jsonPath = path.resolve(__dirname, '../datasets/LMCPS/LM_requirements.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`读取数据:`);
console.log(`  需求数: ${data.requirements.length}`);
console.log(`  变量数: ${data.variables.length}\n`);

// 提取所有组件
const components = new Set();
data.requirements.forEach(r => {
  if (r.semantics && r.semantics.component_name) {
    components.add(r.semantics.component_name);
  }
});

console.log(`发现 ${components.size} 个组件:`);
[...components].sort().forEach(c => console.log(`  - ${c}`));
console.log();

// 为每个组件生成文件
for (const component of [...components].sort()) {
  console.log(`处理组件: ${component}`);

  // 过滤该组件的需求
  const componentReqs = data.requirements.filter(r =>
    r.semantics && r.semantics.component_name === component
  );

  // 过滤该组件的变量
  const componentVars = data.variables.filter(v =>
    v.component_name === component && v.modeldoc === false
  );

  console.log(`  需求数: ${componentReqs.length}`);
  console.log(`  变量数: ${componentVars.length}`);

  if (componentReqs.length === 0) {
    console.log(`  跳过（无需求）\n`);
    continue;
  }

  // 创建输出目录
  const outDir = path.resolve(__dirname, `../datasets/LMCPS_FRETish/${component}`);
  fs.mkdirSync(outDir, { recursive: true });

  // 生成 requirements.fretish.csv
  const reqCsvPath = path.join(outDir, 'requirements.fretish.csv');
  let reqCsv = 'reqid,component,project,fulltext\n';

  for (const req of componentReqs) {
    const reqid = escapeCsv(req.reqid || '');
    const comp = escapeCsv(component);
    const project = escapeCsv(req.project || 'LM_requirements');
    let fulltext = escapeCsv(req.fulltext || '');

    // 修复FRET保留字问题
    // T 是FRET保留字，替换为 T_param
    fulltext = fulltext.replace(/\bT\b/g, 'T_param');

    reqCsv += `${reqid},${comp},${project},${fulltext}\n`;
  }

  fs.writeFileSync(reqCsvPath, reqCsv, 'utf8');
  console.log(`  ✓ ${reqCsvPath}`);

  // 生成 variables.csv
  const varCsvPath = path.join(outDir, 'variables.csv');
  let varCsv = 'component,variable_name,idType,dataType,variableType\n';

  for (const v of componentVars) {
    const comp = escapeCsv(component);
    let varName = escapeCsv(v.variable_name || '');
    const idType = escapeCsv(v.idType || 'Input');
    const dataType = escapeCsv(Array.isArray(v.dataType) ? v.dataType[0] : v.dataType || 'double');

    // 修复FRET保留字问题
    if (varName === 'T') {
      varName = 'T_param';
    }

    // 推断 variableType
    let varType = 'data';
    const normalized = (v.variable_name || '').toLowerCase();

    // 状态载体识别
    if (['state', 'mode', 'status', 'senstate'].includes(normalized)) {
      varType = 'state';
    } else if (normalized.includes('state') || normalized.includes('mode') ||
               normalized.includes('status') || normalized.includes('fault') ||
               normalized.includes('nominal') || normalized.includes('standby') ||
               normalized.includes('transition') || normalized.includes('engaged')) {
      // 状态值识别
      if (normalized.endsWith('_state') || normalized.includes('fault_state') ||
          normalized.includes('nominal_state') || normalized.includes('transition_state') ||
          normalized.includes('standby_state')) {
        varType = 'state_value';
      } else {
        varType = 'state';
      }
    }

    varCsv += `${comp},${varName},${idType},${dataType},${varType}\n`;
  }

  fs.writeFileSync(varCsvPath, varCsv, 'utf8');
  console.log(`  ✓ ${varCsvPath}\n`);
}

console.log('转换完成！');
console.log('\n输出目录: datasets/LMCPS_FRETish/');
console.log('\n下一步:');
console.log('1. 检查生成的 variables.csv，确认 variableType 是否正确');
console.log('2. 使用 compile-fretish.js 重新编译:');
console.log('   node tools/compile-fretish.js \\');
console.log('     --requirements datasets/LMCPS_FRETish/<component>/requirements.fretish.csv \\');
console.log('     --variables datasets/LMCPS_FRETish/<component>/variables.csv \\');
console.log('     --output datasets/LMCPS_FRETish/<component>/compiled.json \\');
console.log('     --project LM_requirements');

function escapeCsv(value) {
  const str = String(value || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
