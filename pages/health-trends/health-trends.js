const healthRecordService = require('../../services/health-record-service')
const { TREND_METRICS, TREND_RANGES, ENERGY_LEVELS } = require('../../constants/health-record')
const { buildTrend } = require('../../utils/health-trend')
const { beijingDateKey } = require('../../utils/beijing-date')

Page({
  data: { pageStatus: 'loading', errorMessage: '', records: [], metrics: TREND_METRICS, ranges: TREND_RANGES, selectedMetric: 'weightKg', selectedRange: '30', trend: { status: 'insufficient', points: [] }, metricLabel: '体重', metricUnit: 'kg', energyPoints: [] },
  onShow() { this.load() },
  async load() {
    const id = (this.loadId || 0) + 1; this.loadId = id; this.setData({ pageStatus: 'loading', errorMessage: '' })
    try { const result = await healthRecordService.listRecords(); if (id !== this.loadId) return; this.setData({ pageStatus: result.records.length ? 'ready' : 'empty', records: result.records }, () => this.refreshTrend()) }
    catch (error) { if (id === this.loadId) this.setData({ pageStatus: 'error', errorMessage: error.message || '暂时无法读取趋势数据' }) }
  },
  retryLoad() { this.load() },
  selectMetric(event) { this.setData({ selectedMetric: event.currentTarget.dataset.value }, () => this.refreshTrend()) },
  selectRange(event) { this.setData({ selectedRange: event.currentTarget.dataset.value }, () => this.refreshTrend()) },
  refreshTrend() {
    const metric = TREND_METRICS.find((item) => item.value === this.data.selectedMetric)
    const trend = buildTrend(this.data.records, metric.value, this.data.selectedRange, beijingDateKey())
    const energyPoints = metric.value === 'energyLevel' ? trend.points.map((point) => ({ ...point, dateLabel: point.date.slice(5), height: point.value / 3 * 100, label: (ENERGY_LEVELS.find((item) => item.score === point.value) || {}).label || '' })) : []
    this.setData({ trend, metricLabel: metric.label, metricUnit: metric.unit, energyPoints }, () => { if (metric.chartType === 'line' && trend.status === 'ready') wx.nextTick(() => this.drawLine(trend)) })
  },
  drawLine(trend) {
    const context = wx.createCanvasContext('healthTrendCanvas', this)
    const width = Math.min(320, (wx.getWindowInfo ? wx.getWindowInfo().windowWidth : 375) - 76); const height = 180; const padding = 24
    const span = Math.max(trend.max - trend.min, 0.1)
    context.setStrokeStyle('#dfe7d8'); context.setLineWidth(1); context.beginPath(); context.moveTo(padding, height - padding); context.lineTo(width - padding, height - padding); context.stroke()
    context.setStrokeStyle('#668f42'); context.setFillStyle('#668f42'); context.setLineWidth(3); context.beginPath()
    trend.points.forEach((point, index) => { const x = padding + (width - padding * 2) * index / Math.max(1, trend.points.length - 1); const y = height - padding - (point.value - trend.min) / span * (height - padding * 2); if (index === 0) context.moveTo(x, y); else context.lineTo(x, y) })
    context.stroke(); trend.points.forEach((point, index) => { const x = padding + (width - padding * 2) * index / Math.max(1, trend.points.length - 1); const y = height - padding - (point.value - trend.min) / span * (height - padding * 2); context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill() }); context.draw()
  }
})
