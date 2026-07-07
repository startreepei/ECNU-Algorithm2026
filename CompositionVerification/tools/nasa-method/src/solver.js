const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function commandExists(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return !result.error;
}

function getDependencyStatus(engine) {
  const missing = [];

  if (engine === "jkind") {
    if (!commandExists("jkind", ["-help"]) || !commandExists("jrealizability", ["-help"])) {
      missing.push("jkind/jrealizability");
    }
  } else if (engine === "kind2") {
    if (!commandExists("kind2", ["-h"])) {
      missing.push("kind2");
    }
  }

  if (!commandExists("z3", ["-h"])) {
    missing.push("z3");
  }

  return {
    ok: missing.length === 0,
    missing
  };
}

function runJKind(filePath, timeoutSec, traceLength) {
  const args = ["-json", "-fixpoint", "-timeout", String(timeoutSec)];
  if (traceLength > 0) {
    args.push("-tracelength", String(traceLength));
  }
  args.push(filePath);

  const result = spawnSync("jrealizability", args, { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "jrealizability terminated unexpectedly.");
  }

  const stdout = result.stdout || "";
  const resultMatch = stdout.match(/(?:\+\n)(.*?)(?:\s\|\|\s(?:K|R|S|T))/);
  const timeMatch = stdout.match(/Time = (.*?)\n/);
  const jsonPath = `${filePath}.json`;
  let trace = null;

  if (fs.existsSync(jsonPath)) {
    const jsonOutput = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    if (resultMatch && resultMatch[1] === "REALIZABLE" && Array.isArray(jsonOutput.Counterexample)) {
      trace = jsonOutput.Counterexample;
    }
  }

  return {
    engine: "jkind",
    result: resultMatch ? resultMatch[1] : "UNKNOWN",
    time: timeMatch ? timeMatch[1] : "n/a",
    traceLength: trace && trace[0] ? Object.keys(trace[0]).length - 2 : null
  };
}

function runKind2(filePath, timeoutSec) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const args = ["--lus_main", fileName, "-json", "--enable", "CONTRACTCK", "--timeout", String(timeoutSec), filePath];
  const result = spawnSync("kind2", args, { encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }

  const stdout = result.stdout || "[]";
  const json = JSON.parse(stdout);
  const realizabilityResult = json.find((item) => item.objectType === "realizabilityCheck");
  const satisfiabilityResult = json.find((item) => item.objectType === "satisfiabilityCheck");
  const lastLog = [...json].reverse().find((item) => item.objectType === "log");

  let overall = "UNKNOWN";
  if (lastLog && lastLog.value === "Wallclock timeout.") {
    overall = "UNKNOWN";
  } else if (satisfiabilityResult && satisfiabilityResult.result === "unsatisfiable") {
    overall = "UNREALIZABLE";
  } else if (realizabilityResult && realizabilityResult.result) {
    overall = String(realizabilityResult.result).toUpperCase();
  }

  return {
    engine: "kind2",
    result: overall,
    time: realizabilityResult && realizabilityResult.runtime
      ? `${realizabilityResult.runtime.value}${realizabilityResult.runtime.unit}`
      : "n/a",
    traceLength: null
  };
}

function runSolver(filePath, options) {
  if (options.engine === "kind2") {
    return runKind2(filePath, options.timeoutSec);
  }
  return runJKind(filePath, options.timeoutSec, options.traceLength);
}

module.exports = {
  getDependencyStatus,
  runSolver
};
