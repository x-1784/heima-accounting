import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'

let db: Database | null = null

/**
 * 初始化 SQLite 数据库
 * - 如果数据库文件已存在，读取并加载
 * - 如果不存在，创建新数据库并建表
 * - 同时初始化默认分类数据（如果分类表为空）
 */
export async function initDatabase(dbPath: string): Promise<void> {
  // sql.js 需要 WASM 文件路径
  // 在 Electron 中，sql.js 的 WASM 文件位于 node_modules 中
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  })

  // 尝试从磁盘加载已有数据库
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // 创建表（如果不存在）
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category_l1 TEXT NOT NULL,
      category_l2 TEXT NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  // 创建月度预算表
  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  // 创建用户自定义分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_l1 TEXT NOT NULL UNIQUE,
      emoji TEXT DEFAULT '📌',
      children TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  // 保存到磁盘
  saveToDisk(dbPath)
}

/**
 * 获取数据库实例
 */
export function getDB(): Database | null {
  return db
}

/**
 * 将数据库内容保存到磁盘文件
 */
function saveToDisk(dbPath: string): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}
