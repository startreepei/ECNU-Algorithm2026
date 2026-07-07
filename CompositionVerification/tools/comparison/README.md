# Comparison Runner

This directory contains a unified batch runner for comparing:

- the NASA/FM 2021 connected-component baseline in `experiments/NASA`
- the aligned implementation of your method in `experiments/Ours`

The runner uses the same FRET-exported dataset input as both implementations:

- `requirements`
- `variables`

It can also invoke the FRETish compiler first, so the comparison can start from human-readable FRETish requirements plus an optional variable table.

## Usage

Run on the default LiquidMixer dataset:

```powershell
node run.js
```

Run on selected components from LMCPS:

```powershell
node run.js --dataset ..\Data\LMCPS\LM_requirements.json --components FSM_Autopilot,FSM_Sensor,Euler
```

Run on all components in a dataset:

```powershell
node run.js --dataset ..\Data\LMCPS\LM_requirements.json
```

Compile FRETish requirements first and then run the comparison:

```powershell
node run.js --fretish-requirements ..\FRETish\output\LM_reqts_and_vars\fretish-input.json
```

Compile FRETish requirements with a separate variable table:

```powershell
node run.js --fretish-requirements ..\FRETish\output\LM_requirements\requirements.csv --variables ..\FRETish\output\LM_requirements\variables.csv
```

## Output

For each dataset, the runner writes:

- `comparison.json`: detailed per-component comparison
- `comparison.csv`: compact table for plotting or spreadsheet analysis
- `comparison.md`: readable summary table

When `--fretish-requirements` is used, the compiled intermediate JSON and parse report are written under:

- `experiments/Comparison/output/_compiled-inputs/`

Files are stored under:

- `experiments/Comparison/output/<dataset>/`

## Metrics

The current comparison includes:

- NASA connected-component count and group sizes
- Ours group count and group sizes
- Ours dependency-edge counts by kind
- Ours detected state-variable counts

This is meant to support decomposition-focused experiments before solver-level measurements are added.
