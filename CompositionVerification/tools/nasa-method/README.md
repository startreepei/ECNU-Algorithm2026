# NASA Minimal Realizability Runner

This directory contains a standalone, minimal version of the compositional realizability flow described in:

- Anastasia Mavridou et al., *From Partial to Global Assume-Guarantee Contracts: Compositional Realizability Analysis in FRET*, FM 2021.

The implementation is derived from the original FRET sources but repackaged so it can run without FRET's database, Electron app, or webpack-specific template loaders.

## What this version does

- Reads exported FRET datasets in the `{ requirements, variables }` JSON format
- Builds per-component contracts directly from the dataset
- Computes dependency maps and connected components
- Writes monolithic and per-connected-component Lustre contracts
- Optionally invokes `jrealizability` or `kind2` if they are already installed

## What this version does not yet do

- Reuse FRET's internal database layer
- Render FRET `Function` declarations for solver execution
- Provide the GUI diagnosis workflow from FRET

## Usage

From this directory:

```powershell
node analyze.js
```

List components in a larger dataset:

```powershell
node analyze.js --list-components --dataset ../Data/LMCPS/LM_requirements.json
```

Analyze one component:

```powershell
node analyze.js --dataset ../Data/LMCPS/LM_requirements.json --component Euler
```

Run a solver if available:

```powershell
node analyze.js --dataset ../Data/LiquidMixer/LM_reqts_and_vars.json --component liquid_mixer --check
```

Switch to Kind 2:

```powershell
node analyze.js --dataset ../Data/LiquidMixer/LM_reqts_and_vars.json --component liquid_mixer --engine kind2
```

## Output

Generated files are written under:

```text
experiments/NASA/output/
```

For each component the runner writes:

- `monolithic.<engine>.lus`
- `cc0.<engine>.lus`, `cc1.<engine>.lus`, ...
- `report.json`

A dataset-level summary is also written as:

- `<dataset>.<engine>.summary.json`
