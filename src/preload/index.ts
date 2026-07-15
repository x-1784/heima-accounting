import electron = require('electron')

const { contextBridge, ipcRenderer } = electron

/**
 * 预加载脚本
 *
 * 通过 contextBridge 安全地将主进程的功能暴露给渲染进程（React 页面）。
 * 页面中可以通过 window.electronAPI 调用这些方法。
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // ========== 支出记录操作 ==========

  /** 获取所有支出记录，可选按月份筛选 (YYYY-MM) */
  getExpenses: (month?: string) => ipcRenderer.invoke('expense:getAll', month),

  /** 添加一条支出记录 */
  addExpense: (data: {
    amount: number
    category_l1: string
    category_l2: string
    note?: string
    date: string
  }) => ipcRenderer.invoke('expense:add', data),

  /** 删除一条支出记录 */
  deleteExpense: (id: number) => ipcRenderer.invoke('expense:delete', id),

  /** 更新一条支出记录 */
  updateExpense: (data: {
    id: number
    amount: number
    category_l1: string
    category_l2: string
    note?: string
    date: string
  }) => ipcRenderer.invoke('expense:update', data),

  // ========== 统计功能 ==========

  /** 获取某月的总支出 */
  getMonthlyTotal: (month: string) => ipcRenderer.invoke('expense:getMonthlyTotal', month),

  /** 获取分类支出统计（用于图表） */
  getCategoryStats: (month?: string) => ipcRenderer.invoke('expense:getCategoryStats', month),

  /** 获取月度趋势数据（最近12个月） */
  getMonthlyTrend: () => ipcRenderer.invoke('expense:getMonthlyTrend'),

  // ========== CSV 导出 ==========

  /** 导出支出记录为 CSV 文件 */
  exportCSV: (month?: string) => ipcRenderer.invoke('expense:exportCSV', month),

  // ========== 月度预算 ==========

  /** 获取某月的预算 */
  getBudget: (month: string) => ipcRenderer.invoke('budget:get', month),

  /** 设置某月的预算 */
  setBudget: (month: string, amount: number) => ipcRenderer.invoke('budget:set', month, amount),

  // ========== 自动更新 ==========

  /** 监听：发现新版本 */
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update:available', (_event, info) => callback(info))
  },

  /** 监听：无新版本 */
  onUpdateNotAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update:not-available', (_event, info) => callback(info))
  },

  /** 监听：下载进度 */
  onDownloadProgress: (callback: (progress: { percent: number }) => void) => {
    ipcRenderer.on('update:download-progress', (_event, progress) => callback(progress))
  },

  /** 监听：下载完成 */
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update:downloaded', (_event, info) => callback(info))
  },

  /** 监听：更新出错 */
  onUpdateError: (callback: (message: string) => void) => {
    ipcRenderer.on('update:error', (_event, message) => callback(message))
  },

  /** 手动检查更新 */
  checkForUpdates: () => ipcRenderer.invoke('update:check'),

  /** 开始下载更新 */
  downloadUpdate: () => ipcRenderer.invoke('update:download'),

  /** 安装更新并重启 */
  installUpdate: () => ipcRenderer.invoke('update:install'),
})
