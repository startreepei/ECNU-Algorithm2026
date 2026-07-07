#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const {
  buildContract,
  cloneContractWithProperties,
  listComponents,
  loadDataset,
  normalizeText,
  sanitizeIdentifier
} = require("../nasa-method/src/fretDataset");
const { computeDependencyMaps } = require("../nasa-method/src/connectedComponents");
const { renderContract } = require("../nasa-method/src/lustre");
const { getDependencyStatus, runSolver } = require("../nasa-method/src/solver");
const { computeConnectedComponentsUnionFind } = require("./src/unionFindComponents");

function parseArgs(argv) {
  const options = {
    dataset: path.resolve(__dirname, "../../datasets/LMCPS/LM_requirements.json"),
    component: "",
    engine: "jkind",
    timeoutSec: 120,
    traceLength: 8,
    check: false,
    listComponents: false,
    outDir: path.resolve(__dirname, "../../outputs/optimized-nasa"),
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dataset") {
      options.dataset = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--component") {
      options.component = argv[index + 1];
      index += 1;
    } else if (arg === "--engine") {
      options.engine = normalizeText(argv[index + 1]).toLowerCase();
      index += 1;
    } else if (arg === "--timeout") {
      options.timeoutSec = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else if (arg === "--trace-length") {
      options.traceLength = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else if (arg === "--out-dir") {
      options.outDir = path.resolve(argv[index + 1]);
      index += 1;
    } else if (arg === "--check") {
      options.check = true;
    } else if (arg === "--list-components") {
      options.listComponents = true;
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
  node analyze.js [--dataset <path>] [--component <name>] [--engine jkind|kind2] [--check]

Examples:
  node analyze.js --list-components --dataset ../../datasets/LMCPS/LM_requirements.json
  node analyze.js --dataset ../../datasets/LMCPS/LM_requirements.json --component Euler
  node analyze.js --dataset ../../datasets/LMCPS/LM_requirements.json --component Euler --check`);
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function summarizeConnectedComponents(components) {
  return components.map((component, index) => ({
    name: `cc${index}`,
    requirements: [...component.properties].sort(),
    outputs: [...component.outputs].sort()
  }));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const dataset = loadDataset(options.dataset);
  const availableComponents = listComponents(dataset);

  if (options.listComponents) {
    console.log(`Dataset: ${dataset.absolutePath}`);
    for (const component of availableComponents) {
      console.log(component);
    }
    return;
  }

  const targetComponents = options.component
    ? [normalizeText(options.component)]
    : availableComponents;

  const engine = options.engine === "kind2" ? "kind2" : "jkind";
  const dependencyStatus = options.check ? getDependencyStatus(engine) : { ok: false, missing: [] };
  const topLevelReport = {
    dataset: dataset.absolutePath,
    method: "optimized-nasa-union-find",
    engine,
    checkRequested: options.check,
    solverAvailable: dependencyStatus.ok,
    missingDependencies: dependencyStatus.missing,
    components: []
  };

  for (const componentName of targetComponents) {
    if (!availableComponents.includes(componentName)) {
      topLevelReport.components.push({
        component: componentName,
        error: "Component not found in dataset."
      });
      continue;
    }

    const contract = buildContract(dataset, componentName);
    const dependencyMaps = computeDependencyMaps(contract);
    const { components: connectedComponents, stats } = computeConnectedComponentsUnionFind(
      contract,
      dependencyMaps.output,
      { withStats: true }
    );
    const outputBase = path.join(
      options.outDir,
      sanitizeIdentifier(dataset.datasetName),
      sanitizeIdentifier(componentName)
    );

    ensureDirectory(outputBase);

    const monolithicFile = path.join(outputBase, `monolithic.${engine}.lus`);
    writeFile(monolithicFile, renderContract(contract, engine));

    const componentReport = {
      component: componentName,
      method: "optimized-nasa-union-find",
      monolithicFile,
      requirementCount: contract.properties.length,
      inputCount: contract.inputVariables.length,
      outputCount: contract.outputVariables.length,
      internalCount: contract.internalVariables.length,
      functionCount: contract.functions.length,
      optimizationStats: stats,
      connectedComponents: summarizeConnectedComponents(connectedComponents)
    };

    for (let index = 0; index < connectedComponents.length; index += 1) {
      const cc = connectedComponents[index];
      const ccContract = cloneContractWithProperties(
        contract,
        [...cc.properties],
        sanitizeIdentifier(`${componentName}_uf_cc${index}Spec`)
      );
      const ccPath = path.join(outputBase, `cc${index}.${engine}.lus`);
      writeFile(ccPath, renderContract(ccContract, engine));
      componentReport.connectedComponents[index].file = ccPath;
    }

    if (options.check) {
      if (!dependencyStatus.ok) {
        componentReport.checkSkipped = true;
        componentReport.skipReason = `Missing dependencies: ${dependencyStatus.missing.join(", ")}`;
      } else if (contract.functions.length > 0) {
        componentReport.checkSkipped = true;
        componentReport.skipReason = "This minimal version does not yet render FRET Function declarations.";
      } else {
        componentReport.monolithicResult = runSolver(monolithicFile, options);
        componentReport.connectedComponentResults = componentReport.connectedComponents.map((cc) => ({
          name: cc.name,
          result: runSolver(cc.file, options)
        }));
      }
    }

    writeFile(path.join(outputBase, "report.json"), JSON.stringify(componentReport, null, 2));
    topLevelReport.components.push(componentReport);
  }

  const summaryPath = path.join(options.outDir, `${sanitizeIdentifier(dataset.datasetName)}.${engine}.summary.json`);
  writeFile(summaryPath, JSON.stringify(topLevelReport, null, 2));

  console.log(`Dataset: ${dataset.absolutePath}`);
  console.log(`Engine: ${engine}`);
  console.log(`Analyzed components: ${topLevelReport.components.length}`);
  console.log(`Summary: ${summaryPath}`);

  for (const component of topLevelReport.components) {
    const status = component.error
      ? `error: ${component.error}`
      : `${component.connectedComponents.length} CCs, ${component.requirementCount} requirements`;
    console.log(`- ${component.component}: ${status}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
