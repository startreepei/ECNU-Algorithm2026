#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

const {
  buildContract,
  listComponents,
  loadDataset,
  normalizeText,
  sanitizeIdentifier
} = require("./nasa-method/src/fretDataset");
const {
  computeConnectedComponents,
  computeDependencyMaps
} = require("./nasa-method/src/connectedComponents");
const {
  computeConnectedComponentsUnionFind
} = require("./optimized-nasa/src/unionFindComponents");

function parseArgs(argv) {
  const options = {
    dataset: path.resolve(__dirname, "../datasets/LMCPS/LM_requirements.json"),
    components: [],
    scales: [1, 10, 50, 100],
    repeat: 25,
    outDir: path.resolve(__dirname, "../outputs/optimization-benchmark"),
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dataset") {
      options.dataset = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--component") {
      options.components.push(argv[index + 1]);
      index += 1;
    } else if (arg === "--components") {
      options.components.push(
        ...String(argv[index + 1] || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      );
      index += 1;
    } else if (arg === "--scales") {
      options.scales = String(argv[index + 1] || "")
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0);
      index += 1;
    } else if (arg === "--repeat") {
      options.repeat = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else if (arg === "--out-dir") {
      options.outDir = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.scales.length === 0) {
    throw new Error("At least one positive scale is required.");
  }
  if (!Number.isFinite(options.repeat) || options.repeat < 1) {
    throw new Error("--repeat must be a positive integer.");
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node tools/benchmark-optimization.js [--dataset <path>] [--components <a,b>] [--scales 1,10,50] [--repeat 25]

Examples:
  node tools/benchmark-optimization.js --dataset datasets/LMCPS/LM_requirements.json
  node tools/benchmark-optimization.js --components Euler,Regulator --scales 1,20,100 --repeat 50`);
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, value, "utf8");
}

function cloneContractAtScale(contract, scale) {
  if (scale === 1) {
    return contract;
  }

  const scaled = {
    ...contract,
    componentName: `${contract.componentName}_x${scale}`,
    properties: []
  };

  for (let copy = 0; copy < scale; copy += 1) {
    for (const property of contract.properties) {
      scaled.properties.push({
        ...property,
        reqid: `${property.reqid}__copy${copy + 1}`
      });
    }
  }

  return scaled;
}

function normalizeComponents(components) {
  return components
    .map((component) => [...component.properties].sort().join("|"))
    .sort();
}

function componentsEquivalent(left, right) {
  const leftNorm = normalizeComponents(left);
  const rightNorm = normalizeComponents(right);
  if (leftNorm.length !== rightNorm.length) {
    return false;
  }
  for (let index = 0; index < leftNorm.length; index += 1) {
    if (leftNorm[index] !== rightNorm[index]) {
      return false;
    }
  }
  return true;
}

function timeFunction(callback, repeat) {
  for (let index = 0; index < Math.min(5, repeat); index += 1) {
    callback();
  }

  const samples = [];
  for (let index = 0; index < repeat; index += 1) {
    const start = performance.now();
    callback();
    samples.push(performance.now() - start);
  }

  samples.sort((left, right) => left - right);
  const total = samples.reduce((sum, value) => sum + value, 0);
  return {
    min: samples[0],
    median: samples[Math.floor(samples.length / 2)],
    average: total / samples.length,
    max: samples[samples.length - 1]
  };
}

function roundMs(value) {
  return Number(value.toFixed(4));
}

function summarizeSizes(components) {
  const sizes = components.map((component) => component.properties.size).sort((left, right) => right - left);
  const total = sizes.reduce((sum, value) => sum + value, 0);
  return {
    count: sizes.length,
    max: sizes[0] || 0,
    average: sizes.length > 0 ? Number((total / sizes.length).toFixed(2)) : 0,
    sizes
  };
}

function rowToCsv(row) {
  return [
    row.datasetName,
    row.component,
    row.scale,
    row.requirements,
    row.baselineComponents,
    row.optimizedComponents,
    row.equivalent,
    row.baselineMedianMs,
    row.optimizedMedianMs,
    row.speedupMedian,
    row.outputReferences,
    row.distinctOutputs,
    row.unionAttempts,
    row.successfulUnions
  ].join(",");
}

function toCsv(rows) {
  const headers = [
    "dataset",
    "component",
    "scale",
    "requirements",
    "baseline_components",
    "optimized_components",
    "equivalent",
    "baseline_median_ms",
    "optimized_median_ms",
    "speedup_median",
    "output_references",
    "distinct_outputs",
    "union_attempts",
    "successful_unions"
  ];
  return `${headers.join(",")}\n${rows.map(rowToCsv).join("\n")}\n`;
}

function toMarkdown(summary, rows) {
  const lines = [
    "# Optimization Benchmark",
    "",
    `- Dataset: \`${summary.dataset}\``,
    `- Components: ${summary.components.length}`,
    `- Scales: ${summary.scales.join(", ")}`,
    `- Repeat: ${summary.repeat}`,
    "",
    "| Component | Scale | Reqs | Baseline CCs | Optimized CCs | Equivalent | Baseline median ms | Optimized median ms | Speedup |",
    "| --- | ---: | ---: | ---: | ---: | :---: | ---: | ---: | ---: |"
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.component} | ${row.scale} | ${row.requirements} | ${row.baselineComponents} | ${row.optimizedComponents} | ${row.equivalent ? "yes" : "no"} | ${row.baselineMedianMs} | ${row.optimizedMedianMs} | ${row.speedupMedian} |`
    );
  }

  lines.push("");
  lines.push("## Interpretation");
  lines.push("");
  lines.push("- The baseline is the paper-style connected-component pass implemented in `tools/nasa-method`.");
  lines.push("- The optimized version uses an output-to-requirement inverted index plus union-find.");
  lines.push("- `Equivalent=yes` means both methods produced the same requirement partition.");
  lines.push("- Timings cover only the connected-component decomposition step after dependency maps are already built.");

  return `${lines.join("\n")}\n`;
}

function benchmarkComponent(dataset, componentName, scale, repeat) {
  const baseContract = buildContract(dataset, componentName);
  const contract = cloneContractAtScale(baseContract, scale);
  const dependencyMaps = computeDependencyMaps(contract);

  const baselineComponents = computeConnectedComponents(contract, dependencyMaps.output);
  const optimizedResult = computeConnectedComponentsUnionFind(contract, dependencyMaps.output, { withStats: true });
  const optimizedComponents = optimizedResult.components;
  const equivalent = componentsEquivalent(baselineComponents, optimizedComponents);

  const baselineTiming = timeFunction(
    () => computeConnectedComponents(contract, dependencyMaps.output),
    repeat
  );
  const optimizedTiming = timeFunction(
    () => computeConnectedComponentsUnionFind(contract, dependencyMaps.output),
    repeat
  );

  const baselineSummary = summarizeSizes(baselineComponents);
  const optimizedSummary = summarizeSizes(optimizedComponents);
  const speedupMedian = optimizedTiming.median > 0
    ? baselineTiming.median / optimizedTiming.median
    : null;

  return {
    datasetName: dataset.datasetName,
    component: componentName,
    scale,
    requirements: contract.properties.length,
    baselineComponents: baselineSummary.count,
    baselineMaxSize: baselineSummary.max,
    optimizedComponents: optimizedSummary.count,
    optimizedMaxSize: optimizedSummary.max,
    equivalent,
    baselineMedianMs: roundMs(baselineTiming.median),
    baselineAverageMs: roundMs(baselineTiming.average),
    optimizedMedianMs: roundMs(optimizedTiming.median),
    optimizedAverageMs: roundMs(optimizedTiming.average),
    speedupMedian: speedupMedian === null ? null : Number(speedupMedian.toFixed(2)),
    outputReferences: optimizedResult.stats.outputReferences,
    distinctOutputs: optimizedResult.stats.distinctOutputs,
    unionAttempts: optimizedResult.stats.unionAttempts,
    successfulUnions: optimizedResult.stats.successfulUnions
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const dataset = loadDataset(options.dataset);
  const availableComponents = listComponents(dataset);
  const targetComponents = options.components.length > 0
    ? options.components.map((value) => normalizeText(value))
    : availableComponents;

  const missingComponents = targetComponents.filter((component) => !availableComponents.includes(component));
  if (missingComponents.length > 0) {
    throw new Error(`Component not found in dataset: ${missingComponents.join(", ")}`);
  }

  const rows = [];
  for (const component of targetComponents) {
    for (const scale of options.scales) {
      const row = benchmarkComponent(dataset, component, scale, options.repeat);
      rows.push(row);
      console.log(
        `${component} x${scale}: equivalent=${row.equivalent}, baseline=${row.baselineMedianMs}ms, optimized=${row.optimizedMedianMs}ms, speedup=${row.speedupMedian}`
      );
    }
  }

  const summary = {
    dataset: dataset.absolutePath,
    datasetName: dataset.datasetName,
    components: targetComponents,
    scales: options.scales,
    repeat: options.repeat,
    generatedAt: new Date().toISOString(),
    rows
  };

  const outputBase = path.join(options.outDir, sanitizeIdentifier(dataset.datasetName));
  ensureDirectory(outputBase);
  const jsonPath = path.join(outputBase, "benchmark.json");
  const csvPath = path.join(outputBase, "benchmark.csv");
  const markdownPath = path.join(outputBase, "benchmark.md");

  writeJson(jsonPath, summary);
  writeText(csvPath, toCsv(rows));
  writeText(markdownPath, toMarkdown(summary, rows));

  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Markdown: ${markdownPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
