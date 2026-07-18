// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { initDatabase, getDB } from './database'

// ==================================================
// 检查卷四:数据库(记账数据的仓库)
// 用一个临时文件夹里的测试数据库来做实验,绝不碰用户的真实记账数据
// ==================================================

let tmpDir: string
let dbPath: string

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heima-test-'))
  dbPath = path.join(tmpDir, 'test.db')
  await initDatabase(dbPath)
})

afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
})

describe('数据库初始化', () => {
  it('初始化后,数据库文件被创建在磁盘上', () => {
    expect(fs.existsSync(dbPath)).toBe(true)
  })

  it('三张数据表(支出记录、预算、自定义分类)都建好了', () => {
    const db = getDB()!
    const r = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    const tables = r[0].values.map((row) => row[0])
    expect(tables).toContain('expenses')
    expect(tables).toContain('budgets')
    expect(tables).toContain('user_categories')
  })
})

describe('支出记录 - 增删改查', () => {
  it('添加一笔支出后,能查询回来且内容一致', () => {
    const db = getDB()!
    db.run(
      'INSERT INTO expenses (amount, category_l1, category_l2, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [25.5, '餐饮美食', '午餐', '公司楼下', '2026-07-15', new Date().toISOString()]
    )
    const r = db.exec("SELECT amount, category_l1, category_l2, note FROM expenses WHERE date = '2026-07-15'")
    expect(r[0].values[0]).toEqual([25.5, '餐饮美食', '午餐', '公司楼下'])
  })

  it('按月份筛选:只查 2026-07 时,不会混入其他月份的记录', () => {
    const db = getDB()!
    const now = new Date().toISOString()
    db.run("INSERT INTO expenses (amount, category_l1, category_l2, note, date, created_at) VALUES (100, '交通出行', '打车/网约车', '', '2026-06-30', ?)", [now])
    db.run("INSERT INTO expenses (amount, category_l1, category_l2, note, date, created_at) VALUES (200, '交通出行', '打车/网约车', '', '2026-07-01', ?)", [now])
    const r = db.exec("SELECT COUNT(*) FROM expenses WHERE date LIKE '2026-07%'")
    const countJuly = r[0].values[0][0] as number
    const all = db.exec('SELECT COUNT(*) FROM expenses')[0].values[0][0] as number
    expect(countJuly).toBeLessThan(all) // 6月那笔没被算进7月
    expect(countJuly).toBe(2) // 7月有 25.5 和 200 两笔
  })

  it('月度合计金额计算正确(25.5 + 200 = 225.5)', () => {
    const db = getDB()!
    const r = db.exec("SELECT SUM(amount) FROM expenses WHERE date LIKE '2026-07%'")
    expect(r[0].values[0][0]).toBeCloseTo(225.5, 2)
  })

  it('修改一笔支出的金额后,新金额生效', () => {
    const db = getDB()!
    const id = db.exec("SELECT id FROM expenses WHERE note = '公司楼下'")[0].values[0][0]
    db.run('UPDATE expenses SET amount = ? WHERE id = ?', [30, id as number])
    const r = db.exec('SELECT amount FROM expenses WHERE id = ?', [id as number])
    expect(r[0].values[0][0]).toBe(30)
  })

  it('删除一笔支出后,这笔记录真的消失了', () => {
    const db = getDB()!
    const id = db.exec("SELECT id FROM expenses WHERE note = '公司楼下'")[0].values[0][0]
    db.run('DELETE FROM expenses WHERE id = ?', [id as number])
    const r = db.exec('SELECT COUNT(*) FROM expenses WHERE id = ?', [id as number])
    expect(r[0].values[0][0]).toBe(0)
  })

  it('分类统计:按一级分类汇总的金额正确', () => {
    const db = getDB()!
    const now = new Date().toISOString()
    db.run("INSERT INTO expenses (amount, category_l1, category_l2, note, date, created_at) VALUES (50, '餐饮美食', '晚餐', '', '2026-07-10', ?)", [now])
    const r = db.exec("SELECT category_l1, SUM(amount) as total FROM expenses WHERE date LIKE '2026-07%' GROUP BY category_l1 ORDER BY total DESC")
    const map = Object.fromEntries(r[0].values.map((v) => [v[0], v[1]]))
    expect(map['交通出行']).toBe(200)
    expect(map['餐饮美食']).toBe(50)
  })
})

describe('月度预算', () => {
  it('设置某月预算后能查回来', () => {
    const db = getDB()!
    db.run("INSERT OR REPLACE INTO budgets (month, amount, created_at) VALUES ('2026-07', 3000, ?)", [new Date().toISOString()])
    const r = db.exec("SELECT amount FROM budgets WHERE month = '2026-07'")
    expect(r[0].values[0][0]).toBe(3000)
  })

  it('同一个月重复设置预算,是覆盖而不是变成两条', () => {
    const db = getDB()!
    db.run("INSERT OR REPLACE INTO budgets (month, amount, created_at) VALUES ('2026-07', 5000, ?)", [new Date().toISOString()])
    const r = db.exec("SELECT COUNT(*), MAX(amount) FROM budgets WHERE month = '2026-07'")
    expect(r[0].values[0][0]).toBe(1) // 只有一条
    expect(r[0].values[0][1]).toBe(5000) // 金额是新值
  })
})

describe('自定义分类', () => {
  it('添加自定义分类,二级分类列表能原样存取', () => {
    const db = getDB()!
    db.run(
      "INSERT INTO user_categories (category_l1, emoji, children, created_at) VALUES ('宠物', '🐱', ?, ?)",
      [JSON.stringify(['猫粮', '玩具', '看兽医']), new Date().toISOString()]
    )
    const r = db.exec("SELECT children FROM user_categories WHERE category_l1 = '宠物'")
    expect(JSON.parse(r[0].values[0][0] as string)).toEqual(['猫粮', '玩具', '看兽医'])
  })

  it('分类名称不允许重复(数据库层面的保护)', () => {
    const db = getDB()!
    expect(() => {
      db.run(
        "INSERT INTO user_categories (category_l1, emoji, children, created_at) VALUES ('宠物', '🐶', '[]', ?)",
        [new Date().toISOString()]
      )
    }).toThrow() // UNIQUE 约束会拦住重名
  })
})

describe('数据持久化(关掉软件数据不丢)', () => {
  it('保存到磁盘后重新打开数据库,之前的记录还在', async () => {
    const db = getDB()!
    // 模拟应用的保存动作:把内存中的数据写到磁盘
    fs.writeFileSync(dbPath, Buffer.from(db.export()))
    // 模拟重启:重新从磁盘加载
    await initDatabase(dbPath)
    const db2 = getDB()!
    const r = db2.exec("SELECT COUNT(*) FROM expenses WHERE date LIKE '2026-07%'")
    expect(r[0].values[0][0]).toBe(2) // 7月剩 200 和 50 两笔(25.5 那笔已在删除测试中删掉)
  })
})
