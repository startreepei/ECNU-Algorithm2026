#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");

function printHelp() {
  console.log(`
Compositional verification tool entry point

Usage:
  node run.js <command> [options]

Commands:
  compile       Compile FRETish requirements to FRET JSON
  nasa          Run the NASA/FM 2021 baseline decomposition
  ours          Run the dependency-enhanced reference method
  optimized     Run the optimized NASA-style union-find decomposition
  benchmark     Benchmark baseline decomposition vs optimized decomposition
  compare       Compare NASA baseline and the reference method
  list          List components in a dataset

Examples:
  node run.js list --dataset datasets/LMCPS/LM_requirements.json
  node run.js nasa --dataset datasets/LMCPS/LM_requirements.json --component Euler
  node run.js optimized --dataset datasets/LMCPS/LM_requirements.json --component Euler
  node run.js benchmark --dataset datasets/LMCPS/LM_requirements.json --scales 1,10,50,100
  node run.js compare --dataset datasets/LMCPS/LM_requirements.json

More help:
  node tools/nasa-method/analyze.js --help
  node tools/our-method/analyze.js --help
  node tools/optimized-nasa/analyze.js --help
  node tools/benchmark-optimization.js --help
  node tools/comparison/run.js --help
  node tools/compile-fretish.js --help
`);
}

function runCommand(command, args) {
  const toolMap = {
    compile: "tools/compile-fretish.js",
    nasa: "tools/nasa-method/analyze.js",
    ours: "tools/our-method/analyze.js",
    optimized: "tools/optimized-nasa/analyze.js",
    benchmark: "tools/benchmark-optimization.js",
    compare: "tools/comparison/run.js",
    list: "tools/nasa-method/analyze.js"
  };

  const tool = toolMap[command];
  if (!tool) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  const toolPath = path.resolve(__dirname, tool);
  const cmdArgs = command === "list" ? ["--list-components", ...args] : args;
  const cmd = `"${process.execPath}" "${toolPath}" ${cmdArgs.join(" ")}`;

  console.log(`Running: ${cmd}\n`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: __dirname });
  } catch (error) {
    process.exit(error.status || 1);
  }
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  printHelp();
  process.exit(0);
}

const command = args[0];
const commandArgs = args.slice(1);
runCommand(command, commandArgs);
