#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const {
  buildContract,
  listComponents,
  loadDataset,
  normalizeText,
  sanitizeIdentifier
} = require("../nasa-method/src/fretDataset");
const { computeConnectedComponents, computeDependencyMaps } = require("../nasa-method/src/connectedComponents");
const { buildRequirementModel } = require("../our-method/src/fretAlignedInput");
const { analyzeModel } = require("../our-method/src/analysis");

function parseArgs(argv) {
  const options = {
    dataset: path.resolve(__dirname, "../../datasets/LiquidMixer/LM_reqts_and_vars.json"),
    fretishRequirements: "",
    variables: "",
    fallbackExistingSemantics: false,
    components: [],
    outDir: path.resolve(__dirname, "../../outputs"),
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dataset") {
      options.dataset = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--fretish-requirements" || arg === "--requirements") {
      options.fretishRequirements = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--variables") {
      options.variables = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--fallback-existing-semantics") {
      options.fallbackExistingSemantics = true;
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
    } else if (arg === "--out-dir") {
      options.outDir = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node run.js [--dataset <path>] [--component <name>] [--components <a,b,c>] [--out-dir <path>]
  node run.js --fretish-requirements <requirements.txt|csv|json> [--variables <variables.csv|json>]

Examples:
  node run.js
  node run.js --dataset ..\\Data\\LMCPS\\LM_requirements.json --component FSM_Autopilot
  node run.js --dataset ..\\Data\\LMCPS\\LM_requirements.json --components FSM_Autopilot,FSM_Sensor,Euler
  node run.js --fretish-requirements ..\\FRETish\\output\\LM_reqts_and_vars\\fretish-input.json`);
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

function compileFretishInput(options) {
  if (!options.fretishRequirements) {
    return options.dataset;
  }
  const { compileFretishFiles } = require("../FRETish/compile");

  const sourceBase = path.basename(
    options.fretishRequirements,
    path.extname(options.fretishRequirements)
  );
  const sourceParent = path.basename(path.dirname(options.fretishRequirements));
  const compiledPath = path.join(
    options.outDir,
    "_compiled-inputs",
    `${sanitizeIdentifier(`${sourceParent}_${sourceBase}`)}.compiled.json`
  );
  ensureDirectory(path.dirname(compiledPath));

  compileFretishFiles({
    requirements: options.fretishRequirements,
    variables: options.variables,
    out: compiledPath,
    project: "",
    allowParseErrors: false,
    fallbackExistingSemantics: options.fallbackExistingSemantics
  });

  return compiledPath;
}

function summarizeSizes(sizes) {
  const normalized = [...sizes].sort((left, right) => right - left);
  const total = normalized.reduce((sum, value) => sum + value, 0);
  return {
    sizes: normalized,
    count: normalized.length,
    total,
    max: normalized[0] || 0,
    min: normalized[normalized.length - 1] || 0,
    average: normalized.length > 0 ? Number((total / normalized.length).toFixed(2)) : 0
  };
}

function summarizeNasaComponent(dataset, componentName) {
  const contract = buildContract(dataset, componentName);
  const dependencyMaps = computeDependencyMaps(contract);
  const connectedComponents = computeConnectedComponents(contract, dependencyMaps.output);
  const componentSizes = connectedComponents.map((component) => component.properties.size);

  return {
    component: componentName,
    requirementCount: contract.properties.length,
    inputCount: contract.inputVariables.length,
    outputCount: contract.outputVariables.length,
    internalCount: contract.internalVariables.length,
    functionCount: contract.functions.length,
    dependencyOutputRefs: Object.values(dependencyMaps.output).reduce((sum, outputs) => sum + outputs.size, 0),
    componentSizeSummary: summarizeSizes(componentSizes),
    connectedComponents: connectedComponents.map((component, index) => ({
      id: `cc${index}`,
      requirementCount: component.properties.size,
      outputCount: component.outputs.size,
      requirements: [...component.properties].sort(),
      outputs: [...component.outputs].sort()
    }))
  };
}

function countEdgesByKind(edges) {
  const counts = {
    data_requires: 0,
    state_requires: 0,
    shared_target: 0
  };

  for (const edge of edges) {
    if (!Object.prototype.hasOwnProperty.call(counts, edge.kind)) {
      counts[edge.kind] = 0;
    }
    counts[edge.kind] += 1;
  }

  return counts;
}

function summarizeOursComponent(dataset, componentName) {
  const model = buildRequirementModel(dataset, componentName);
  const analysis = analyzeModel(model);
  const groupSizes = analysis.groups.map((group) => group.requirements.length);

  return {
    component: componentName,
    requirementCount: analysis.input.requirementCount,
    edgeCount: analysis.derivedRelations.requires.length,
    edgeKindCounts: countEdgesByKind(analysis.derivedRelations.requires),
    effectCount: analysis.derivedRelations.effects.length,
    groupSizeSummary: summarizeSizes(groupSizes),
    stateVariableCount: analysis.stateVariables.length,
    stateCarrierCount: analysis.stateCarrierVariables.length,
    stateValueCount: analysis.stateValueVariables.length,
    groups: analysis.groups.map((group) => ({
      id: group.id,
      root: group.root,
      requirementCount: group.requirements.length,
      requirements: [...group.requirements]
    }))
  };
}

function compareComponent(dataset, componentName) {
  const nasa = summarizeNasaComponent(dataset, componentName);
  const ours = summarizeOursComponent(dataset, componentName);

  return {
    component: componentName,
    requirementCountMatches: nasa.requirementCount === ours.requirementCount,
    nasa,
    ours,
    deltas: {
      componentCount: ours.groupSizeSummary.count - nasa.componentSizeSummary.count,
      maxGroupSize: ours.groupSizeSummary.max - nasa.componentSizeSummary.max,
      averageGroupSize: Number((ours.groupSizeSummary.average - nasa.componentSizeSummary.average).toFixed(2))
    }
  };
}

function toCsv(rows) {
  const headers = [
    "component",
    "requirements",
    "nasa_components",
    "nasa_max_size",
    "nasa_avg_size",
    "ours_groups",
    "ours_max_size",
    "ours_avg_size",
    "ours_edges",
    "ours_data_edges",
    "ours_state_edges",
    "ours_shared_target_edges",
    "ours_state_variables"
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push([
      row.component,
      row.requirements,
      row.nasa_components,
      row.nasa_max_size,
      row.nasa_avg_size,
      row.ours_groups,
      row.ours_max_size,
      row.ours_avg_size,
      row.ours_edges,
      row.ours_data_edges,
      row.ours_state_edges,
      row.ours_shared_target_edges,
      row.ours_state_variables
    ].join(","));
  }
  return `${lines.join("\n")}\n`;
}

function toMarkdown(summary, rows) {
  const lines = [
    "# NASA vs Ours Comparison",
    "",
    `- Dataset: \`${summary.dataset}\``,
    `- Components: ${summary.componentCount}`,
    "",
    "| Component | Reqs | NASA CCs | NASA Max | Ours Groups | Ours Max | Ours Edges | Data | State | Shared | State Vars |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.component} | ${row.requirements} | ${row.nasa_components} | ${row.nasa_max_size} | ${row.ours_groups} | ${row.ours_max_size} | ${row.ours_edges} | ${row.ours_data_edges} | ${row.ours_state_edges} | ${row.ours_shared_target_edges} | ${row.ours_state_variables} |`
    );
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- `NASA CCs` is the connected-component count from the FM 2021-style baseline.");
  lines.push("- `Ours Groups` is the root-reachability grouping result after dependency derivation and SCC collapse.");
  lines.push("- `State Vars` is the number of variables that the aligned implementation classified as state-related.");

  return `${lines.join("\n")}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const datasetPath = compileFretishInput(options);
  const dataset = loadDataset(datasetPath);
  const availableComponents = listComponents(dataset);
  const targetComponents = options.components.length > 0
    ? options.components.map((value) => normalizeText(value))
    : availableComponents;

  const missingComponents = targetComponents.filter((component) => !availableComponents.includes(component));
  if (missingComponents.length > 0) {
    throw new Error(`Component not found in dataset: ${missingComponents.join(", ")}`);
  }

  const comparisons = targetComponents.map((componentName) => compareComponent(dataset, componentName));
  const rows = comparisons.map((comparison) => ({
    component: comparison.component,
    requirements: comparison.nasa.requirementCount,
    nasa_components: comparison.nasa.componentSizeSummary.count,
    nasa_max_size: comparison.nasa.componentSizeSummary.max,
    nasa_avg_size: comparison.nasa.componentSizeSummary.average,
    ours_groups: comparison.ours.groupSizeSummary.count,
    ours_max_size: comparison.ours.groupSizeSummary.max,
    ours_avg_size: comparison.ours.groupSizeSummary.average,
    ours_edges: comparison.ours.edgeCount,
    ours_data_edges: comparison.ours.edgeKindCounts.data_requires || 0,
    ours_state_edges: comparison.ours.edgeKindCounts.state_requires || 0,
    ours_shared_target_edges: comparison.ours.edgeKindCounts.shared_target || 0,
    ours_state_variables: comparison.ours.stateVariableCount
  }));

  const outputBase = path.join(options.outDir, sanitizeIdentifier(dataset.datasetName));
  ensureDirectory(outputBase);

  const summary = {
    dataset: dataset.absolutePath,
    datasetName: dataset.datasetName,
    componentCount: comparisons.length,
    generatedAt: new Date().toISOString(),
    comparisons
  };

  const jsonPath = path.join(outputBase, "comparison.json");
  const csvPath = path.join(outputBase, "comparison.csv");
  const markdownPath = path.join(outputBase, "comparison.md");

  writeJson(jsonPath, summary);
  writeText(csvPath, toCsv(rows));
  writeText(markdownPath, toMarkdown(summary, rows));

  console.log(`Dataset: ${dataset.absolutePath}`);
  console.log(`Components: ${comparisons.length}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Markdown: ${markdownPath}`);

  for (const row of rows) {
    console.log(
      `- ${row.component}: NASA=${row.nasa_components} CCs (max ${row.nasa_max_size}), Ours=${row.ours_groups} groups (max ${row.ours_max_size}), edges=${row.ours_edges}`
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
