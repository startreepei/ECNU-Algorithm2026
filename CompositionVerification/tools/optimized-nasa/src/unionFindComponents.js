class UnionFind {
  constructor(items) {
    this.parent = new Map();
    this.rank = new Map();
    for (const item of items) {
      this.parent.set(item, item);
      this.rank.set(item, 0);
    }
  }

  find(item) {
    const parent = this.parent.get(item);
    if (parent === undefined) {
      this.parent.set(item, item);
      this.rank.set(item, 0);
      return item;
    }
    if (parent !== item) {
      const root = this.find(parent);
      this.parent.set(item, root);
      return root;
    }
    return parent;
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) {
      return false;
    }

    const leftRank = this.rank.get(leftRoot) || 0;
    const rightRank = this.rank.get(rightRoot) || 0;
    if (leftRank < rightRank) {
      this.parent.set(leftRoot, rightRoot);
    } else if (leftRank > rightRank) {
      this.parent.set(rightRoot, leftRoot);
    } else {
      this.parent.set(rightRoot, leftRoot);
      this.rank.set(leftRoot, leftRank + 1);
    }
    return true;
  }
}

function isAssumption(property) {
  return String(property.reqid || "").toLowerCase().includes("assumption");
}

function computeConnectedComponentsUnionFind(contract, outputDepMap, options = {}) {
  const nonAssumptions = contract.properties.filter((property) => !isAssumption(property));
  const assumptions = contract.properties.filter(isAssumption);
  const requirementIds = nonAssumptions.map((property) => property.reqid);
  const indexByRequirement = new Map(requirementIds.map((id, index) => [id, index]));
  const parent = requirementIds.map((_, index) => index);
  const rank = requirementIds.map(() => 0);
  const firstIndexByOutput = new Map();
  const outputsByIndex = [];

  const stats = {
    properties: nonAssumptions.length,
    assumptions: assumptions.length,
    outputReferences: 0,
    distinctOutputs: 0,
    unionAttempts: 0,
    successfulUnions: 0
  };

  function findIndex(index) {
    let root = index;
    while (parent[root] !== root) {
      root = parent[root];
    }
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  }

  function unionIndex(left, right) {
    const leftRoot = findIndex(left);
    const rightRoot = findIndex(right);
    if (leftRoot === rightRoot) {
      return false;
    }

    if (rank[leftRoot] < rank[rightRoot]) {
      parent[leftRoot] = rightRoot;
    } else if (rank[leftRoot] > rank[rightRoot]) {
      parent[rightRoot] = leftRoot;
    } else {
      parent[rightRoot] = leftRoot;
      rank[leftRoot] += 1;
    }
    return true;
  }

  for (const property of nonAssumptions) {
    const propertyIndex = indexByRequirement.get(property.reqid);
    const outputs = new Set(outputDepMap[property.reqid] || []);
    outputsByIndex[propertyIndex] = outputs;
    stats.outputReferences += outputs.size;

    for (const output of outputs) {
      if (firstIndexByOutput.has(output)) {
        stats.unionAttempts += 1;
        if (unionIndex(propertyIndex, firstIndexByOutput.get(output))) {
          stats.successfulUnions += 1;
        }
      } else {
        firstIndexByOutput.set(output, propertyIndex);
      }
    }
  }

  stats.distinctOutputs = firstIndexByOutput.size;

  const componentsByRoot = new Map();
  for (let index = 0; index < nonAssumptions.length; index += 1) {
    const property = nonAssumptions[index];
    const root = findIndex(index);
    if (!componentsByRoot.has(root)) {
      componentsByRoot.set(root, {
        properties: new Set(),
        outputs: new Set()
      });
    }

    const component = componentsByRoot.get(root);
    component.properties.add(property.reqid);
    for (const output of outputsByIndex[index] || []) {
      component.outputs.add(output);
    }
  }

  let components = Array.from(componentsByRoot.values());
  for (const assumption of assumptions) {
    for (const component of components) {
      component.properties.add(assumption.reqid);
    }
  }

  if (components.length === 0 && contract.properties.length > 0) {
    components = [
      {
        properties: new Set(contract.properties.map((property) => property.reqid)),
        outputs: new Set()
      }
    ];
  }

  stats.components = components.length;
  if (options.withStats) {
    return { components, stats };
  }
  return components;
}

module.exports = {
  UnionFind,
  computeConnectedComponentsUnionFind
};
