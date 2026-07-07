const fs = require("fs");
const path = require("path");

const SUPPORTED_ID_TYPES = new Set(["Input", "Output", "Internal", "Mode", "Function"]);

function loadDataset(datasetPath) {
  const absolutePath = path.resolve(datasetPath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    absolutePath,
    datasetName: path.basename(absolutePath, path.extname(absolutePath)),
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
    variables: Array.isArray(parsed.variables) ? parsed.variables : []
  };
}

function normalizeText(value) {
  return String(value || "").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeIdentifier(value) {
  let sanitized = normalizeText(value).replace(/[^A-Za-z0-9_]/g, "_");
  sanitized = sanitized.replace(/_+/g, "_");
  if (!sanitized) {
    sanitized = "unnamed";
  }
  if (/^[0-9]/.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }
  const lowered = sanitized.toLowerCase();
  if (["node", "tel", "let", "var", "returns", "bool", "int", "real", "pre", "if", "then", "else"].includes(lowered)) {
    sanitized = `${sanitized}_v`;
  }
  return sanitized;
}

function buildSanitizedNameMap(names) {
  const used = new Set();
  const mapping = new Map();

  for (const rawName of names) {
    const normalized = normalizeText(rawName);
    if (!normalized || mapping.has(normalized)) {
      continue;
    }

    const base = sanitizeIdentifier(normalized);
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }

    used.add(candidate);
    mapping.set(normalized, candidate);
  }

  return mapping;
}

function replaceNamesInExpression(expression, replacements) {
  let updated = String(expression || "");

  for (const [original, safe] of replacements) {
    if (!original || original === safe) {
      continue;
    }

    const escaped = escapeRegExp(original);
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(original)) {
      updated = updated.replace(new RegExp(`\\b${escaped}\\b`, "g"), safe);
    } else {
      updated = updated.replace(
        new RegExp(`(^|[^A-Za-z0-9_])(${escaped})(?=[^A-Za-z0-9_]|$)`, "g"),
        (match, prefix) => `${prefix}${safe}`
      );
    }
  }

  return updated.replace(/\bFTP\b/g, "__FTP");
}

function normalizeList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeText(value))
        .filter(Boolean)
    )
  );
}

function toLustreType(dataType) {
  const normalized = normalizeText(dataType).toLowerCase();
  if (normalized === "boolean" || normalized === "bool") {
    return "bool";
  }
  if (normalized.includes("int")) {
    return "int";
  }
  return "real";
}

function hasValidRequirementSemantics(requirement) {
  const cocoSpecCode = requirement && requirement.semantics && requirement.semantics.CoCoSpecCode;
  return normalizeText(cocoSpecCode) !== "";
}

function listComponents(dataset) {
  return Array.from(
    new Set(
      dataset.requirements
        .filter(hasValidRequirementSemantics)
        .map((requirement) => normalizeText(requirement.semantics.component_name))
        .filter(Boolean)
    )
  ).sort();
}

function cloneContractWithProperties(contract, propertyReqIds, componentName) {
  const selectedReqIds = new Set(propertyReqIds);
  return {
    ...contract,
    componentName,
    properties: contract.properties.filter((property) => selectedReqIds.has(property.reqid))
  };
}

function buildContract(dataset, componentName) {
  const normalizedComponent = normalizeText(componentName);
  const variableRecords = dataset.variables.filter((variable) => {
    return (
      normalizeText(variable.component_name) === normalizedComponent &&
      variable.modeldoc === false &&
      variable.completed !== false &&
      SUPPORTED_ID_TYPES.has(normalizeText(variable.idType))
    );
  });

  const requirementRecords = dataset.requirements.filter((requirement) => {
    return (
      hasValidRequirementSemantics(requirement) &&
      normalizeText(requirement.semantics.component_name) === normalizedComponent
    );
  });

  const allVariableNames = variableRecords
    .map((variable) => normalizeText(variable.variable_name))
    .filter(Boolean);
  const nameMap = buildSanitizedNameMap(allVariableNames);
  const replacementPairs = Array.from(nameMap.entries()).sort((left, right) => right[0].length - left[0].length);
  const sanitizedNames = new Set(nameMap.values());
  const safeNameFor = (name) => nameMap.get(normalizeText(name));

  const contract = {
    datasetName: dataset.datasetName,
    componentName: sanitizeIdentifier(`${normalizedComponent}Spec`),
    sourceComponentName: normalizedComponent,
    inputVariables: [],
    outputVariables: [],
    internalVariables: [],
    modes: [],
    functions: [],
    assignments: [],
    delays: [],
    properties: []
  };

  for (const record of variableRecords) {
    const originalName = normalizeText(record.variable_name);
    const lustreName = safeNameFor(originalName);
    if (!lustreName) {
      continue;
    }

    const variableInfo = {
      name: lustreName,
      originalName,
      type: toLustreType(record.dataType)
    };
    const idType = normalizeText(record.idType);

    if (idType === "Input") {
      contract.inputVariables.push(variableInfo);
    } else if (idType === "Output") {
      contract.outputVariables.push(variableInfo);
    } else if (idType === "Internal") {
      const dependencyNames = normalizeList(record.assignmentVariables)
        .map((name) => safeNameFor(name))
        .filter(Boolean);
      contract.internalVariables.push({
        ...variableInfo,
        dependencyNames
      });
      contract.assignments.push(replaceNamesInExpression(record.assignment, replacementPairs));
    } else if (idType === "Mode") {
      contract.modes.push({
        ...variableInfo,
        assignment: replaceNamesInExpression(record.modeRequirement, replacementPairs)
      });
    } else if (idType === "Function") {
      contract.functions.push({
        name: lustreName,
        originalName,
        moduleName: normalizeText(record.moduleName)
      });
    }
  }

  for (const requirement of requirementRecords) {
    const dependencyNames = normalizeList(requirement.semantics.variables)
      .map((name) => safeNameFor(name) || sanitizeIdentifier(name))
      .filter((name) => sanitizedNames.has(name));

    contract.properties.push({
      reqid: normalizeText(requirement.reqid),
      fullText: normalizeText(requirement.fulltext),
      value: replaceNamesInExpression(requirement.semantics.CoCoSpecCode, replacementPairs),
      dependencyNames
    });

    if (requirement.semantics.duration !== undefined && requirement.semantics.duration !== null) {
      const parsedDuration = Number.parseInt(requirement.semantics.duration, 10);
      if (!Number.isNaN(parsedDuration) && !contract.delays.includes(parsedDuration)) {
        contract.delays.push(parsedDuration);
      }
    }
  }

  contract.delays.sort((left, right) => left - right);
  return contract;
}

module.exports = {
  buildContract,
  cloneContractWithProperties,
  listComponents,
  loadDataset,
  normalizeText,
  sanitizeIdentifier
};
