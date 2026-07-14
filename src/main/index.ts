import electron = require('electron')
import path = require('path')
import { initDatabase, getDB } from './database'

const { app, BrowserWindow, ipcMain, dialog } = electron

let mainWindow: InstanceType<typeof BrowserWindow> | null = null

// 判断是否为开发模式
const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '黑马记账',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发模式：加载 Vite 开发服务器
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    // 生产模式：加载打包后的 HTML 文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// =================== IPC 通信处理 ===================
// 这些函数是渲染进程（界面）和主进程（后台）之间的通信桥梁

function setupIPC() {
  // 获取所有支出记录
  ipcMain.handle('expense:getAll', async (_event, month?: string) => {
    const db = getDB()
    if (!db) return []

    let sql = 'SELECT * FROM expenses'
    const params: any[] = []

    if (month) {
      sql += ' WHERE date LIKE ?'
      params.push(`${month}%`) // month 格式: YYYY-MM
    }

    sql += ' ORDER BY date DESC, id DESC'
    const results = db.exec(sql, params)
    if (results.length === 0) return []

    const columns: string[] = results[0].columns
    return results[0].values.map((row: any[]) => {
      const record: Record<string, any> = {}
      columns.forEach((col: string, i: number) => {
        record[col] = row[i]
      })
      return record
    })
  })

  // 添加一条支出记录
  ipcMain.handle(
    'expense:add',
    async (
      _event,
      data: { amount: number; category_l1: string; category_l2: string; note?: string; date: string }
    ) => {
      const db = getDB()
      if (!db) throw new Error('数据库未初始化')

      const now = new Date().toISOString()
      db.run(
        'INSERT INTO expenses (amount, category_l1, category_l2, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [data.amount, data.category_l1, data.category_l2, data.note || '', data.date, now]
      )

      // 将数据库保存到磁盘
      saveDatabase()
      return { success: true }
    }
  )

  // 删除一条支出记录
  ipcMain.handle('expense:delete', async (_event, id: number) => {
    const db = getDB()
    if (!db) throw new Error('数据库未初始化')

    db.run('DELETE FROM expenses WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })

  // 更新一条支出记录
  ipcMain.handle(
    'expense:update',
    async (
      _event,
      data: { id: number; amount: number; category_l1: string; category_l2: string; note?: string; date: string }
    ) => {
      const db = getDB()
      if (!db) throw new Error('数据库未初始化')

      db.run(
        'UPDATE expenses SET amount = ?, category_l1 = ?, category_l2 = ?, note = ?, date = ? WHERE id = ?',
        [data.amount, data.category_l1, data.category_l2, data.note || '', data.date, data.id]
      )
      saveDatabase()
      return { success: true }
    }
  )

  // 按月份统计总支出
  ipcMain.handle('expense:getMonthlyTotal', async (_event, month: string) => {
    const db = getDB()
    if (!db) return { total: 0 }

    const results = db.exec('SELECT SUM(amount) as total FROM expenses WHERE date LIKE ?', [`${month}%`])
    if (results.length === 0 || !results[0].values[0]) return { total: 0 }

    return { total: results[0].values[0][0] || 0 }
  })

  // 按分类统计（用于饼图）
  ipcMain.handle('expense:getCategoryStats', async (_event, month?: string) => {
    const db = getDB()
    if (!db) return []

    let sql = 'SELECT category_l1, SUM(amount) as total FROM expenses'
    const params: any[] = []

    if (month) {
      sql += ' WHERE date LIKE ?'
      params.push(`${month}%`)
    }

    sql += ' GROUP BY category_l1 ORDER BY total DESC'

    const results = db.exec(sql, params)
    if (results.length === 0) return []

    const columns: string[] = results[0].columns
    return results[0].values.map((row: any[]) => {
      const record: Record<string, any> = {}
      columns.forEach((col: string, i: number) => {
        record[col] = row[i]
      })
      return record
    })
  })

  // 获取月度趋势数据（最近12个月）
  ipcMain.handle('expense:getMonthlyTrend', async () => {
    const db = getDB()
    if (!db) return []

    const sql = `
      SELECT substr(date, 1, 7) as month, SUM(amount) as total
      FROM expenses
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `
    const results = db.exec(sql)
    if (results.length === 0) return []

    const columns: string[] = results[0].columns
    return results[0].values.map((row: any[]) => {
      const record: Record<string, any> = {}
      columns.forEach((col: string, i: number) => {
        record[col] = row[i]
      })
      return record
    })
  })

  // ========== CSV 导出 ==========

  ipcMain.handle('expense:exportCSV', async (_event, month?: string) => {
    const db = getDB()
    if (!db) throw new Error('数据库未初始化')

    // 获取数据
    let sql = 'SELECT * FROM expenses'
    const params: any[] = []
    if (month) {
      sql += ' WHERE date LIKE ?'
      params.push(`${month}%`)
    }
    sql += ' ORDER BY date ASC, id ASC'
    const results = db.exec(sql, params)

    // 生成 CSV 内容
    const headers = ['日期', '金额', '一级分类', '二级分类', '备注']
    const csvRows: string[] = [headers.join(',')]

    if (results.length > 0) {
      const { columns, values } = results[0]
      const colMap: Record<string, number> = {}
      columns.forEach((c: string, i: number) => { colMap[c] = i })

      for (const row of values) {
        const csvRow = [
          row[colMap['date']],
          row[colMap['amount']],
          row[colMap['category_l1']],
          row[colMap['category_l2']],
          `"${(row[colMap['note']] || '').replace(/"/g, '""')}"`,
        ]
        csvRows.push(csvRow.join(','))
      }
    }

    const csvContent = '﻿' + csvRows.join('\n') // BOM for Excel Chinese support

    // 打开保存对话框
    const defaultName = month ? `黑马记账-${month}.csv` : '黑马记账-全部记录.csv'
    const { filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: '导出 CSV',
      defaultPath: defaultName,
      filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
    })

    if (filePath) {
      const fs = require('fs')
      fs.writeFileSync(filePath, csvContent, 'utf-8')
      return { success: true, path: filePath }
    }
    return { success: false, path: null }
  })

  // ========== 月度预算 ==========

  // 获取某月预算
  ipcMain.handle('budget:get', async (_event, month: string) => {
    const db = getDB()
    if (!db) return null

    const results = db.exec('SELECT * FROM budgets WHERE month = ?', [month])
    if (results.length === 0 || results[0].values.length === 0) return null

    const row = results[0].values[0]
    return { month: row[1], amount: row[2] }
  })

  // 设置某月预算
  ipcMain.handle('budget:set', async (_event, month: string, amount: number) => {
    const db = getDB()
    if (!db) throw new Error('数据库未初始化')

    const now = new Date().toISOString()
    // 使用 INSERT OR REPLACE 来处理新增和更新
    db.run(
      'INSERT OR REPLACE INTO budgets (month, amount, created_at) VALUES (?, ?, ?)',
      [month, amount, now]
    )
    saveDatabase()
    return { success: true }
  })
}

// =================== 数据库持久化 ===================

let dbPath: string

function saveDatabase() {
  const db = getDB()
  if (!db) return

  const fs = require('fs')
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

// =================== 应用生命周期 ===================

app.whenReady().then(async () => {
  // 初始化数据库
  dbPath = path.join(app.getPath('userData'), 'heima-accounting.db')
  await initDatabase(dbPath)

  setupIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
