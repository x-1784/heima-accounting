/** 支出记录数据结构 */
interface ExpenseRecord {
  id: number
  amount: number
  category_l1: string
  category_l2: string
  note: string
  date: string
  created_at: string
}

/** 分类统计数据 */
interface CategoryStat {
  category_l1: string
  total: number
}

/** Electron API 类型定义 */
interface ElectronAPI {
  getExpenses: (month?: string) => Promise<ExpenseRecord[]>
  addExpense: (data: {
    amount: number
    category_l1: string
    category_l2: string
    note?: string
    date: string
  }) => Promise<{ success: boolean }>
  deleteExpense: (id: number) => Promise<{ success: boolean }>
  updateExpense: (data: {
    id: number
    amount: number
    category_l1: string
    category_l2: string
    note?: string
    date: string
  }) => Promise<{ success: boolean }>
  getMonthlyTotal: (month: string) => Promise<{ total: number }>
  getCategoryStats: (month?: string) => Promise<CategoryStat[]>
  getMonthlyTrend: () => Promise<{ month: string; total: number }[]>
  exportCSV: (month?: string) => Promise<{ success: boolean; path: string | null }>
  getBudget: (month: string) => Promise<{ month: string; amount: number } | null>
  setBudget: (month: string, amount: number) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
