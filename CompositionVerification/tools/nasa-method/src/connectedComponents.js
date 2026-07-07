function setUnion(setA, setB) {
  const union = new Set(setA);
  for (const elem of setB) {
    union.add(elem);
  }
  return union;
}

function setIntersection(setA, setB) {
  const intersection = new Set();
  for (const elem of setB) {
    if (setA.has(elem)) {
      intersection.add(elem);
    }
  }
  return intersection;
}

function computeOutputDependencies(name, internalDepMap, outputDepMap, oneLevel) {
  for (const internalName of internalDepMap[name] || []) {
    if (!oneLevel && internalName !== name) {
      computeOutputDependencies(internalName, internalDepMap, outputDepMap, false);
    }
    outputDepMap[name] = setUnion(outputDepMap[name], outputDepMap[internalName] || new Set());
  }
}

function computeDependencyMaps(contract) {
  const outputDepMap = {};
  const internalDepMap = {};

  for (const property of contract.properties) {
    outputDepMap[property.reqid] = new Set();
    internalDepMap[property.reqid] = new Set();
  }

  for (const internalVar of contract.internalVariables) {
    outputDepMap[internalVar.name] = new Set();
    internalDepMap[internalVar.name] = new Set();
  }

  const outputNames = new Set(contract.outputVariables.map((variable) => variable.name));
  const internalNames = new Set(contract.internalVariables.map((variable) => variable.name));

  for (const internalVar of contract.internalVariables) {
    for (const dependencyName of internalVar.dependencyNames || []) {
      if (outputNames.has(dependencyName)) {
        outputDepMap[internalVar.name].add(dependencyName);
      }
      if (internalNames.has(dependencyName)) {
        internalDepMap[internalVar.name].add(dependencyName);
      }
    }
  }

  for (const internalVar of contract.internalVariables) {
    computeOutputDependencies(internalVar.name, internalDepMap, outputDepMap, false);
  }

  for (const property of contract.properties) {
    for (const dependencyName of property.dependencyNames || []) {
      if (outputNames.has(dependencyName)) {
        outputDepMap[property.reqid].add(dependencyName);
      }
      if (internalNames.has(dependencyName)) {
        internalDepMap[property.reqid].add(dependencyName);
      }
    }
  }

  for (const property of contract.properties) {
    computeOutputDependencies(property.reqid, internalDepMap, outputDepMap, true);
  }

  return { internal: internalDepMap, output: outputDepMap };
}

function computeConnectedComponents(contract, outputDepMap) {
  let disjointList = [];
  let hasIntersection = false;

  for (const property of contract.properties) {
    if (!property.reqid.toLowerCase().includes("assumption")) {
      const dependencySet = outputDepMap[property.reqid] || new Set();

      if (disjointList.length === 0) {
        disjointList.push({
          properties: new Set([property.reqid]),
          outputs: new Set(dependencySet)
        });
      } else {
        for (const connectedComponent of disjointList) {
          const intersection = setIntersection(connectedComponent.outputs, dependencySet);
          if (intersection.size > 0) {
            connectedComponent.properties.add(property.reqid);
            connectedComponent.outputs = setUnion(dependencySet, connectedComponent.outputs);
            hasIntersection = true;
            break;
          }
        }

        if (!hasIntersection) {
          disjointList.push({
            properties: new Set([property.reqid]),
            outputs: new Set(dependencySet)
          });
        }
      }
    }
    hasIntersection = false;
  }

  if (disjointList.length > 1) {
    disjointList = disjointList.reduce((merged, current) => {
      for (let index = 0; index < merged.length; index += 1) {
        if ([...current.outputs].some((output) => merged[index].outputs.has(output))) {
          for (const property of current.properties) {
            merged[index].properties.add(property);
          }
          for (const output of current.outputs) {
            merged[index].outputs.add(output);
          }
          return merged;
        }
      }
      merged.push(current);
      return merged;
    }, []);
  }

  for (const property of contract.properties) {
    if (property.reqid.toLowerCase().includes("assumption")) {
      for (const connectedComponent of disjointList) {
        connectedComponent.properties.add(property.reqid);
      }
    }
  }

  if (disjointList.length === 0 && contract.properties.length > 0) {
    disjointList = [
      {
        properties: new Set(contract.properties.map((property) => property.reqid)),
        outputs: new Set()
      }
    ];
  }

  return disjointList;
}

module.exports = {
  computeConnectedComponents,
  computeDependencyMaps
};
