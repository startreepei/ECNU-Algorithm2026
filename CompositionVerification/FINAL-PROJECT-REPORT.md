# 期末大作业阶段性成果：FRET 组合式可实现性复现与优化

## 1. 材料阅读与任务边界

重新自查后，已读取根目录新增的 `算法课程期末大作业.pdf`。作业要求包括：基于前期课程论文报告完成算法复现、实验分析、小规模改进或扩展实验，并提交报告论文 PDF、代码压缩包和运行说明 README。当前可读材料包括：

- `Mavridou 等 - 2021 - From Partial to Global Assume-Guarantee Contracts Compositional Realizability Analysis in FRET.pdf`
- `From Partial to Global Assume-Guarantee Contracts Compositional Realizability Analysis in FRET.pptx`
- `CompositionVerification/docs/FM_2026_paper_205.pdf`
- `CompositionVerification` 中的代码、数据集和已有实验输出

因此本文档按作业要求组织：对先前汇报的 Mavridou 2021 论文进行复现、提出一个不照搬参考 FM2026 工作的优化方向，并给出实验分析。正式报告论文见 `COURSE_REPORT.md` 和 `output/pdf/course_report.pdf`。

`FM_2026_paper_205.pdf` 和 `tools/our-method` 的核心思路是 dependency-enhanced decomposition，即从 data、state、shared target 等隐式依赖构建需求图并分组。本文没有沿用该优化方向，而是针对 Mavridou/NASA 原方法本身的连通分量计算做工程和复杂度优化。

## 2. 论文方法复现

Mavridou 2021 的核心问题是可实现性检查：给定 assume-guarantee contract，判断是否存在一个实现，使系统在任意满足假设的环境输入下都能持续满足保证。

论文的组合式思想是：

1. 将全局 AG contract 拆成多个 partial contracts。
2. 每个 partial contract 只观察全局状态变量集合的一部分。
3. 若这些 partial contracts 不共享状态变量、互不干扰，则全局可实现性可转化为每个 partial contract 的可实现性。
4. 实现上，根据每条需求涉及的输出/状态变量建立连通关系，对需求图求 connected components，每个连通分量生成一个局部 Lustre contract。

本项目中复现入口为：

```powershell
node run.js nasa --dataset datasets/LMCPS/LM_requirements.json
```

复现中还生成了 NASA baseline 与参考 method 的对比：

```powershell
node run.js compare --dataset datasets/LMCPS/LM_requirements.json --out-dir outputs/reproduction
```

主要复现结果如下，完整结果见 `outputs/reproduction/LM_requirements/comparison.md`。

| Component | Requirements | NASA CCs | Max CC Size |
| --- | ---: | ---: | ---: |
| Autopilot | 9 | 4 | 4 |
| EB | 3 | 2 | 2 |
| Euler | 20 | 1 | 20 |
| FSM | 3 | 1 | 3 |
| FSM_Autopilot | 12 | 1 | 12 |
| FSM_Sensor | 6 | 1 | 6 |
| NLGuidance | 7 | 7 | 1 |
| NN | 5 | 1 | 5 |
| Regulator | 10 | 5 | 2 |
| RollAutopilot | 8 | 2 | 6 |
| SWIM | 3 | 2 | 2 |
| TriplexSignalMonitor | 6 | 1 | 6 |
| Tustin_Integrator | 5 | 1 | 5 |

形式化求解器没有在本机环境中完成调用：`--check` 报告缺少 `jkind/jrealizability` 和 `z3`。因此当前复现覆盖“数据读取、依赖映射、连通分量分解、Lustre 文件生成”，不声称完成真实 solver 层面的 realizability verdict。

## 3. 优化方向：倒排索引 + 并查集

原始实现的关键函数在 `tools/nasa-method/src/connectedComponents.js`。其做法是逐条需求处理输出依赖集合，并与已有 connected components 的输出集合求交；如果有交集，则合并到该分量。

这种写法直观，但在许多需求互不共享输出变量时，会不断和已有分量做集合交叉，最坏情况下接近二次增长。

本文实现的优化是：

1. 为每个输出变量建立倒排索引：`output -> first requirement touching output`。
2. 扫描每条需求的输出依赖集合。
3. 如果某输出变量已出现，则用并查集合并当前需求和第一次出现该输出的需求。
4. 扫描结束后，按并查集根节点聚合 connected components。
5. assumption 需求仍按原方法加入所有分量，保证分解语义不变。

复杂度对比：

| Step | Baseline implementation | Optimized implementation |
| --- | --- | --- |
| 建图/分解 | 逐需求与已有分量求交，最坏约 `O(n^2 * k)` | 扫描输出引用并 union，约 `O((n + m) alpha(n))` |
| 额外空间 | 已有分量输出集合 | 输出倒排索引 + 并查集 |
| 语义 | 共享输出变量连通 | 完全相同 |

新增代码：

- `tools/optimized-nasa/src/unionFindComponents.js`
- `tools/optimized-nasa/analyze.js`
- `tools/benchmark-optimization.js`
- `run.js` 新增 `optimized` 和 `benchmark` 命令

运行优化版：

```powershell
node run.js optimized --dataset datasets/LMCPS/LM_requirements.json --component Euler
```

运行 benchmark：

```powershell
node run.js benchmark --dataset datasets/LMCPS/LM_requirements.json --scales 1,10,50,100,500 --repeat 30 --out-dir outputs/optimization-benchmark
```

## 4. 实验分析

benchmark 使用 LMCPS 数据集的 13 个组件，并通过复制需求记录构造 1、10、50、100、500 倍规模，用于观察算法趋势。计时只覆盖 connected-component decomposition 阶段，不包含 FRET JSON 读取和 solver 调用。

所有 65 组实验均满足 `equivalent=true`，即优化版和 baseline 产生完全相同的需求分区。完整数据见：

- `outputs/optimization-benchmark/LM_requirements/benchmark.json`
- `outputs/optimization-benchmark/LM_requirements/benchmark.csv`
- `outputs/optimization-benchmark/LM_requirements/benchmark.md`

代表性结果如下：

| Component | Scale | Requirements | Baseline median ms | Optimized median ms | Speedup |
| --- | ---: | ---: | ---: | ---: | ---: |
| NLGuidance | 1 | 7 | 0.0041 | 0.0023 | 1.78 |
| NLGuidance | 10 | 70 | 0.1011 | 0.0127 | 7.96 |
| NLGuidance | 50 | 350 | 1.9417 | 0.0673 | 28.85 |
| NLGuidance | 100 | 700 | 7.7197 | 0.1368 | 56.43 |
| NLGuidance | 500 | 3500 | 175.3034 | 0.9953 | 176.13 |
| Euler | 100 | 2000 | 0.9933 | 0.9064 | 1.10 |
| Euler | 500 | 10000 | 7.1751 | 7.1872 | 1.00 |
| Autopilot | 500 | 4500 | 1.1252 | 2.7630 | 0.41 |
| Regulator | 500 | 5000 | 1.4581 | 2.0840 | 0.70 |

结论：

1. 当需求之间几乎没有共享输出变量、分量很多时，baseline 会反复做无收益的集合交叉，优化版优势非常明显。`NLGuidance x500` 达到约 176 倍加速。
2. 当组件高度耦合、很快合并成少数大分量时，baseline 的常数开销更低；并查集和倒排索引的额外开销可能反而变慢。
3. 因此该优化不是“所有输入上都更快”，而是改进了原算法在大量独立需求场景下的最坏趋势。实际系统可进一步做 hybrid 策略：先统计输出引用稀疏度，再选择 baseline 或 union-find。

## 5. 可提交内容

本阶段可提交的核心内容：

- 论文复现：`tools/nasa-method` 与 `outputs/reproduction/LM_requirements/comparison.md`
- 优化实现：`tools/optimized-nasa`
- 优化实验：`tools/benchmark-optimization.js` 与 `outputs/optimization-benchmark/LM_requirements/benchmark.md`
- 分析报告：本文档

后续若需要补充完整 solver verdict，需要安装并配置 `jkind/jrealizability` 和 `z3`，再运行 `node run.js nasa ... --check` 与 `node run.js optimized ... --check`。
