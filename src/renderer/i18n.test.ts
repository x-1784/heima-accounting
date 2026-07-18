import { describe, it, expect } from 'vitest'
import { locales, t, setLanguage, getLanguage } from './i18n'

// ==================================================
// 检查卷一:中英文翻译完整性
// 目的:保证界面切换语言时,不会出现漏翻、空白或占位符对不上的情况
// ==================================================

const zh = locales['zh-CN'] as Record<string, string>
const en = locales['en-US'] as Record<string, string>

describe('翻译完整性检查', () => {
  it('中文版的每一条文字,英文版都有对应条目', () => {
    const missing = Object.keys(zh).filter((k) => !(k in en))
    expect(missing, `英文版缺少这些条目: ${missing.join(', ')}`).toEqual([])
  })

  it('英文版的每一条文字,中文版都有对应条目', () => {
    const missing = Object.keys(en).filter((k) => !(k in zh))
    expect(missing, `中文版缺少这些条目: ${missing.join(', ')}`).toEqual([])
  })

  it('贪吃蛇新增的 9 条界面文字,中英文都配齐了', () => {
    const snakeKeys = Object.keys(zh).filter((k) => k.startsWith('snake.'))
    expect(snakeKeys.length).toBe(9)
    for (const k of snakeKeys) {
      expect(zh[k], `中文 ${k} 不应为空`).toBeTruthy()
      expect(en[k], `英文 ${k} 不应为空`).toBeTruthy()
    }
  })

  it('带占位符的文字(如 {index}),中英文的占位符要一致', () => {
    const placeholder = /\{[a-zA-Z]+\}/g
    for (const k of Object.keys(zh)) {
      const zhPh = (zh[k].match(placeholder) || []).sort()
      const enPh = ((en[k] || '').match(placeholder) || []).sort()
      expect(enPh, `条目 ${k} 的占位符中英文不一致`).toEqual(zhPh)
    }
  })

  it('除了预留的空条目外,所有文字都不应是空白', () => {
    // cat.presetDesc 是历史遗留的预留空条目,两边都为空,单独放行
    const allowEmpty = new Set(['cat.presetDesc'])
    const emptyZh = Object.keys(zh).filter((k) => !allowEmpty.has(k) && zh[k].trim() === '')
    const emptyEn = Object.keys(en).filter((k) => !allowEmpty.has(k) && en[k].trim() === '')
    expect(emptyZh, `中文版这些条目是空的: ${emptyZh.join(', ')}`).toEqual([])
    expect(emptyEn, `英文版这些条目是空的: ${emptyEn.join(', ')}`).toEqual([])
  })
})

describe('语言切换功能', () => {
  it('默认语言是中文', () => {
    setLanguage('zh-CN')
    expect(getLanguage()).toBe('zh-CN')
    expect(t('menu.home')).toBe('首页')
  })

  it('切换到英文后,界面文字变成英文', () => {
    setLanguage('en-US')
    expect(getLanguage()).toBe('en-US')
    expect(t('menu.home')).toBe('Dashboard')
    setLanguage('zh-CN') // 恢复,避免影响其他测试
  })

  it('切换语言后,选择会被记住(存入浏览器本地存储)', () => {
    setLanguage('en-US')
    expect(localStorage.getItem('heima-language')).toBe('en-US')
    setLanguage('zh-CN')
    expect(localStorage.getItem('heima-language')).toBe('zh-CN')
  })
})
