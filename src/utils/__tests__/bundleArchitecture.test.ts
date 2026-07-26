import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readRepositoryFile = (relativePath: string) => (
  readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8')
)

describe('large browser dependency loading', () => {
  it('registers only the ECharts features used by node statistics', () => {
    const runtime = readRepositoryFile(
      'src/views/nodeStatistics/components/chartRuntime.ts',
    )
    const card = readRepositoryFile(
      'src/views/nodeStatistics/components/NodeStatisticsChartCard.vue',
    )

    expect(runtime).toContain("import { BarChart } from 'echarts/charts'")
    expect(runtime).toContain("import { CanvasRenderer } from 'echarts/renderers'")
    expect(runtime).not.toMatch(/import \* as|await import\('echarts\/(?:charts|components|renderers)'\)/)
    expect(card).toContain("defineAsyncComponent(() => import('./chartRuntime'))")
  })

  it('runs ELK in a separately loaded web worker outside SSR tests', () => {
    const builder = readRepositoryFile('src/utils/flowchartBuilder.ts')
    const extension = readRepositoryFile('src-vscode/src/extension.ts')

    expect(builder).toContain('import.meta.env.SSR')
    expect(builder).toContain("import('elkjs/lib/elk-api.js')")
    expect(builder).toContain("import('elkjs/lib/elk-worker.min.js?worker')")
    expect(builder).toContain('workerFactory: () => new ElkWorker()')
    expect(extension).toContain('worker-src ${webview.cspSource} blob:')
  })
})
