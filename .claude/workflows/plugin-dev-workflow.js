export const meta = {
  name: 'intellij-plugin-dev',
  description: '三Agent协作开发IntelliJ插件：监督者规划 -> 执行者编码 -> 校验者审查',
  phases: [
    { title: '监督', detail: '需求分析 + 任务拆解' },
    { title: '执行', detail: '编码实现' },
    { title: '校验', detail: '完成度审查' },
  ],
}

// ============================================================
// 三Agent协作模式：监督者 → 执行者 → 校验者
// 适用于 D:\需求开发\ 的 IntelliJ 插件开发
// ============================================================

phase('监督')
const plan = await agent(`
你是有经验的IntelliJ插件架构师（监督者）。

## 你的任务
分析以下开发需求，拆解为具体的编码任务清单。

## 你需要输出
1. 需求理解：一句话概括要做什么
2. 影响分析：涉及哪些现有文件（按 D:\\需求开发\\ 的项目结构）
3. 任务清单：每个任务包含：
   - 任务ID
   - 文件路径（相对于 D:\\需求开发\\）
   - 任务描述
   - 难度（简单/中等/复杂）
   - 依赖（依赖哪个前置任务）
4. 验收标准：每个任务完成的标准是什么
5. 风险点：可能遇到的问题

## 约束
- Java 代码遵循 java-coding-standards skill 的规范
- TSX 代码使用 React + JCEF 通信模式
- 项目路径：D:\\需求开发\\
- 包名根据 src\\main\\java\\ 下的实际目录结构确定
`, {
  label: '监督者-架构师',
  phase: '监督',
  schema: {
    type: 'object',
    properties: {
      requirement: { type: 'string', description: '一句话概括需求' },
      impactAnalysis: {
        type: 'array',
        items: { type: 'string', description: '影响的文件路径' },
        description: '受影响文件列表'
      },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '任务ID，如 T-001' },
            filePath: { type: 'string', description: '文件路径' },
            description: { type: 'string', description: '任务描述' },
            difficulty: { type: 'string', enum: ['简单', '中等', '复杂'] },
            dependsOn: { type: 'array', items: { type: 'string' } },
          },
          required: ['id', 'filePath', 'description', 'difficulty'],
        },
      },
      acceptanceCriteria: {
        type: 'array',
        items: { type: 'string' },
        description: '验收标准列表',
      },
    },
    required: ['requirement', 'tasks', 'acceptanceCriteria'],
  },
})


phase('执行')
const results = await pipeline(
  plan.tasks,
  async (task) => {
    // 执行者：根据监督者的任务清单逐个实现
    const result = await agent(`
你是有经验的Java/TSX开发者（执行者）。

## 当前任务
${JSON.stringify(task, null, 2)}

## 项目整体需求
${plan.requirement}

## 编码要求
- Java：遵循 java-coding-standards skill（构造器注入、record、Optional等）
- TSX：使用 React 函数组件 + TypeScript
- 异常处理：使用自定义异常 + 统一异常处理
- 注释：关键逻辑写中文注释

## 项目路径
D:\\需求开发\\

请直接生成完整的代码，包括所有 imports。
`, {
      label: `执行者-${task.id}`,
      phase: '执行',
      schema: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          filePath: { type: 'string' },
          code: { type: 'string', description: '完整代码内容' },
          changes: { type: 'string', description: '所做的修改说明' },
          status: { type: 'string', enum: ['完成', '部分完成', '跳过'] },
        },
        required: ['taskId', 'filePath', 'code', 'status'],
      },
    })

    return { task, result }
  },
  // 每个任务完成后立即校验（无需等所有任务完成）
  async ({ task, result }) => {
    const verify = await agent(`
你是严格的质量校验者。

## 审查对象
任务: ${task.id} - ${task.description}
代码路径: ${result.filePath}

## 验收标准
${plan.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## 审查清单
1. 代码是否符合 java-coding-standards 规范？
2. 是否处理了边界情况和异常？
3. 是否有遗漏的逻辑？
4. API设计是否合理？
5. 有无明显的bug或安全问题？

## 输出结论
- PASS：完全达标
- WARN：有小问题需要修改
- FAIL：不达标，需要重做
`, {
      label: `校验者-${task.id}`,
      phase: '校验',
      schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['PASS', 'WARN', 'FAIL'] },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['严重', '中等', '轻微'] },
                description: { type: 'string' },
                suggestion: { type: 'string' },
              },
            },
          },
          summary: { type: 'string', description: '总体评价' },
        },
        required: ['verdict', 'issues', 'summary'],
      },
    })

    return { task, result, verify }
  }
)


phase('汇总')
const finalReport = await agent(`
你是项目经理，汇总这次的开发结果。

## 原始需求
${plan.requirement}

## 完成情况
${results.map(r => `
### ${r.task.id} (${r.task.description})
- 状态：${r.result.status}
- 校验：${r.verify.verdict}
- 问题数：${r.verify.issues.length}
${r.verify.issues.map(i => `  - [${i.severity}] ${i.description}`).join('\n')}
`).join('\n')}

## 输出
1. 总体完成度（百分比）
2. 遗留问题清单
3. 后续建议
`, {
  label: '监督者-汇总',
  phase: '汇总',
  schema: {
    type: 'object',
    properties: {
      completionRate: { type: 'number', description: '完成度 0-100' },
      remainingIssues: {
        type: 'array',
        items: { type: 'string' },
      },
      suggestions: {
        type: 'array',
        items: { type: 'string' },
      },
      shipReady: { type: 'boolean', description: '是否可以交付' },
    },
    required: ['completionRate', 'remainingIssues', 'shipReady'],
  },
})

return {
  plan: plan.requirement,
  taskCount: plan.tasks.length,
  completionRate: finalReport.completionRate,
  shipReady: finalReport.shipReady,
  report: finalReport,
}
