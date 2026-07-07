# NASA vs Ours Comparison

- Dataset: `D:\myWorkspace\FirstYear\第二学期\算法与设计分析作业\作业＋汇报\CompositionVerification\datasets\LMCPS\LM_requirements.json`
- Components: 13

| Component | Reqs | NASA CCs | NASA Max | Ours Groups | Ours Max | Ours Edges | Data | State | Shared | State Vars |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Autopilot | 9 | 4 | 4 | 4 | 4 | 32 | 0 | 0 | 32 | 0 |
| EB | 3 | 2 | 2 | 2 | 2 | 22 | 0 | 0 | 22 | 0 |
| Euler | 20 | 1 | 20 | 6 | 15 | 108 | 0 | 0 | 108 | 0 |
| FSM | 3 | 1 | 3 | 1 | 3 | 6 | 0 | 0 | 6 | 0 |
| FSM_Autopilot | 12 | 1 | 12 | 1 | 12 | 254 | 0 | 0 | 254 | 0 |
| FSM_Sensor | 6 | 1 | 6 | 1 | 6 | 68 | 0 | 0 | 68 | 0 |
| NLGuidance | 7 | 7 | 1 | 7 | 1 | 0 | 0 | 0 | 0 | 0 |
| NN | 5 | 1 | 5 | 3 | 3 | 6 | 0 | 0 | 6 | 0 |
| Regulator | 10 | 5 | 2 | 10 | 1 | 0 | 0 | 0 | 0 | 0 |
| RollAutopilot | 8 | 2 | 6 | 2 | 6 | 24 | 0 | 0 | 24 | 0 |
| SWIM | 3 | 2 | 2 | 2 | 2 | 2 | 0 | 0 | 2 | 0 |
| TriplexSignalMonitor | 6 | 1 | 6 | 1 | 6 | 32 | 0 | 0 | 32 | 0 |
| Tustin_Integrator | 5 | 1 | 5 | 1 | 5 | 32 | 0 | 0 | 32 | 0 |

## Notes

- `NASA CCs` is the connected-component count from the FM 2021-style baseline.
- `Ours Groups` is the root-reachability grouping result after dependency derivation and SCC collapse.
- `State Vars` is the number of variables that the aligned implementation classified as state-related.
