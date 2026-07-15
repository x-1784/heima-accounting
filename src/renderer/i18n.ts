import { useState, useCallback, useEffect } from 'react'

// ==================== 类型 ====================

export type Language = 'zh-CN' | 'en-US'

interface Translations {
  // 侧边栏
  'app.title': string
  'menu.home': string
  'menu.addExpense': string
  'menu.expenses': string
  'menu.statistics': string
  'menu.categories': string
  'menu.settings': string

  // 首页
  'home.welcome': string
  'home.monthlyTotal': string
  'home.budgetUsage': string
  'home.recordCount': string
  'home.recentRecords': string
  'home.noRecords': string
  'home.noRecordsHint': string
  'home.overBudget': string
  'home.budgetRemaining': string
  'home.noBudget': string

  // 记一笔
  'add.title': string
  'add.amount': string
  'add.amountPlaceholder': string
  'add.categoryL1': string
  'add.categoryL1Placeholder': string
  'add.categoryL2': string
  'add.categoryL2Placeholder': string
  'add.categoryL2Hint': string
  'add.date': string
  'add.note': string
  'add.notePlaceholder': string
  'add.submit': string
  'add.success': string
  'add.editTitle': string
  'add.editSuccess': string

  // 支出明细
  'expense.search': string
  'expense.exportCSV': string
  'expense.exportSuccess': string
  'expense.exportFail': string
  'expense.monthlyTotal': string
  'expense.budget': string
  'expense.budgetClick': string
  'expense.budgetSet': string
  'expense.budgetUsed': string
  'expense.budgetOver': string
  'expense.budgetRemaining': string
  'expense.totalRecords': string
  'expense.filtered': string
  'expense.noRecords': string
  'expense.noRecordsHint': string
  'expense.noMatch': string
  'expense.colDate': string
  'expense.colAmount': string
  'expense.colCategory': string
  'expense.colNote': string
  'expense.colAction': string
  'expense.noNote': string
  'expense.edit': string
  'expense.delete': string
  'expense.deleteConfirm': string
  'expense.deleteDesc': string
  'expense.deleteOk': string
  'expense.deleteCancel': string
  'expense.deleteSuccess': string
  'expense.deleteFail': string

  // 预算
  'budget.title': string
  'budget.amount': string
  'budget.placeholder': string
  'budget.save': string
  'budget.cancel': string
  'budget.success': string

  // 统计分析
  'stats.categoryPie': string
  'stats.monthlyTrend': string
  'stats.ranking': string
  'stats.noData': string
  'stats.noDataThisMonth': string
  'stats.totalSpent': string

  // 分类管理
  'cat.title': string
  'cat.preset': string
  'cat.presetDesc': string
  'cat.custom': string
  'cat.noCustom': string
  'cat.addBtn': string
  'cat.subCategories': string
  'cat.addDialog': string
  'cat.editDialog': string
  'cat.name': string
  'cat.namePlaceholder': string
  'cat.emoji': string
  'cat.emojiPlaceholder': string
  'cat.subLabel': string
  'cat.subPlaceholder': string
  'cat.addSub': string
  'cat.save': string
  'cat.cancel': string
  'cat.minOneSub': string
  'cat.addSuccess': string
  'cat.editSuccess': string
  'cat.deleteConfirm': string
  'cat.deleteDesc': string
  'cat.deleteOk': string
  'cat.deletedSuccess': string
  'cat.nameRequired': string
  'cat.nameMax': string
  'cat.nameExists': string
  'cat.namePreset': string

  // 设置
  'settings.title': string
  'settings.language': string
  'settings.languageDesc': string
  'settings.about': string
  'settings.appName': string
  'settings.version': string
  'settings.repo': string
  'settings.update': string
  'settings.updateCheck': string
  'settings.upToDate': string
  'settings.updateFail': string
  'settings.checking': string
  'settings.data': string
  'settings.dbLocation': string

  // 更新
  'update.title': string
  'update.found': string
  'update.later': string
  'update.now': string
  'update.downloading': string
  'update.downloaded': string
  'update.install': string
  'update.safe': string
  'update.failed': string
  'update.checkNetwork': string
  'update.error': string

  // 通用
  'common.save': string
  'common.cancel': string
  'common.ok': string
  'common.confirm': string
  'common.close': string
  'common.total': string
  'common.loading': string
  'common.error': string
  'common.success': string
  'common.retry': string
  'common.records': string
  'common.search': string
  'common.amount': string

  // 表单验证
  'validate.amountRequired': string
  'validate.amountMin': string
  'validate.categoryRequired': string
  'validate.l1Required': string
  'validate.l2Required': string
  'validate.dateRequired': string
}

// ==================== 中文语言包 ====================

const zhCN: Translations = {
  'app.title': '📒 黑马记账',
  'menu.home': '首页',
  'menu.addExpense': '记一笔',
  'menu.expenses': '支出明细',
  'menu.statistics': '统计分析',
  'menu.categories': '分类管理',
  'menu.settings': '设置',

  'home.welcome': '欢迎使用黑马记账',
  'home.monthlyTotal': '本月支出',
  'home.budgetUsage': '预算使用率',
  'home.recordCount': '记账笔数',
  'home.recentRecords': '最近记录',
  'home.noRecords': '本月还没有记录',
  'home.noRecordsHint': '点击"记一笔"开始记账吧！',
  'home.overBudget': '超支',
  'home.budgetRemaining': '剩余',
  'home.noBudget': '未设置',

  'add.title': '记一笔',
  'add.amount': '金额（元）',
  'add.amountPlaceholder': '请输入金额',
  'add.categoryL1': '一级分类',
  'add.categoryL1Placeholder': '请选择大类',
  'add.categoryL2': '二级分类',
  'add.categoryL2Placeholder': '请选择小类',
  'add.categoryL2Hint': '请先选择一级分类',
  'add.date': '日期',
  'add.note': '备注',
  'add.notePlaceholder': '写点备注（可选）',
  'add.submit': '保存',
  'add.success': '添加成功',
  'add.editTitle': '编辑支出',
  'add.editSuccess': '修改成功',

  'expense.search': '搜索备注、分类、金额...',
  'expense.exportCSV': '导出 CSV',
  'expense.exportSuccess': '导出成功！',
  'expense.exportFail': '导出失败',
  'expense.monthlyTotal': '月总支出',
  'expense.budget': '月度预算',
  'expense.budgetClick': '点击设置',
  'expense.budgetSet': '设置预算',
  'expense.budgetUsed': '已用',
  'expense.budgetOver': '超支',
  'expense.budgetRemaining': '剩余',
  'expense.totalRecords': '条记录',
  'expense.filtered': '已过滤',
  'expense.noRecords': '还没有记账记录，点击「记一笔」开始吧！',
  'expense.noRecordsHint': '还没有记账记录',
  'expense.noMatch': '没有匹配的记录',
  'expense.colDate': '日期',
  'expense.colAmount': '金额',
  'expense.colCategory': '分类',
  'expense.colNote': '备注',
  'expense.colAction': '操作',
  'expense.noNote': '无备注',
  'expense.edit': '编辑',
  'expense.delete': '删除',
  'expense.deleteConfirm': '确定删除这条记录吗？',
  'expense.deleteDesc': '删除后无法恢复',
  'expense.deleteOk': '确定删除',
  'expense.deleteCancel': '取消',
  'expense.deleteSuccess': '删除成功',
  'expense.deleteFail': '删除失败',

  'budget.title': '设置预算',
  'budget.amount': '预算金额（元）',
  'budget.placeholder': '请输入月度预算',
  'budget.save': '保存',
  'budget.cancel': '取消',
  'budget.success': '预算设置成功',

  'stats.categoryPie': '分类支出占比',
  'stats.monthlyTrend': '近12个月支出趋势',
  'stats.ranking': '分类支出排行',
  'stats.noData': '暂无历史数据',
  'stats.noDataThisMonth': '暂无支出数据',
  'stats.totalSpent': '总支出',

  'cat.title': '分类管理',
  'cat.preset': '预置分类（不可修改）',
  'cat.presetDesc': '',
  'cat.custom': '自定义分类',
  'cat.noCustom': '暂无自定义分类，点击下方按钮添加',
  'cat.addBtn': '添加分类',
  'cat.subCategories': '个小类',
  'cat.addDialog': '添加分类',
  'cat.editDialog': '编辑分类',
  'cat.name': '一级分类名称',
  'cat.namePlaceholder': '例如：旅行、宠物、兴趣爱好',
  'cat.emoji': '图标（可选，输入1个emoji）',
  'cat.emojiPlaceholder': '📌',
  'cat.subLabel': '二级分类',
  'cat.subPlaceholder': '二级分类 {index}，例如：猫粮',
  'cat.addSub': '添加二级分类',
  'cat.save': '保存',
  'cat.cancel': '取消',
  'cat.minOneSub': '请至少添加一个二级分类',
  'cat.addSuccess': '分类已添加',
  'cat.editSuccess': '分类已更新',
  'cat.deleteConfirm': '删除分类',
  'cat.deleteDesc': '删除后已有记账记录不受影响，仍保留原分类名称。',
  'cat.deleteOk': '确定删除',
  'cat.deletedSuccess': '分类已删除',
  'cat.nameRequired': '请输入一级分类名称',
  'cat.nameMax': '分类名称不能超过20个字',
  'cat.nameExists': '分类已存在',
  'cat.namePreset': '预置分类，不能使用此名称',

  'settings.title': '设置',
  'settings.language': '语言 Language',
  'settings.languageDesc': '切换界面显示语言',
  'settings.about': '关于',
  'settings.appName': '应用名称',
  'settings.version': '当前版本',
  'settings.repo': '项目地址',
  'settings.update': '更新',
  'settings.updateCheck': '检查更新',
  'settings.upToDate': '已是最新版本',
  'settings.updateFail': '检查更新失败，请检查网络连接',
  'settings.checking': '正在检查更新...',
  'settings.data': '数据',
  'settings.dbLocation': '数据存储在您的电脑本地，不会上传到任何服务器。',

  'update.title': '发现新版本',
  'update.found': '检测到新版本',
  'update.later': '稍后再说',
  'update.now': '立即更新',
  'update.downloading': '正在下载新版本，请稍候...',
  'update.downloaded': '新版本已下载完成！',
  'update.install': '立即安装并重启',
  'update.safe': '更新不会影响您的记账数据，请放心操作。',
  'update.failed': '更新失败',
  'update.checkNetwork': '请检查网络连接后重试',
  'update.error': '更新失败：',

  'common.save': '保存',
  'common.cancel': '取消',
  'common.ok': '确定',
  'common.confirm': '确认',
  'common.close': '关闭',
  'common.total': '共',
  'common.loading': '加载中...',
  'common.error': '操作失败，请重试',
  'common.success': '操作成功',
  'common.retry': '重试',
  'common.records': '条记录',
  'common.search': '搜索',
  'common.amount': '金额',

  'validate.amountRequired': '请输入金额',
  'validate.amountMin': '金额必须大于 0',
  'validate.categoryRequired': '请选择分类',
  'validate.l1Required': '请选择一级分类',
  'validate.l2Required': '请选择二级分类',
  'validate.dateRequired': '请选择日期',
}

// ==================== 英文语言包 ====================

const enUS: Translations = {
  'app.title': '📒 Heima Tracker',
  'menu.home': 'Dashboard',
  'menu.addExpense': 'Add Expense',
  'menu.expenses': 'Expenses',
  'menu.statistics': 'Statistics',
  'menu.categories': 'Categories',
  'menu.settings': 'Settings',

  'home.welcome': 'Welcome to Heima Tracker',
  'home.monthlyTotal': 'Monthly Total',
  'home.budgetUsage': 'Budget Usage',
  'home.recordCount': 'Records',
  'home.recentRecords': 'Recent Records',
  'home.noRecords': 'No records this month',
  'home.noRecordsHint': 'Click "Add Expense" to get started!',
  'home.overBudget': 'Over',
  'home.budgetRemaining': 'Remaining',
  'home.noBudget': 'Not set',

  'add.title': 'Add Expense',
  'add.amount': 'Amount (¥)',
  'add.amountPlaceholder': 'Enter amount',
  'add.categoryL1': 'Category',
  'add.categoryL1Placeholder': 'Select category',
  'add.categoryL2': 'Subcategory',
  'add.categoryL2Placeholder': 'Select subcategory',
  'add.categoryL2Hint': 'Select a category first',
  'add.date': 'Date',
  'add.note': 'Note',
  'add.notePlaceholder': 'Add a note (optional)',
  'add.submit': 'Save',
  'add.success': 'Expense added',
  'add.editTitle': 'Edit Expense',
  'add.editSuccess': 'Expense updated',

  'expense.search': 'Search notes, categories, amount...',
  'expense.exportCSV': 'Export CSV',
  'expense.exportSuccess': 'Export successful!',
  'expense.exportFail': 'Export failed',
  'expense.monthlyTotal': 'Monthly Total',
  'expense.budget': 'Monthly Budget',
  'expense.budgetClick': 'Click to set',
  'expense.budgetSet': 'Set Budget',
  'expense.budgetUsed': 'Used',
  'expense.budgetOver': 'Over Budget',
  'expense.budgetRemaining': 'Remaining',
  'expense.totalRecords': 'records',
  'expense.filtered': 'filtered',
  'expense.noRecords': 'No records yet. Click "Add Expense" to start!',
  'expense.noRecordsHint': 'No records',
  'expense.noMatch': 'No matching records',
  'expense.colDate': 'Date',
  'expense.colAmount': 'Amount',
  'expense.colCategory': 'Category',
  'expense.colNote': 'Note',
  'expense.colAction': 'Actions',
  'expense.noNote': 'No note',
  'expense.edit': 'Edit',
  'expense.delete': 'Delete',
  'expense.deleteConfirm': 'Delete this record?',
  'expense.deleteDesc': 'This action cannot be undone',
  'expense.deleteOk': 'Delete',
  'expense.deleteCancel': 'Cancel',
  'expense.deleteSuccess': 'Record deleted',
  'expense.deleteFail': 'Delete failed',

  'budget.title': 'Set Budget',
  'budget.amount': 'Budget Amount (¥)',
  'budget.placeholder': 'Enter monthly budget',
  'budget.save': 'Save',
  'budget.cancel': 'Cancel',
  'budget.success': 'Budget set successfully',

  'stats.categoryPie': 'Category Breakdown',
  'stats.monthlyTrend': '12-Month Trend',
  'stats.ranking': 'Spending Ranking',
  'stats.noData': 'No historical data',
  'stats.noDataThisMonth': 'No data this month',
  'stats.totalSpent': 'Total Spent',

  'cat.title': 'Categories',
  'cat.preset': 'Default Categories (read-only)',
  'cat.presetDesc': '',
  'cat.custom': 'Custom Categories',
  'cat.noCustom': 'No custom categories yet. Click below to add one.',
  'cat.addBtn': 'Add Category',
  'cat.subCategories': 'subcategories',
  'cat.addDialog': 'Add Category',
  'cat.editDialog': 'Edit Category',
  'cat.name': 'Category Name',
  'cat.namePlaceholder': 'e.g. Travel, Pets, Hobbies',
  'cat.emoji': 'Icon (optional, emoji)',
  'cat.emojiPlaceholder': '📌',
  'cat.subLabel': 'Subcategories',
  'cat.subPlaceholder': 'Subcategory {index}, e.g. Cat Food',
  'cat.addSub': 'Add Subcategory',
  'cat.save': 'Save',
  'cat.cancel': 'Cancel',
  'cat.minOneSub': 'Please add at least one subcategory',
  'cat.addSuccess': 'Category added',
  'cat.editSuccess': 'Category updated',
  'cat.deleteConfirm': 'Delete Category',
  'cat.deleteDesc': 'Existing records will keep their category labels.',
  'cat.deleteOk': 'Delete',
  'cat.deletedSuccess': 'Category deleted',
  'cat.nameRequired': 'Please enter a category name',
  'cat.nameMax': 'Name cannot exceed 20 characters',
  'cat.nameExists': 'Category already exists',
  'cat.namePreset': 'This is a default category name',

  'settings.title': 'Settings',
  'settings.language': 'Language 语言',
  'settings.languageDesc': 'Switch interface language',
  'settings.about': 'About',
  'settings.appName': 'App Name',
  'settings.version': 'Version',
  'settings.repo': 'Repository',
  'settings.update': 'Updates',
  'settings.updateCheck': 'Check for Updates',
  'settings.upToDate': 'You are up to date',
  'settings.updateFail': 'Update check failed. Check your network.',
  'settings.checking': 'Checking for updates...',
  'settings.data': 'Data',
  'settings.dbLocation': 'Your data is stored locally on this computer.',

  'update.title': 'New Version Available',
  'update.found': 'A new version has been detected',
  'update.later': 'Later',
  'update.now': 'Update Now',
  'update.downloading': 'Downloading update, please wait...',
  'update.downloaded': 'Update downloaded!',
  'update.install': 'Install & Restart',
  'update.safe': 'Your data will not be affected.',
  'update.failed': 'Update Failed',
  'update.checkNetwork': 'Please check your network and try again.',
  'update.error': 'Update failed: ',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.ok': 'OK',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.total': 'Total',
  'common.loading': 'Loading...',
  'common.error': 'Operation failed, please retry',
  'common.success': 'Success',
  'common.retry': 'Retry',
  'common.records': 'records',
  'common.search': 'Search',
  'common.amount': 'Amount',

  'validate.amountRequired': 'Please enter an amount',
  'validate.amountMin': 'Amount must be greater than 0',
  'validate.categoryRequired': 'Please select a category',
  'validate.l1Required': 'Please select a category',
  'validate.l2Required': 'Please select a subcategory',
  'validate.dateRequired': 'Please select a date',
}

// ==================== 语言包映射 ====================

const locales: Record<Language, Translations> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

// ==================== 全局状态 ====================

const STORAGE_KEY = 'heima-language'
let currentLang: Language = (localStorage.getItem(STORAGE_KEY) as Language) || 'zh-CN'
const listeners: Set<() => void> = new Set()

export function setLanguage(lang: Language) {
  currentLang = lang
  localStorage.setItem(STORAGE_KEY, lang)
  listeners.forEach((fn) => fn())
}

export function getLanguage(): Language {
  return currentLang
}

export function t(key: keyof Translations): string {
  return locales[currentLang][key] || key
}

/**
 * React Hook：获取翻译函数并响应语言切换
 */
export function useTranslation() {
  const [, setTick] = useState(0)

  const forceUpdate = useCallback(() => setTick((n) => n + 1), [])

  // 注册/注销监听器
  useEffect(() => {
    listeners.add(forceUpdate)
    return () => {
      listeners.delete(forceUpdate)
    }
  }, [forceUpdate])

  return { t, lang: currentLang }
}
