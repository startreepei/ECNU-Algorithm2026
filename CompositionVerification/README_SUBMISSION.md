# 算法课程期末大作业运行说明

## 1. 作业内容

本项目复现 Mavridou et al. FM 2021 论文中的 FRET 组合式可实现性分析方法，并实现一个小规模优化：

- Baseline：基于共享输出变量的 connected-component 分解。
- Optimization：基于输出变量倒排索引和并查集的等价分解加速。

优化没有采用 `FM_2026_paper_205.pdf` 中 dependency-enhanced decomposition 的思路，只针对原论文 baseline 的连通分量阶段做数据结构优化。

## 2. 环境依赖

需要 Node.js。实验使用环境：

```powershell
node --version
# v24.14.0
```

当前代码不需要额外 npm 安装即可运行核心复现实验。若需要执行真实 realizability solver，需要另行安装：

- `jkind` 或 `jrealizability`
- `z3`

本次提交未依赖 solver verdict，实验集中在需求分解和算法性能对比。

## 3. 目录说明

```text
CompositionVerification/
  run.js                              # 统一命令入口
  COURSE_REPORT.md                    # 报告论文 Markdown 源文件
  FINAL-PROJECT-REPORT.md             # 阶段性说明
  README_SUBMISSION.md                # 本运行说明
  datasets/LMCPS/LM_requirements.json # 主要实验数据
  tools/nasa-method/                  # 原论文 baseline 复现
  tools/optimized-nasa/               # 本次新增优化实现
  tools/benchmark-optimization.js     # 性能对比脚本
  outputs/reproduction/               # 复现实验输出
  outputs/optimization-benchmark/     # 优化实验输出
```

## 4. 运行命令

进入项目目录：

```powershell
cd CompositionVerification
```

列出数据集组件：

```powershell
node run.js list --dataset datasets/LMCPS/LM_requirements.json
```

运行原论文 baseline：

```powershell
node run.js nasa --dataset datasets/LMCPS/LM_requirements.json
```

生成 baseline 与参考方法对比：

```powershell
node run.js compare --dataset datasets/LMCPS/LM_requirements.json --out-dir outputs/reproduction
```

运行本文优化版：

```powershell
node run.js optimized --dataset datasets/LMCPS/LM_requirements.json --component Euler
```

运行优化 benchmark：

```powershell
node run.js benchmark --dataset datasets/LMCPS/LM_requirements.json --scales 1,10,50,100,500 --repeat 30 --out-dir outputs/optimization-benchmark
```

## 5. 输出文件

复现实验结果：

```text
outputs/reproduction/LM_requirements/comparison.md
outputs/reproduction/LM_requirements/comparison.csv
outputs/reproduction/LM_requirements/comparison.json
```

优化实验结果：

```text
outputs/optimization-benchmark/LM_requirements/benchmark.md
outputs/optimization-benchmark/LM_requirements/benchmark.csv
outputs/optimization-benchmark/LM_requirements/benchmark.json
```

优化版单组件运行输出：

```text
outputs/optimized-nasa/LM_requirements/<component>/report.json
outputs/optimized-nasa/LM_requirements/<component>/cc*.jkind.lus
outputs/optimized-nasa/LM_requirements/<component>/monolithic.jkind.lus
```

## 6. 本人完成或修改部分

主要新增文件：

- `tools/optimized-nasa/src/unionFindComponents.js`
- `tools/optimized-nasa/analyze.js`
- `tools/benchmark-optimization.js`
- `COURSE_REPORT.md`
- `README_SUBMISSION.md`

修改文件：

- `run.js`：新增 `optimized` 和 `benchmark` 命令，并修复命令入口说明。

使用的外部/已有代码：

- `tools/nasa-method`：用于复现 Mavridou et al. FM 2021 baseline。
- `fret-parser` 与相关 FRET 数据：来自 NASA FRET 工具链材料。

## 7. 结果说明

`outputs/optimization-benchmark/LM_requirements/benchmark.md` 中 65 组实验均为 `Equivalent=yes`，说明优化版与 baseline 分解结果一致。

代表性结果：`NLGuidance x500` 中 baseline connected-component 阶段中位数为 175.3034 ms，优化版为 0.9953 ms，约 176 倍加速。对于高度耦合组件，优化版可能因为额外数据结构开销而慢于 baseline，详见报告论文分析。
