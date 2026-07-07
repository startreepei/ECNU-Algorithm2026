# Optimization Benchmark

- Dataset: `D:\myWorkspace\FirstYear\第二学期\算法与设计分析作业\作业＋汇报\CompositionVerification\datasets\LMCPS\LM_requirements.json`
- Components: 13
- Scales: 1, 10, 50, 100, 500
- Repeat: 30

| Component | Scale | Reqs | Baseline CCs | Optimized CCs | Equivalent | Baseline median ms | Optimized median ms | Speedup |
| --- | ---: | ---: | ---: | ---: | :---: | ---: | ---: | ---: |
| Autopilot | 1 | 9 | 4 | 4 | yes | 0.0081 | 0.0087 | 0.93 |
| Autopilot | 10 | 90 | 4 | 4 | yes | 0.0317 | 0.0411 | 0.77 |
| Autopilot | 50 | 450 | 4 | 4 | yes | 0.1062 | 0.2184 | 0.49 |
| Autopilot | 100 | 900 | 4 | 4 | yes | 0.1654 | 0.3049 | 0.54 |
| Autopilot | 500 | 4500 | 4 | 4 | yes | 1.1252 | 2.763 | 0.41 |
| EB | 1 | 3 | 2 | 2 | yes | 0.0012 | 0.0026 | 0.46 |
| EB | 10 | 30 | 2 | 2 | yes | 0.0162 | 0.0222 | 0.73 |
| EB | 50 | 150 | 2 | 2 | yes | 0.0544 | 0.0705 | 0.77 |
| EB | 100 | 300 | 2 | 2 | yes | 0.1109 | 0.1539 | 0.72 |
| EB | 500 | 1500 | 2 | 2 | yes | 0.5801 | 0.8174 | 0.71 |
| Euler | 1 | 20 | 1 | 1 | yes | 0.0062 | 0.0063 | 0.98 |
| Euler | 10 | 200 | 1 | 1 | yes | 0.0756 | 0.0647 | 1.17 |
| Euler | 50 | 1000 | 1 | 1 | yes | 0.4117 | 0.3791 | 1.09 |
| Euler | 100 | 2000 | 1 | 1 | yes | 0.9933 | 0.9064 | 1.1 |
| Euler | 500 | 10000 | 1 | 1 | yes | 7.1751 | 7.1872 | 1 |
| FSM | 1 | 3 | 1 | 1 | yes | 0.0003 | 0.0007 | 0.43 |
| FSM | 10 | 30 | 1 | 1 | yes | 0.0037 | 0.0065 | 0.57 |
| FSM | 50 | 150 | 1 | 1 | yes | 0.018 | 0.031 | 0.58 |
| FSM | 100 | 300 | 1 | 1 | yes | 0.037 | 0.0673 | 0.55 |
| FSM | 500 | 1500 | 1 | 1 | yes | 0.3521 | 0.3564 | 0.99 |
| FSM_Autopilot | 1 | 12 | 1 | 1 | yes | 0.002 | 0.0033 | 0.61 |
| FSM_Autopilot | 10 | 120 | 1 | 1 | yes | 0.0204 | 0.0389 | 0.52 |
| FSM_Autopilot | 50 | 600 | 1 | 1 | yes | 0.1686 | 0.2177 | 0.77 |
| FSM_Autopilot | 100 | 1200 | 1 | 1 | yes | 0.1682 | 0.2976 | 0.57 |
| FSM_Autopilot | 500 | 6000 | 1 | 1 | yes | 0.9634 | 2.3231 | 0.41 |
| FSM_Sensor | 1 | 6 | 1 | 1 | yes | 0.0005 | 0.0013 | 0.38 |
| FSM_Sensor | 10 | 60 | 1 | 1 | yes | 0.0067 | 0.0116 | 0.58 |
| FSM_Sensor | 50 | 300 | 1 | 1 | yes | 0.0351 | 0.0686 | 0.51 |
| FSM_Sensor | 100 | 600 | 1 | 1 | yes | 0.1107 | 0.1367 | 0.81 |
| FSM_Sensor | 500 | 3000 | 1 | 1 | yes | 0.4355 | 0.8251 | 0.53 |
| NLGuidance | 1 | 7 | 7 | 7 | yes | 0.0041 | 0.0023 | 1.78 |
| NLGuidance | 10 | 70 | 70 | 70 | yes | 0.1011 | 0.0127 | 7.96 |
| NLGuidance | 50 | 350 | 350 | 350 | yes | 1.9417 | 0.0673 | 28.85 |
| NLGuidance | 100 | 700 | 700 | 700 | yes | 7.7197 | 0.1368 | 56.43 |
| NLGuidance | 500 | 3500 | 3500 | 3500 | yes | 175.3034 | 0.9953 | 176.13 |
| NN | 1 | 5 | 1 | 1 | yes | 0.0004 | 0.0013 | 0.31 |
| NN | 10 | 50 | 1 | 1 | yes | 0.0056 | 0.0096 | 0.58 |
| NN | 50 | 250 | 1 | 1 | yes | 0.033 | 0.0603 | 0.55 |
| NN | 100 | 500 | 1 | 1 | yes | 0.0553 | 0.0946 | 0.58 |
| NN | 500 | 2500 | 1 | 1 | yes | 0.3665 | 0.6709 | 0.55 |
| Regulator | 1 | 10 | 5 | 5 | yes | 0.0015 | 0.0021 | 0.71 |
| Regulator | 10 | 100 | 5 | 5 | yes | 0.0167 | 0.02 | 0.84 |
| Regulator | 50 | 500 | 5 | 5 | yes | 0.0816 | 0.1069 | 0.76 |
| Regulator | 100 | 1000 | 5 | 5 | yes | 0.187 | 0.261 | 0.72 |
| Regulator | 500 | 5000 | 5 | 5 | yes | 1.4581 | 2.084 | 0.7 |
| RollAutopilot | 1 | 8 | 2 | 2 | yes | 0.0008 | 0.0016 | 0.5 |
| RollAutopilot | 10 | 80 | 2 | 2 | yes | 0.0106 | 0.0163 | 0.65 |
| RollAutopilot | 50 | 400 | 2 | 2 | yes | 0.0573 | 0.097 | 0.59 |
| RollAutopilot | 100 | 800 | 2 | 2 | yes | 0.1205 | 0.2051 | 0.59 |
| RollAutopilot | 500 | 4000 | 2 | 2 | yes | 0.8504 | 1.5283 | 0.56 |
| SWIM | 1 | 3 | 2 | 2 | yes | 0.0004 | 0.0007 | 0.57 |
| SWIM | 10 | 30 | 2 | 2 | yes | 0.0042 | 0.0068 | 0.62 |
| SWIM | 50 | 150 | 2 | 2 | yes | 0.0214 | 0.0328 | 0.65 |
| SWIM | 100 | 300 | 2 | 2 | yes | 0.0436 | 0.0682 | 0.64 |
| SWIM | 500 | 1500 | 2 | 2 | yes | 0.2542 | 0.4292 | 0.59 |
| TriplexSignalMonitor | 1 | 6 | 1 | 1 | yes | 0.0006 | 0.0015 | 0.4 |
| TriplexSignalMonitor | 10 | 60 | 1 | 1 | yes | 0.0084 | 0.0136 | 0.62 |
| TriplexSignalMonitor | 50 | 300 | 1 | 1 | yes | 0.0466 | 0.0751 | 0.62 |
| TriplexSignalMonitor | 100 | 600 | 1 | 1 | yes | 0.0941 | 0.1663 | 0.57 |
| TriplexSignalMonitor | 500 | 3000 | 1 | 1 | yes | 0.6863 | 0.986 | 0.7 |
| Tustin_Integrator | 1 | 5 | 1 | 1 | yes | 0.0004 | 0.0011 | 0.36 |
| Tustin_Integrator | 10 | 50 | 1 | 1 | yes | 0.0057 | 0.0133 | 0.43 |
| Tustin_Integrator | 50 | 250 | 1 | 1 | yes | 0.0287 | 0.0478 | 0.6 |
| Tustin_Integrator | 100 | 500 | 1 | 1 | yes | 0.0576 | 0.1022 | 0.56 |
| Tustin_Integrator | 500 | 2500 | 1 | 1 | yes | 0.3694 | 0.6275 | 0.59 |

## Interpretation

- The baseline is the paper-style connected-component pass implemented in `tools/nasa-method`.
- The optimized version uses an output-to-requirement inverted index plus union-find.
- `Equivalent=yes` means both methods produced the same requirement partition.
- Timings cover only the connected-component decomposition step after dependency maps are already built.
