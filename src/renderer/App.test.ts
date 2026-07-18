import { describe, it, expect } from 'vitest'
import {
  SNAKE_GRID, DIR, OPPOSITE, KEY_MAP, randomFood,
  presetCategories, categoryColors,
} from './App'

// ==================================================
// 检查卷二:贪吃蛇游戏规则
// ==================================================

describe('贪吃蛇 - 方向规则', () => {
  it('四个方向的移动量正确(上是y减1,下是y加1,左是x减1,右是x加1)', () => {
    expect(DIR.UP).toEqual({ x: 0, y: -1 })
    expect(DIR.DOWN).toEqual({ x: 0, y: 1 })
    expect(DIR.LEFT).toEqual({ x: -1, y: 0 })
    expect(DIR.RIGHT).toEqual({ x: 1, y: 0 })
  })

  it('"禁止180°掉头"的反方向表是自洽的(上的反面是下,反过来也成立)', () => {
    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const
    for (const d of dirs) {
      // 反方向的反方向,应该回到自己
      expect(OPPOSITE[OPPOSITE[d]]).toBe(d)
      // 一个方向和它的反方向,移动量相加应该等于原地不动
      expect(DIR[d].x + DIR[OPPOSITE[d]].x).toBe(0)
      expect(DIR[d].y + DIR[OPPOSITE[d]].y).toBe(0)
    }
  })

  it('方向键(↑↓←→)映射正确', () => {
    expect(KEY_MAP['ArrowUp']).toBe('UP')
    expect(KEY_MAP['ArrowDown']).toBe('DOWN')
    expect(KEY_MAP['ArrowLeft']).toBe('LEFT')
    expect(KEY_MAP['ArrowRight']).toBe('RIGHT')
  })

  it('WASD 键映射正确,大小写都支持(开大写锁定也能玩)', () => {
    expect(KEY_MAP['w']).toBe('UP')
    expect(KEY_MAP['a']).toBe('LEFT')
    expect(KEY_MAP['s']).toBe('DOWN')
    expect(KEY_MAP['d']).toBe('RIGHT')
    expect(KEY_MAP['W']).toBe('UP')
    expect(KEY_MAP['A']).toBe('LEFT')
    expect(KEY_MAP['S']).toBe('DOWN')
    expect(KEY_MAP['D']).toBe('RIGHT')
  })
})

describe('贪吃蛇 - 食物生成规则', () => {
  it('生成的食物一定在棋盘范围内', () => {
    const snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
    for (let i = 0; i < 50; i++) {
      const f = randomFood(snake)
      expect(f).not.toBeNull()
      expect(f!.x).toBeGreaterThanOrEqual(0)
      expect(f!.x).toBeLessThan(SNAKE_GRID)
      expect(f!.y).toBeGreaterThanOrEqual(0)
      expect(f!.y).toBeLessThan(SNAKE_GRID)
    }
  })

  it('食物绝不会生成在蛇身上', () => {
    // 造一条很长的蛇(占满前19行),食物必须落在最后一行
    const snake: { x: number; y: number }[] = []
    for (let y = 0; y < SNAKE_GRID - 1; y++)
      for (let x = 0; x < SNAKE_GRID; x++) snake.push({ x, y })
    for (let i = 0; i < 30; i++) {
      const f = randomFood(snake)
      expect(f).not.toBeNull()
      expect(f!.y).toBe(SNAKE_GRID - 1) // 只能在最后一行
    }
  })

  it('棋盘只剩一个空格时,食物就生成在那个空格', () => {
    const snake: { x: number; y: number }[] = []
    for (let y = 0; y < SNAKE_GRID; y++)
      for (let x = 0; x < SNAKE_GRID; x++)
        if (!(x === 5 && y === 7)) snake.push({ x, y })
    expect(randomFood(snake)).toEqual({ x: 5, y: 7 })
  })

  it('棋盘全满时(通关),返回 null 而不是崩溃', () => {
    const snake: { x: number; y: number }[] = []
    for (let y = 0; y < SNAKE_GRID; y++)
      for (let x = 0; x < SNAKE_GRID; x++) snake.push({ x, y })
    expect(randomFood(snake)).toBeNull()
  })
})

// ==================================================
// 检查卷三:支出分类体系
// 目的:保证分类数据和项目文档(CLAUDE.md)约定的一致,颜色配置不缺项
// ==================================================

describe('支出分类体系', () => {
  const names = Object.keys(presetCategories)

  it('一级分类恰好 10 个,和项目文档约定一致', () => {
    expect(names).toEqual([
      '餐饮美食', '交通出行', '购物消费', '住房居家', '休闲娱乐',
      '医疗健康', '教育学习', '金融理财', '家庭生活', '其他支出',
    ])
  })

  it('每个一级分类都有至少 1 个二级分类,且二级分类不重复', () => {
    for (const name of names) {
      const children = presetCategories[name].children
      expect(children.length, `${name} 的二级分类为空`).toBeGreaterThan(0)
      expect(new Set(children).size, `${name} 的二级分类有重复`).toBe(children.length)
    }
  })

  it('每个一级分类都配了统计图表用的颜色', () => {
    for (const name of names) {
      expect(categoryColors[name], `${name} 没有配颜色`).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('每个一级分类的显示标签都带图标(emoji)且包含分类名', () => {
    for (const name of names) {
      expect(presetCategories[name].label).toContain(name)
    }
  })
})
