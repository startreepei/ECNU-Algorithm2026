#!/usr/bin/env node
/**
 * 使用FRET的完整parser编译FRETish需求
 */
const fs = require("fs");
const path = require("path");

// 使用FRET的完整parser
const FretSemantics = require("../fret-master/fret-electron/app/parser/FretSemantics");

console.log("FRETish需求编译工具");
console.log("使用NASA FRET Parser\n");

function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // 简单的CSV解析（处理引号）
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

function compileRequirement(fretishText, component, project) {
  try {
    const result = FretSemantics.compile(fretishText, component, project);
    if (!result || !result.collectedSemantics) {
      console.error(`  ✗ 编译失败: 返回结果为空`);
      if (result && result.parseErrors) {
        console.error(`     解析错误: ${JSON.stringify(result.parseErrors)}`);
      }
      return null;
    }
    return result;
  } catch (error) {
    console.error(`  ✗ 编译失败: ${error.message}`);
    console.error(`     ${error.stack}`);
    return null;
  }
}

function compileFretishDataset(reqFile, varFile, outputFile, projectName) {
  console.log(`编译数据集:`);
  console.log(`  需求文件: ${reqFile}`);
  console.log(`  变量文件: ${varFile}`);
  console.log(`  输出文件: ${outputFile}\n`);

  // 读取文件
  const reqContent = fs.readFileSync(reqFile, "utf8");
  const varContent = fs.readFileSync(varFile, "utf8");

  const requirements = parseCSV(reqContent);
  const variables = parseCSV(varContent);

  console.log(`解析结果:`);
  console.log(`  需求数: ${requirements.length}`);
  console.log(`  变量数: ${variables.length}`);

  // 验证和规范化 variableType 字段
  const validTypes = ['data', 'state', 'state_value'];
  for (const v of variables) {
    if (!v.variableType || v.variableType.trim() === '') {
      v.variableType = 'data';
    } else {
      const normalized = v.variableType.toLowerCase().trim();
      if (!validTypes.includes(normalized)) {
        console.error(`\n✗ 错误: 变量 ${v.variable_name} 的 variableType '${v.variableType}' 无效`);
        console.error(`   必须是以下之一: ${validTypes.join(', ')}`);
        throw new Error(`Invalid variableType: ${v.variableType}`);
      }
      v.variableType = normalized;
    }
  }

  const stateVars = variables.filter(v => v.variableType === 'state' || v.variableType === 'state_value');
  if (stateVars.length > 0) {
    console.log(`  状态变量: ${stateVars.length}个`);
    stateVars.forEach(v => {
      console.log(`    - ${v.variable_name} (${v.variableType})`);
    });
  }
  console.log();

  // 编译每个需求
  console.log(`开始编译需求...\n`);

  const compiledRequirements = [];
  let successCount = 0;
  let failCount = 0;

  for (const req of requirements) {
    console.log(`[${req.reqid}] ${req.fulltext.substring(0, 60)}...`);

    const result = compileRequirement(req.fulltext, req.component, req.project || projectName);

    if (result && result.collectedSemantics) {
      console.log(`  ✓ 编译成功`);

      // 构建完整的需求对象
      const compiledReq = {
        reqid: req.reqid,
        parent_reqid: req.parent_reqid || "",
        project: req.project || projectName,
        rationale: req.rationale || "",
        fulltext: req.fulltext,
        status: req.status || "",
        semantics: result.collectedSemantics,
        _id: generateId()
      };

      compiledRequirements.push(compiledReq);
      successCount++;
    } else {
      console.log(`  ✗ 编译失败`);
      failCount++;
    }
  }

  console.log(`\n编译完成:`);
  console.log(`  成功: ${successCount}`);
  console.log(`  失败: ${failCount}\n`);

  // 构建输出JSON
  const output = {
    requirements: compiledRequirements,
    variables: variables.map(v => ({
      component_name: v.component,
      variable_name: v.variable_name,
      idType: v.idType,
      dataType: v.dataType,
      variableType: v.variableType || 'data',  // 添加变量类型字段
      modeldoc: false,
      modeldoc_id: generateId(),
      completed: true
    }))
  };

  // 写入文件
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), "utf8");
  console.log(`✓ 输出文件已生成: ${outputFile}`);

  return { success: successCount, fail: failCount };
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    requirements: null,
    variables: null,
    output: null,
    project: "Project"
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--requirements" || args[i] === "-r") {
      options.requirements = path.resolve(args[++i]);
    } else if (args[i] === "--variables" || args[i] === "-v") {
      options.variables = path.resolve(args[++i]);
    } else if (args[i] === "--output" || args[i] === "-o") {
      options.output = path.resolve(args[++i]);
    } else if (args[i] === "--project" || args[i] === "-p") {
      options.project = args[++i];
    } else if (args[i] === "--help" || args[i] === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
用法: node compile-fretish.js [选项]

选项:
  -r, --requirements <file>   FRETish需求文件 (CSV)
  -v, --variables <file>      变量定义文件 (CSV)
  -o, --output <file>         输出文件 (JSON)
  -p, --project <name>        项目名称
  -h, --help                  显示帮助

示例:
  node tools/compile-fretish.js \\
    --requirements datasets/LiquidMixer/requirements.fretish.csv \\
    --variables datasets/LiquidMixer/variables.csv \\
    --output datasets/LiquidMixer/LM_reqts_and_vars.json \\
    --project Liquid_mixer
`);
}

// 主程序
if (require.main === module) {
  const options = parseArgs();

  if (!options.requirements || !options.variables || !options.output) {
    console.error("错误: 缺少必需参数\n");
    printHelp();
    process.exit(1);
  }

  try {
    const result = compileFretishDataset(
      options.requirements,
      options.variables,
      options.output,
      options.project
    );

    if (result.fail > 0) {
      console.log(`\n⚠ 警告: ${result.fail}个需求编译失败`);
      process.exit(1);
    }

    console.log("\n✓ 所有需求编译成功！");
    process.exit(0);

  } catch (error) {
    console.error(`\n✗ 错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { compileFretishDataset };
