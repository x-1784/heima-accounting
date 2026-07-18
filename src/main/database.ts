/**
 * database.ts — SQLite 数据库初始化与管理
 *
 * 这个文件负责：
 * 1. 创建/加载本地数据库文件
 * 2. 建立三张核心数据表（支出记录、预算、用户自定义分类）
 * 3. 提供数据库实例给 index.ts 中的 IPC 处理器使用
 *
 * 数据库引擎用的是 sql.js，它是 SQLite 编译成 WebAssembly 的版本，
 * 不需要用户单独安装任何数据库软件，完全嵌入在应用内部。
 */

import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'

/** 全局数据库实例（整个应用只创建一个） */
let db: Database | null = null

/**
 * 初始化 SQLite 数据库
 *
 * 流程：
 * 1. 定位 sql.js 的 WASM 文件（sql.js 是 WebAssembly 版 SQLite，需要加载这个二进制文件）
 * 2. 如果磁盘上已经有数据库文件 → 读取它（应用重启/重新打开的场景）
 * 3. 如果还没有 → 创建一个全新的空数据库
 * 4. 创建三张核心数据表（CREATE TABLE IF NOT EXISTS → 表不存在才建，已存在就跳过）
 * 5. 保存到磁盘
 *
 * 三张表：
 * - expenses：支出记录（核心表）
 * - budgets：月度预算（month 字段有 UNIQUE 约束，每月只能有一条预算）
 * - user_categories：用户自定义分类（children 以 JSON 字符串存储）
 *
 * @param dbPath 数据库文件在磁盘上的完整路径
 */
export async function initDatabase(dbPath: string): Promise<void> {
  // sql.js 需要定位它的 WASM 二进制文件
  // require.resolve 会找到 node_modules 中 sql.js 包的安装路径
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')

  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  })

  // 如果磁盘上已有数据库文件，读取它的内容作为起点
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    // 全新创建（首次启动应用）
    db = new SQL.Database()
  }

  // CREATE TABLE IF NOT EXISTS：只在表不存在时才创建（已有表则跳过，不会覆盖数据）
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
 *
 * 使用时需要判空（返回 null 表示数据库还没初始化）
 */
export function getDB(): Database | null {
  return db
}

/**
 * 把数据库从内存中导出并写入磁盘文件
 *
 * sql.js 的数据库默认在内存中运行，需要定期"快照"到磁盘才能真正持久化。
 * db.export() 返回一个 Uint8Array（二进制数据），
 * 转成 Node.js 的 Buffer 后写入文件系统。
 */
function saveToDisk(dbPath: string): void {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}
