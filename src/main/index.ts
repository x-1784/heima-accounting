/**
 * index.ts — Electron 主进程入口
 *
 * 这是整个桌面应用的"后台大脑"，负责：
 * 1. 创建应用窗口（BrowserWindow）
 * 2. 初始化本地数据库（SQLite）
 * 3. 搭建 IPC 通信桥梁（渲染进程 ↔ 主进程的数据交换）
 *    界面(渲染进程) → 发消息 → 主进程(本文件) → 操作数据库 → 返回数据 → 界面显示
 * 4. 管理自动更新流程（仅生产模式）
 *
 * 数据流向：
 *   用户操作界面 → electronAPI(预加载脚本) → IPC 通道 → 本文件 → SQLite 数据库
 *                                                              ↓
 *   界面显示结果 ← electronAPI(预加载脚本) ← IPC 通道 ← 返回结果
 */

import electron = require('electron')
import path = require('path')
import { initDatabase, getDB } from './database'
import { autoUpdater } from 'electron-updater'

const { app, BrowserWindow, ipcMain, dialog } = electron

/** 主窗口实例（全局只创建一个） */
let mainWindow: InstanceType<typeof BrowserWindow> | null = null

// 判断是否为开发模式（打包后的应用 isPackaged = true）
const isDev = !app.isPackaged

/**
 * 创建主应用窗口
 *
 * 安全配置说明（重要的安全设置）：
 * - contextIsolation: true  → 将界面代码和 Node.js 环境隔离开（防止恶意代码操作系统）
 * - nodeIntegration: false → 界面代码不能直接用 Node.js 能力（必须通过 preload 桥接）
 * - preload 脚本 → 在界面和主进程之间架起"安全桥梁"，只暴露白名单中的函数
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,   // 最小宽度（再小窗口中内容会挤变形）
    minHeight: 600,  // 最小高度
    title: '黑马记账',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,   // 🔒 安全: 隔离上下文
      nodeIntegration: false,   // 🔒 安全: 禁用 Node 集成
    },
  })

  // 开发模式：从 Vite 热更新开发服务器加载（修改代码立即生效）
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    // 生产模式：加载 Vite 构建后的静态文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// =================== IPC 通信处理器（"消息中转站"） ===================
// 渲染进程（界面）通过 electronAPI 发消息过来，主进程（这里）处理请求、操作数据库、返回结果。
// 每个 ipcMain.handle 对应一个功能入口，类似于"餐厅服务员 → 厨房"的点菜通道。

function setupIPC() {

  // ===== 支出记录 CRUD =====

  /**
   * 获取支出记录列表（可按月份筛选）
   *
   * SQL 说明：
   * - SELECT * FROM expenses：取出支出表中的全部字段
   * - WHERE date LIKE '2026-07%'：只匹配"2026-07"开头的日期（= 7月的所有记录）
   * - ORDER BY date DESC, id DESC：按日期最新的排前面，同一天则 ID 大的排前面
   * - sql.js 的 db.exec 返回的是列名+值的二维数组，需要手动转成对象数组
   */
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

  /**
   * 添加一条支出记录
   *
   * 安全说明：
   * SQL 用的是占位符 ?（参数化查询），不是字符串拼接。
   * 即使用户在备注里写了恶意的 SQL 语句，它也只是"备注文字"而非"要执行的命令"。
   * 这是防止 SQL 注入攻击的标准做法。
   */
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

      // 写入数据库后立即保存到磁盘，防止意外关闭导致数据丢失
      saveDatabase()
      return { success: true }
    }
  )

  /** 删除一条支出记录（按主键 id 定位，精确删除） */
  ipcMain.handle('expense:delete', async (_event, id: number) => {
    const db = getDB()
    if (!db) throw new Error('数据库未初始化')

    db.run('DELETE FROM expenses WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })

  /**
   * 更新一条支出记录
   *
   * UPDATE ... SET ... WHERE id = ?：只更新指定 id 的那一条记录，
   * 修改的内容为全部字段（金额、分类、日期、备注），不管改了哪个都会全量更新。
   */
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

  // ===== 统计分析 =====

  /**
   * 按月份统计总支出
   * SQL 的 SUM(amount) 把所有符合条件的记录金额加起来，
   * LIKE 配合 YYYY-MM% 模式匹配某一整月。
   */
  ipcMain.handle('expense:getMonthlyTotal', async (_event, month: string) => {
    const db = getDB()
    if (!db) return { total: 0 }

    const results = db.exec('SELECT SUM(amount) as total FROM expenses WHERE date LIKE ?', [`${month}%`])
    if (results.length === 0 || !results[0].values[0]) return { total: 0 }

    return { total: results[0].values[0][0] || 0 }
  })

  /**
   * 按一级分类汇总（饼图数据源）
   * GROUP BY category_l1 → 把相同分类的记录归为一组
   * ORDER BY total DESC → 金额最多的分类排最前
   */
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

  /**
   * 获取月度趋势数据（近 12 个月支出汇总）
   *
   * SQL 说明：
   * - substr(date, 1, 7)：从 "2026-07-15" 中截取 "2026-07"（取前7个字符=年-月）
   * - GROUP BY month：按月份分组
   * - ORDER BY month ASC LIMIT 12：升序取前 12 条
   *
   * ⚠️ 已修复：ORDER BY month DESC LIMIT 12，取最近的 12 个月（而非最早的 12 个月）。
   * 如需显示最早 12 个月，改回 ASC。
   */
  ipcMain.handle('expense:getMonthlyTrend', async () => {
    const db = getDB()
    if (!db) return []

    const sql = `
      SELECT substr(date, 1, 7) as month, SUM(amount) as total
      FROM expenses
      GROUP BY month
      ORDER BY month DESC
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

  /**
   * 导出支出数据为 CSV 文件（可用 Excel 打开）
   *
   * 流程：
   * 1. 从数据库查数据
   * 2. 将数据转为 CSV 格式（逗号分隔，备注字段双引号包裹+转义）
   * 3. 弹出系统的"另存为"窗口让用户选择保存位置
   * 4. 写入文件
   *
   * CSV 文件头加了 BOM 标记（﻿，字节序标记），让 Excel 能正确识别中文编码。
   * 不加这个的话，Excel 打开中文 CSV 会乱码。
   */
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

    // 生成 CSV 内容（表头行）
    const headers = ['日期', '金额', '一级分类', '二级分类', '备注']
    const csvRows: string[] = [headers.join(',')]

    if (results.length > 0) {
      const { columns, values } = results[0]
      // 建立列名到索引的映射（以防 SQL 返回的列顺序变化）
      const colMap: Record<string, number> = {}
      columns.forEach((c: string, i: number) => { colMap[c] = i })

      for (const row of values) {
        const csvRow = [
          row[colMap['date']],
          row[colMap['amount']],
          row[colMap['category_l1']],
          row[colMap['category_l2']],
          // 备注用双引号包裹，内部的双引号用两个双引号转义（CSV 标准格式）
          `"${(row[colMap['note']] || '').replace(/"/g, '""')}"`,
        ]
        csvRows.push(csvRow.join(','))
      }
    }

    // BOM 标记 + CSV 内容，让 Excel 正确识别 UTF-8 中文
    const csvContent = '﻿' + csvRows.join('\n')

    // 系统"另存为"对话框
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

  /** 获取某月的预算金额，未设置时返回 null */
  ipcMain.handle('budget:get', async (_event, month: string) => {
    const db = getDB()
    if (!db) return null

    const results = db.exec('SELECT * FROM budgets WHERE month = ?', [month])
    if (results.length === 0 || results[0].values.length === 0) return null

    const row = results[0].values[0]
    return { month: row[1], amount: row[2] }
  })

  /**
   * 设置某月的预算
   *
   * INSERT OR REPLACE：如果该月已有预算就覆盖，没有就新增。
   * 这样设计是因为一个月份只应该有一个预算，不必区分"新增"和"修改"两种操作。
   */
  ipcMain.handle('budget:set', async (_event, month: string, amount: number) => {
    const db = getDB()
    if (!db) throw new Error('数据库未初始化')

    const now = new Date().toISOString()
    db.run(
      'INSERT OR REPLACE INTO budgets (month, amount, created_at) VALUES (?, ?, ?)',
      [month, amount, now]
    )
    saveDatabase()
    return { success: true }
  })

  // ========== 用户自定义分类（CRUD） ==========

  /** 系统预置的分类名称，用户不能创建或修改这些分类 */
  const PRESET_CATEGORY_NAMES = [
    '餐饮美食', '交通出行', '购物消费', '住房居家', '休闲娱乐',
    '医疗健康', '教育学习', '金融理财', '家庭生活', '其他支出',
  ]

  const PRESET_CATEGORY_NAMES = [
    '餐饮美食', '交通出行', '购物消费', '住房居家', '休闲娱乐',
    '医疗健康', '教育学习', '金融理财', '家庭生活', '其他支出',
  ]

  /**
   * 获取所有用户自定义分类
   * children 字段在数据库中存的是 JSON 字符串，需要解析成数组再返回
   */
  ipcMain.handle('category:getAll', async () => {
    const db = getDB()
    if (!db) return []

    const results = db.exec('SELECT * FROM user_categories ORDER BY created_at ASC')
    if (results.length === 0) return []

    const columns: string[] = results[0].columns
    return results[0].values.map((row: any[]) => {
      const record: Record<string, any> = {}
      columns.forEach((col: string, i: number) => {
        record[col] = row[i]
      })
      // 将 children JSON 字符串解析为数组
      record.children = JSON.parse(record.children || '[]')
      return record
    })
  })

  /**
   * 添加用户自定义分类
   *
   * 校验流程（按顺序）：
   * 1. 名称不能为空
   * 2. 不能和预置分类重名
   * 3. 不能和已有用户分类重名
   * 4. 至少有一个二级分类
   *
   * 全部通过后才执行 INSERT。
   */
  ipcMain.handle(
    'category:add',
    async (_event, data: { category_l1: string; emoji?: string; children: string[] }) => {
      const db = getDB()
      if (!db) throw new Error('数据库未初始化')

      // 检查重名：与预置分类
      const normalizedName = data.category_l1.trim()
      if (!normalizedName) {
        return { success: false, message: '分类名称不能为空' }
      }
      if (PRESET_CATEGORY_NAMES.includes(normalizedName)) {
        return { success: false, message: `"${normalizedName}"是预置分类，不能重复创建` }
      }

      // 检查重名：与已有用户分类
      const existing = db.exec('SELECT id FROM user_categories WHERE category_l1 = ?', [normalizedName])
      if (existing.length > 0 && existing[0].values.length > 0) {
        return { success: false, message: `分类"${normalizedName}"已存在` }
      }

      if (!data.children || data.children.length === 0) {
        return { success: false, message: '请至少添加一个二级分类' }
      }

      const now = new Date().toISOString()
      const emoji = (data.emoji || '📌').trim() || '📌'
      db.run(
        'INSERT INTO user_categories (category_l1, emoji, children, created_at) VALUES (?, ?, ?, ?)',
        [normalizedName, emoji, JSON.stringify(data.children), now]
      )
      saveDatabase()
      return { success: true }
    }
  )

  // 更新用户自定义分类
  ipcMain.handle(
    'category:update',
    async (_event, data: { id: number; category_l1?: string; emoji?: string; children?: string[] }) => {
      const db = getDB()
      if (!db) throw new Error('数据库未初始化')

      // 获取原记录
      const old = db.exec('SELECT * FROM user_categories WHERE id = ?', [data.id])
      if (old.length === 0 || old[0].values.length === 0) {
        return { success: false, message: '分类不存在' }
      }
      const oldRow: any[] = old[0].values[0]

      const newL1 = data.category_l1?.trim()
      const newEmoji = data.emoji?.trim()
      const newChildren = data.children

      // 如果改了名称，检查重名
      if (newL1 && newL1 !== oldRow[1]) {
        if (PRESET_CATEGORY_NAMES.includes(newL1)) {
          return { success: false, message: `"${newL1}"是预置分类，不能使用此名称` }
        }
        const existing = db.exec('SELECT id FROM user_categories WHERE category_l1 = ? AND id != ?', [newL1, data.id])
        if (existing.length > 0 && existing[0].values.length > 0) {
          return { success: false, message: `分类"${newL1}"已存在` }
        }
      }

      const finalL1 = newL1 || oldRow[1]
      const finalEmoji = newEmoji || oldRow[2]
      const finalChildren = newChildren ? JSON.stringify(newChildren) : oldRow[3]

      if (newChildren !== undefined && newChildren.length === 0) {
        return { success: false, message: '请至少保留一个二级分类' }
      }

      db.run(
        'UPDATE user_categories SET category_l1 = ?, emoji = ?, children = ? WHERE id = ?',
        [finalL1, finalEmoji, finalChildren, data.id]
      )
      saveDatabase()
      return { success: true }
    }
  )

  // 删除用户自定义分类
  ipcMain.handle('category:delete', async (_event, id: number) => {
    const db = getDB()
    if (!db) throw new Error('数据库未初始化')

    db.run('DELETE FROM user_categories WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })

  // ========== 自动更新（通过 electron-updater 实现，仅在生产模式下生效） ==========

  /** 开始下载更新 */
  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  })

  /** 安装更新并重启应用 */
  ipcMain.handle('update:install', async () => {
    autoUpdater.quitAndInstall()
    return { success: true }
  })

  /** 手动检查更新 */
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return result
    } catch (err: any) {
      throw new Error(err.message)
    }
  })
}

// =================== 自动更新事件转发 ===================

function setupAutoUpdater() {
  // 发现新版本时通知渲染进程
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:available', info)
  })

  // 没有新版本时通知
  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('update:not-available', info)
  })

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:download-progress', progress)
  })

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:downloaded', info)
  })

  // 错误处理
  autoUpdater.on('error', (error) => {
    mainWindow?.webContents.send('update:error', error.message)
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
  // 1. 初始化数据库
  dbPath = path.join(app.getPath('userData'), 'heima-accounting.db')
  await initDatabase(dbPath)

  // 2. 注册 IPC
  setupIPC()

  // 3. 注册自动更新事件转发
  setupAutoUpdater()

  // 4. 创建窗口
  createWindow()

  // 5. 后台静默检查更新（仅生产模式，不阻塞窗口显示）
  if (app.isPackaged) {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.log('更新检查失败（可能无网络）:', err.message)
    })
  }

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
