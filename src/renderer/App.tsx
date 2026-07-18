/**
 * App.tsx — 黑马记账的主界面文件
 *
 * 这个文件负责：
 * 1. 定义所有页面组件（首页、记一笔、支出明细、统计分析、分类管理、贪吃蛇、设置）
 * 2. 管理应用的整体布局（侧边栏导航 + 右侧内容区）
 * 3. 统一管理数据加载和状态共享（支出记录、预算、分类等数据在顶层加载后分发给各页面）
 *
 * 数据流向：主进程(数据库) → 预加载脚本(安全桥梁) → 本文件(数据中枢) → 各页面组件
 */

// ==================== 引入外部工具 ====================

// React：构建用户界面的基础框架（"积木块"工具包）
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// Ant Design：专业的 UI 组件库，提供按钮、表格、弹窗、表单等现成组件（"乐高零件"）
import {
  Layout,       // 页面布局：侧边栏 + 内容区
  Menu,         // 导航菜单
  Button,
  Table,        // 数据表格（支出记录列表）
  Modal,        // 弹出对话框（编辑、设置预算等）
  Form,         // 表单（记一笔、编辑分类等）
  Input,        // 文本输入框
  InputNumber,  // 数字输入框（金额）
  Select,       // 下拉选择框（分类选择）
  DatePicker,   // 日期选择器
  Popconfirm,   // 点击后弹出确认气泡（删除确认）
  Progress,     // 进度圈（预算使用率）
  message,      // 顶部弹出提示（操作成功/失败）
  Tag,          // 标签（分类标签）
  Space,        // 自动管理元素间距的容器
  Statistic,    // 统计数字展示（月总支出、记账笔数）
  Card,         // 卡片容器
  Typography,   // 文字排版（标题、正文）
  Row, Col,     // 栅格布局（12 等分，像切蛋糕一样分配页面宽度）
  Empty,        // 空状态占位图（"暂无数据"）
  Spin,         // 加载中的旋转动画
} from 'antd'

// Ant Design 图标库：用图标代替纯文字，界面更好看也更直观
import {
  PlusOutlined,          // ➕ 加号图标
  PlusCircleOutlined,    // ⊕ 圆形加号
  DeleteOutlined,        // 🗑 删除
  EditOutlined,          // ✏️ 编辑
  HomeOutlined,          // 🏠 首页
  UnorderedListOutlined,  // 📋 列表
  PieChartOutlined,      // 🥧 饼图
  TagsOutlined,          // 🏷 标签
  SettingOutlined,       // ⚙️ 设置
  WalletOutlined,        // 👛 钱包
  BarChartOutlined,      // 📊 柱状图
  SyncOutlined,          // 🔄 同步/更新
  GithubOutlined,        // GitHub 图标
} from '@ant-design/icons'

// @ant-design/charts：图表库（饼图、柱状图），用于统计分析页面
import { Pie, Column } from '@ant-design/charts'

// dayjs：日期处理工具（格式化、解析日期）
import dayjs, { Dayjs } from 'dayjs'

// i18n：多语言翻译模块（i18n = internationalization，"国际化的英文单词太长所以缩写"）
// t = 翻译函数，setLanguage = 切换语言，getLanguage = 获取当前语言，useTranslation = React 中使用的翻译钩子
import { t, setLanguage, getLanguage, useTranslation, Language } from './i18n'

// 从 Ant Design 的 Layout 组件中解构出 Sider（侧边栏）和 Content（内容区）
const { Sider, Content } = Layout

// 从 Typography 组件中解构出 Title（标题）和 Text（正文文字）
const { Title, Text } = Typography

// ==================== 常量与数据定义 ====================

// 当前应用版本号，显示在侧边栏底部和设置页面
const APP_VERSION = '1.1.1'

interface CategoryItem {
  label: string
  children: string[]
}

export const presetCategories: Record<string, CategoryItem> = {
  '餐饮美食': { label: '🍜 餐饮美食', children: ['早餐', '午餐', '晚餐', '零食饮料', '外出聚餐', '食材采购'] },
  '交通出行': { label: '🚗 交通出行', children: ['公交地铁', '打车/网约车', '加油充电', '停车费', '车辆保养', '火车/机票'] },
  '购物消费': { label: '🛒 购物消费', children: ['衣服鞋包', '数码电子', '家居日用', '美妆护肤', '书籍文具', '运动户外'] },
  '住房居家': { label: '🏠 住房居家', children: ['房租', '水电燃气', '物业费', '维修装修', '宽带话费'] },
  '休闲娱乐': { label: '🎮 休闲娱乐', children: ['电影演出', '游戏充值', '旅游度假', '运动健身', '视频会员', '聚会社交'] },
  '医疗健康': { label: '💊 医疗健康', children: ['看病变医', '药品购买', '牙科口腔', '体检', '保健品'] },
  '教育学习': { label: '📚 教育学习', children: ['学费', '书籍资料', '网课', '培训考试', '文具耗材'] },
  '金融理财': { label: '💰 金融理财', children: ['保险', '投资亏损', '贷款还款', '手续费'] },
  '家庭生活': { label: '👨‍👩‍👧 家庭生活', children: ['育儿支出', '宠物花销', '家居用品', '人情红包'] },
  '其他支出': { label: '📦 其他支出', children: ['快递物流', '其他杂项'] },
}

const PRESET_NAMES = Object.keys(presetCategories)

/**
 * 每个一级分类对应的图表颜色（十六进制色值）
 *
 * 用于：
 * - 统计分析页面的饼图：每个分类一个颜色
 * - 分类排行卡片：左侧彩条的颜色
 *
 * 配色原则：每个分类颜色区分度高，相邻分类不会撞色
 */
export const categoryColors: Record<string, string> = {
  '餐饮美食': '#FF6B6B', '交通出行': '#4ECDC4', '购物消费': '#45B7D1',
  '住房居家': '#96CEB4', '休闲娱乐': '#FFEAA7', '医疗健康': '#DDA0DD',
  '教育学习': '#98D8C8', '金融理财': '#F7DC6F', '家庭生活': '#BB8FCE',
  '其他支出': '#808B96',
}

// ==================== 类型定义（数据结构的"模板"） ====================

/** 一条支出记录的数据结构 */
interface Expense {
  id: number;           // 唯一编号（数据库自动生成）
  amount: number;       // 金额（单位：元）
  category_l1: string;  // 一级分类名
  category_l2: string;  // 二级分类名
  note: string;         // 备注
  date: string;         // 日期（格式：YYYY-MM-DD）
}

/** 按一级分类统计的汇总数据（饼图用） */
interface CategoryStat { category_l1: string; total: number }

/** 月度趋势数据（近 12 个月折线图/柱状图用） */
interface MonthlyTrend { month: string; total: number }

/** 用户自定义分类的数据结构 */
interface UserCategory {
  id: number;
  category_l1: string;  // 一级分类名
  emoji: string;        // 图标（用户自选，如 🐱）
  children: string[];   // 二级分类列表（在数据库中以 JSON 字符串存储）
  created_at: string;   // 创建时间
}

// ==================== 样式常量（在组件外部定义，避免每次渲染都重新创建对象） ====================

// 侧边栏整体布局：纵向排列，占满整个高度
const siderMenuStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' }

// 侧边栏顶部的 Logo 区域样式
const logoStyle: React.CSSProperties = { padding: '20px 16px', textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' }

// 每个页面标题的统一样式
const pageTitleStyle: React.CSSProperties = { marginBottom: 24, fontSize: 20, fontWeight: 600 }

// ==================== 页面组件（共 7 个） ====================

// ---------- ① 首页（仪表盘） ----------

/** 首页组件的输入参数 */
interface DashboardProps {
  expenses: Expense[];      // 本月全部支出记录
  monthlyTotal: number;     // 本月总支出金额
  selectedMonth: string;    // 当前选中的月份
  loading: boolean;         // 是否正在加载数据
  onGoExpenses: () => void; // 点击"跳转到支出明细"的回调
}
/**
 * 首页（仪表盘）组件
 *
 * 展示三张统计卡（月总支出、预算使用率、记账笔数）和最近 5 条记录。
 * 这里的预算数据独立加载，因为首页只需要显示当前月的预算，不需要完整列表。
 */
const DashboardPage: React.FC<DashboardProps> = ({ expenses, monthlyTotal, selectedMonth, loading, onGoExpenses }) => {
  const { t } = useTranslation()

  // 当前月的预算金额（null 表示尚未设置）
  const [budget, setBudget] = useState<number | null>(null)

  // 取最近 5 条记录用做快速预览，用 useMemo 避免每次渲染都重新计算
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses])

  // 预算使用百分比（超过 100% 时显示上限 100%，用颜色区分是否超支）
  const budgetPct = budget && budget > 0 ? Math.min((monthlyTotal / budget) * 100, 100) : 0
  const isOver = budget && monthlyTotal > budget

  // 每次切换月份或数据更新后，从数据库加载该月的预算
  useEffect(() => {
    window.electronAPI?.getBudget(selectedMonth).then((data) => setBudget(data ? data.amount : null))
  }, [selectedMonth, monthlyTotal])

  return (
    // Spin 组件：数据加载中时显示旋转动画，加载完成后显示内容
    <Spin spinning={loading}>
      <div style={pageTitleStyle}>{t('home.welcome')}</div>

      {/* 三张统计卡：月总支出、预算使用率、记账笔数 */}
      {/* Row 的 gutter 属性：列间距 16px，24 列栅格系统（xs=手机，sm=平板/桌面） */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 第一张卡：月总支出 */}
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t('home.monthlyTotal')} value={monthlyTotal} precision={2} prefix="¥" valueStyle={{ color: monthlyTotal > 0 ? '#cf1322' : '#999' }} />
          </Card>
        </Col>

        {/* 第二张卡：预算使用率（圆形进度条） */}
        <Col xs={24} sm={8}>
          <Card>
            <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>{t('home.budgetUsage')}</div>
            {budget ? (
              <>
                {/* 圆形进度条：绿色正常，红色超支 */}
                <Progress type="circle" percent={Math.round(budgetPct)} size={80} status={isOver ? 'exception' : 'normal'} />
                <div style={{ marginTop: 8, fontSize: 12, color: isOver ? '#ff4d4f' : '#52c41a' }}>
                  {isOver ? t('home.overBudget') : t('home.budgetRemaining')}: ¥{Math.abs((budget || 0) - monthlyTotal).toFixed(2)}
                </div>
              </>
            ) : (
              // 未设置预算时显示跳转链接
              <Button type="link" onClick={onGoExpenses} style={{ padding: 0 }}>{t('home.noBudget')}，{t('expense.budgetClick')}</Button>
            )}
          </Card>
        </Col>

        {/* 第三张卡：本月记账笔数 */}
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t('home.recordCount')} value={expenses.length} suffix={t('common.records')} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      {/* 最近 5 条记录：快速回顾本月支出 */}
      <Card title={t('home.recentRecords')}>
        {recentExpenses.length === 0 ? (
          // 空状态：本月还没有记录
          <Empty description={t('home.noRecords')}>
            <span style={{ color: '#999', fontSize: 13 }}>{t('home.noRecordsHint')}</span>
          </Empty>
        ) : (
          // 列表展示：每条记录一行，日期 + 分类标签 + 金额
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentExpenses.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
                <div>
                  <Text style={{ fontSize: 13, color: '#666', minWidth: 90, display: 'inline-block' }}>{e.date}</Text>
                  <Tag color="blue" style={{ marginLeft: 8 }}>{e.category_l1}</Tag>
                  <Tag>{e.category_l2}</Tag>
                </div>
                {/* 金额用醒目的红色 */}
                <Text strong style={{ color: '#ff4d4f' }}>¥{e.amount.toFixed(2)}</Text>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Spin>
  )
}

// ---------- ② 记一笔（添加新支出） ----------

/** 记一笔页面的输入参数 */
interface AddExpenseProps {
  categories: Record<string, CategoryItem>  // 所有可用分类（预置 + 用户自定义）
  selectedMonth: string                      // 当前月份
  onSuccess: () => void                      // 添加成功后通知父组件刷新数据
  goToExpenses: () => void                   // 跳转到支出明细页
}

/**
 * 记一笔页面组件
 *
 * 核心交互：一级分类选中后，二级分类下拉框自动显示对应的选项——这是通过监听表单字段
 * category_l1 的值，每次变化时动态生成 l2Options 来实现的。
 */
const AddExpensePage: React.FC<AddExpenseProps> = ({ categories, selectedMonth, onSuccess, goToExpenses }) => {
  const { t } = useTranslation()
  const [form] = Form.useForm()               // Ant Design 表单实例（用于获取/设置表单值）
  const [saving, setSaving] = useState(false)  // 是否正在保存（控制按钮 loading 状态）

  // Form.useWatch：实时监听表单中"一级分类"字段的变化
  // 用户选了"餐饮美食"后，二级分类就变成["早餐","午餐","晚餐"...]
  const selectedL1: string | undefined = Form.useWatch('category_l1', form)

  // 一级分类的下拉选项（用 useMemo 避免每次渲染重建）
  const l1Options = useMemo(() => Object.entries(categories).map(([key, val]) => ({ value: key, label: val.label })), [categories])

  // 二级分类选项：依赖当前选中的一级分类，未选时为空列表
  const l2Options = selectedL1 ? (categories[selectedL1]?.children.map((c) => ({ value: c, label: c })) || []) : []

  /**
   * 提交表单的完整流程：
   * 1. 校验表单（必填项、金额最小值）
   * 2. 将数据通过 electronAPI 发给主进程存入数据库
   * 3. 成功后清空表单、通知父组件刷新
   * 4. 失败时（排除表单校验失败）提示用户
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()  // 触发表单校验
      setSaving(true)
      await window.electronAPI.addExpense({
        amount: values.amount,
        category_l1: values.category_l1,
        category_l2: values.category_l2,
        date: values.date.format('YYYY-MM-DD'),  // dayjs 对象 → 字符串
        note: values.note || '',
      })
      message.success(t('add.success'))
      form.resetFields()
      // 重置后默认日期回到今天，金额清空
      form.setFieldsValue({ date: dayjs(), amount: undefined })
      onSuccess()
    } catch (err: any) {
      // errorFields 存在 = 表单校验失败（只需提示用户填完整，不算错误）
      if (err?.errorFields) return
      message.error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  // 页面打开时，默认日期设为今天
  useEffect(() => {
    form.setFieldsValue({ date: dayjs() })
  }, [])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={pageTitleStyle}>{t('add.title')}</div>
      <Card>
        {/*
          表单布局说明：
          1. 金额 — 数字输入，精确到分(2位小数)，最小 0.01 元
          2. 一级分类 — 下拉选择，选中后触发二级分类联动
          3. 二级分类 — 依赖一级分类的值，未选一级时置灰(disabled)
          4. 日期 — 日期选择器，默认今天
          5. 备注 — 可选，最多 100 字，带字数统计
        */}
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label={t('add.amount')} rules={[{ required: true, message: t('validate.amountRequired') }, { type: 'number', min: 0.01, message: t('validate.amountMin') }]}>
            <InputNumber prefix="¥" placeholder={t('add.amountPlaceholder')} style={{ width: '100%' }} precision={2} size="large" />
          </Form.Item>
          <Form.Item name="category_l1" label={t('add.categoryL1')} rules={[{ required: true, message: t('validate.l1Required') }]}>
            <Select placeholder={t('add.categoryL1Placeholder')} options={l1Options} size="large" onChange={() => form.setFieldsValue({ category_l2: undefined })} />
          </Form.Item>
          <Form.Item name="category_l2" label={t('add.categoryL2')} rules={[{ required: true, message: t('validate.l2Required') }]}>
            <Select placeholder={selectedL1 ? t('add.categoryL2Placeholder') : t('add.categoryL2Hint')} options={l2Options} size="large" disabled={!selectedL1} />
          </Form.Item>
          <Form.Item name="date" label={t('add.date')} rules={[{ required: true, message: t('validate.dateRequired') }]}>
            <DatePicker style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item name="note" label={t('add.note')}>
            <Input.TextArea placeholder={t('add.notePlaceholder')} rows={2} maxLength={100} showCount />
          </Form.Item>
          <Button type="primary" size="large" block onClick={handleSubmit} loading={saving} icon={<PlusOutlined />}>
            {t('add.submit')}
          </Button>
        </Form>
      </Card>
    </div>
  )
}

// ---------- ③ 支出明细（列表 + 搜索 + 编辑 + 删除 + 预算 + 导出） ----------

/** 支出明细页面的输入参数 */
interface ExpenseListProps {
  expenses: Expense[];                                // 本月支出记录
  loading: boolean;                                   // 加载状态
  selectedMonth: string;                              // 当月
  monthlyTotal: number;                               // 本月总额
  categories: Record<string, CategoryItem>;           // 全部分类（供编辑弹窗用）
  onRefresh: () => void;                              // 刷新数据回调
}

/**
 * 支出明细页面组件
 *
 * 这是功能最多的页面，集成了：
 * - 数据表格（可排序、分页）
 * - 搜索过滤（按备注/分类/金额实时过滤）
 * - 编辑弹窗（修改已有记录）
 * - 删除确认（二次确认防止误删）
 * - 月度预算设置
 * - CSV 导出
 */
const ExpenseListPage: React.FC<ExpenseListProps> = ({ expenses, loading, selectedMonth, monthlyTotal, categories, onRefresh }) => {
  const { t } = useTranslation()

  // ---- 组件内部状态 ----
  const [searchText, setSearchText] = useState('')               // 搜索框内容
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)  // 正在编辑的记录
  const [modalOpen, setModalOpen] = useState(false)               // 编辑弹窗是否打开
  const [form] = Form.useForm()                                   // 编辑弹窗的表单实例
  const [budget, setBudget] = useState<number | null>(null)       // 当月预算
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)   // 预算弹窗是否打开
  const [budgetForm] = Form.useForm()                             // 预算弹窗的表单实例

  // 每次切换月份或数据更新后，加载该月的预算
  useEffect(() => {
    window.electronAPI?.getBudget(selectedMonth).then((data) => setBudget(data ? data.amount : null))
  }, [selectedMonth, monthlyTotal])

  /**
   * 实时搜索过滤：
   * 在搜索框中输入关键词后，同时对备注、一级分类、二级分类、金额四个字段进行模糊匹配。
   * 注意：金额用 String() 转换后匹配，所以搜"25"能找到金额包含"25"的记录。
   */
  const filtered = expenses.filter((e) => {
    if (!searchText.trim()) return true  // 没输入关键词 = 显示全部
    const kw = searchText.trim().toLowerCase()
    return e.note.toLowerCase().includes(kw) || e.category_l1.includes(kw) || e.category_l2.includes(kw) || String(e.amount).includes(kw)
  })

  // 导出 CSV：调用主进程的导出接口，弹出系统"另存为"对话框
  const handleExport = async () => {
    try { const r = await window.electronAPI.exportCSV(selectedMonth); if (r.success) message.success(t('expense.exportSuccess')) } catch { message.error(t('expense.exportFail')) }
  }

  // 设置月度预算
  const handleSetBudget = async () => {
    try { const v = await budgetForm.validateFields(); await window.electronAPI.setBudget(selectedMonth, v.amount); setBudget(v.amount); setBudgetModalOpen(false); message.success(t('budget.success')) } catch { /* 表单校验失败，不做任何事（但这里也吞掉了真实操作失败的错误） */ }
  }

  // 打开编辑弹窗：把当前记录的数据填进表单
  const openEdit = (r: Expense) => { setEditingExpense(r); form.setFieldsValue({ amount: r.amount, category_l1: r.category_l1, category_l2: r.category_l2, date: dayjs(r.date), note: r.note }); setModalOpen(true) }

  // 提交编辑：根据 editingExpense 是否为空判断是新增还是修改
  const handleSubmit = async () => {
    try {
      const v = await form.validateFields()
      const data = { amount: v.amount, category_l1: v.category_l1, category_l2: v.category_l2, date: v.date.format('YYYY-MM-DD'), note: v.note || '' }
      if (editingExpense) { await window.electronAPI.updateExpense({ ...data, id: editingExpense.id }); message.success(t('add.editSuccess')) }
      setModalOpen(false); form.resetFields(); onRefresh()
    } catch (err: any) { if (err?.errorFields) return; message.error(t('common.error')) }
  }

  // 删除记录（已在 Popconfirm 中做了二次确认）
  const handleDelete = async (id: number) => { try { await window.electronAPI.deleteExpense(id); message.success(t('expense.deleteSuccess')); onRefresh() } catch { message.error(t('expense.deleteFail')) } }

  // 编辑弹窗中的分类联动（和记一笔页面相同的逻辑）
  const selectedL1: string | undefined = Form.useWatch('category_l1', form)
  const l1Options = useMemo(() => Object.entries(categories).map(([key, val]) => ({ value: key, label: val.label })), [categories])
  const l2Options = selectedL1 ? (categories[selectedL1]?.children.map((c) => ({ value: c, label: c })) || []) : []

  /**
   * 表格列定义
   * Ant Design Table 的列配置：每列定义标题、数据字段、宽度和渲染方式
   * render 函数决定这一列的单元格长什么样（不只是显示原始数据）
   */
  const columns = [
    // 日期列：直接显示，灰色小字
    { title: t('expense.colDate'), dataIndex: 'date', key: 'date', width: 120, render: (d: string) => <span style={{ color: '#666' }}>{d}</span> },
    // 金额列：红色加粗，¥ 符号前缀，保留两位小数
    { title: t('expense.colAmount'), dataIndex: 'amount', key: 'amount', width: 130, render: (a: number) => <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 15 }}>¥ {a.toFixed(2)}</span> },
    // 分类列：一级分类（蓝色标签）+ 分隔点 + 二级分类（默认标签）
    { title: t('expense.colCategory'), key: 'category', width: 220, render: (_: unknown, r: Expense) => <Space size={4}><Tag color="blue">{r.category_l1}</Tag><span style={{ color: '#999' }}>·</span><Tag>{r.category_l2}</Tag></Space> },
    // 备注列：有备注显示灰色文字，无备注显示"无备注"占位
    { title: t('expense.colNote'), dataIndex: 'note', key: 'note', ellipsis: true, render: (n: string) => <span style={{ color: n ? '#333' : '#ccc' }}>{n || t('expense.noNote')}</span> },
    // 操作列：编辑按钮 + 删除确认（Popconfirm 是"点删除后弹出气泡让你确认"的组件）
    {
      title: t('expense.colAction'), key: 'action', width: 140,
      render: (_: unknown, r: Expense) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>{t('expense.edit')}</Button>
          <Popconfirm title={t('expense.deleteConfirm')} description={t('expense.deleteDesc')} onConfirm={() => handleDelete(r.id)} okText={t('expense.deleteOk')} cancelText={t('expense.deleteCancel')} okButtonProps={{ danger: true }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>{t('expense.delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={pageTitleStyle}>{t('menu.expenses')}</div>
      {/* ---- 顶部信息栏：月度总额 + 预算进度条 ---- */}
      <Card style={{ marginBottom: 16 }} size="small">
        <Row gutter={16} align="middle">
          <Col>
            <Statistic title={selectedMonth + ' ' + t('expense.monthlyTotal')} value={monthlyTotal} precision={2} prefix="¥" valueStyle={{ color: monthlyTotal > 0 ? '#cf1322' : '#999', fontSize: 20 }} />
          </Col>
          {/* 预算区域：可点击打开设置弹窗，虚线边框表示"可点击编辑" */}
          <Col>
            <div style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 6, background: '#fafafa', border: '1px dashed #d9d9d9' }}
              onClick={() => { budgetForm.setFieldsValue({ amount: budget || undefined }); setBudgetModalOpen(true) }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{t('expense.budget')} {budget ? `¥${budget.toFixed(0)}` : `(${t('expense.budgetClick')})`}</Text>
              {budget && budget > 0 && (
                <div style={{ marginTop: 4 }}>
                  {/* 预算使用百分比 和 剩余/超支金额 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: monthlyTotal > budget ? '#ff4d4f' : '#52c41a' }}>{t('expense.budgetUsed')} {((monthlyTotal / budget) * 100).toFixed(0)}%</span>
                    <span style={{ color: monthlyTotal > budget ? '#ff4d4f' : '#52c41a' }}>{monthlyTotal > budget ? t('expense.budgetOver') : t('expense.budgetRemaining')} ¥{Math.abs(budget - monthlyTotal).toFixed(2)}</span>
                  </div>
                  {/* 迷你进度条：绿色正常，红色超支，通过 width 百分比动画展示 */}
                  <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 2, width: 160 }}>
                    <div style={{ height: '100%', width: `${Math.min((monthlyTotal / budget) * 100, 100)}%`, background: monthlyTotal > budget ? '#ff4d4f' : '#52c41a', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* ---- 搜索栏 + 导出按钮 ---- */}
      <Card style={{ marginBottom: 16 }} size="small">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input prefix={<span>🔍</span>} placeholder={t('expense.search')} value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear />
          </Col>
          <Col><Button onClick={handleExport} icon={<span>📥</span>}>{t('expense.exportCSV')}</Button></Col>
        </Row>
      </Card>

      {/* ---- 数据表格 ---- */}
      <Card>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `${t('common.total')} ${total} ${t('common.records')}${searchText ? ` (${t('expense.filtered')})` : ''}` }}
          locale={{ emptyText: searchText ? t('expense.noMatch') : t('expense.noRecords') }} />
      </Card>

      {/* 编辑弹窗 */}
      <Modal title={t('add.editTitle')} open={modalOpen} onOk={handleSubmit} onCancel={() => { setModalOpen(false); form.resetFields() }} okText={t('common.save')} cancelText={t('common.cancel')} width={500} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="amount" label={t('add.amount')} rules={[{ required: true, message: t('validate.amountRequired') }, { type: 'number', min: 0.01, message: t('validate.amountMin') }]}>
            <InputNumber prefix="¥" placeholder={t('add.amountPlaceholder')} style={{ width: '100%' }} precision={2} />
          </Form.Item>
          <Form.Item name="category_l1" label={t('add.categoryL1')} rules={[{ required: true, message: t('validate.l1Required') }]}>
            <Select options={l1Options} onChange={() => form.setFieldsValue({ category_l2: undefined })} />
          </Form.Item>
          <Form.Item name="category_l2" label={t('add.categoryL2')} rules={[{ required: true, message: t('validate.l2Required') }]}>
            <Select options={l2Options} disabled={!selectedL1} />
          </Form.Item>
          <Form.Item name="date" label={t('add.date')} rules={[{ required: true, message: t('validate.dateRequired') }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label={t('add.note')}>
            <Input.TextArea placeholder={t('add.notePlaceholder')} rows={2} maxLength={100} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预算弹窗 */}
      <Modal title={`${t('budget.title')} - ${selectedMonth}`} open={budgetModalOpen} onOk={handleSetBudget} onCancel={() => setBudgetModalOpen(false)} okText={t('budget.save')} cancelText={t('budget.cancel')} destroyOnClose>
        <Form form={budgetForm} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="amount" label={t('budget.amount')} rules={[{ required: true, message: t('validate.amountRequired') }, { type: 'number', min: 0.01, message: t('validate.amountMin') }]}>
            <InputNumber prefix="¥" placeholder={t('budget.placeholder')} style={{ width: '100%' }} precision={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ---------- ④ 统计分析（饼图 + 趋势图 + 排名） ----------

/** 统计分析页面的输入参数 */
interface StatsProps {
  categoryStats: CategoryStat[];                     // 当月各分类的支出汇总
  monthlyTrend: MonthlyTrend[];                      // 近 12 个月的趋势数据
  selectedMonth: string;                             // 当前月份
  loading: boolean;                                  // 加载状态
  categories: Record<string, CategoryItem>;          // 分类信息（含 emoji 标签）
}

/**
 * 统计分析页面组件
 *
 * 三大板块：
 * - 左侧：分类支出饼图（环形图，直观看出哪个分类花最多）
 * - 右侧：月度趋势柱状图（展示近 12 个月的支出变化）
 * - 底部：分类排行卡片（金额从高到低，附带占比百分比）
 */
const StatsPage: React.FC<StatsProps> = ({ categoryStats, monthlyTrend, selectedMonth, loading, categories }) => {
  const { t } = useTranslation()

  // ---- 饼图配置 ----
  // @ant-design/charts 的 Pie 组件通过配置对象来定义图表，而非写 JSX 子元素
  const pieConfig = {
    // 把原始数据转成图表需要的格式：{ category: '餐饮美食', value: 500 }
    data: categoryStats.map((i) => ({ category: i.category_l1, value: i.total })),
    // angleField：哪个字段决定扇形的大小 → value(金额)
    // colorField：哪个字段决定扇形的颜色 → category(分类名)
    angleField: 'value', colorField: 'category',
    // radius: 外半径 0.8，innerRadius: 内半径 0.6 → 形成环形图(donut chart)
    radius: 0.8, innerRadius: 0.6,
    label: { text: 'category', position: 'outside' as const, style: { fontSize: 12 } },
    statistic: { title: { content: t('stats.totalSpent'), style: { fontSize: 14 } } },
    legend: { position: 'bottom' as const, layout: 'horizontal' as const },
    color: Object.values(categoryColors),
    tooltip: { title: 'category', items: [{ channel: 'y', valueFormatter: (v: number) => `¥ ${v.toFixed(2)}` }] },
  }
  // ---- 柱状图配置(月度趋势) ----
  const columnConfig = {
    data: monthlyTrend.map((i) => ({ month: i.month, total: i.total })),
    xField: 'month', yField: 'total', color: '#1677ff',
    // 柱顶显示金额标签(取整)
    label: { text: (d: { total: number }) => `¥${d.total.toFixed(0)}`, position: 'top' as const, style: { fontSize: 11, fontWeight: 500 } },
    tooltip: { items: [{ channel: 'y', valueFormatter: (v: number) => `¥ ${v.toFixed(2)}` }] },
    axis: { y: { title: t('common.amount') + ' (¥)' } },
    // 顶部圆角，视觉更柔和
    style: { radiusTopLeft: 6, radiusTopRight: 6 },
  }

  return (
    <Spin spinning={loading}>
      <div style={pageTitleStyle}>{t('menu.statistics')}</div>
      {/* 栅格布局：大屏幕(lg)并排两个图表，小屏幕上下堆叠 */}
      <Row gutter={[16, 16]}>
        {/* 左/上：饼图 */}
        <Col xs={24} lg={12}>
          <Card title={<Space><PieChartOutlined style={{ color: '#1677ff' }} /><span>{selectedMonth} {t('stats.categoryPie')}</span></Space>}>
            {categoryStats.length > 0 ? <div style={{ height: 360 }}><Pie {...pieConfig} /></div> : <Empty description={t('stats.noDataThisMonth')} style={{ padding: '60px 0' }} />}
          </Card>
        </Col>
        {/* 右/下：趋势柱状图 */}
        <Col xs={24} lg={12}>
          <Card title={<Space><BarChartOutlined style={{ color: '#1677ff' }} /><span>{t('stats.monthlyTrend')}</span></Space>}>
            {monthlyTrend.length > 0 ? <div style={{ height: 360 }}><Column {...columnConfig} /></div> : <Empty description={t('stats.noData')} style={{ padding: '60px 0' }} />}
          </Card>
        </Col>
        {/* 底部通栏：分类排行卡片列表 */}
        <Col xs={24}>
          <Card title={t('stats.ranking')}>
            {categoryStats.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {categoryStats.map((item) => {
                  // 计算此分类占总支出的百分比
                  const total = categoryStats.reduce((s, x) => s + x.total, 0)
                  const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0'
                  return (
                    // 每张卡片左边有一条彩色竖线，颜色和饼图一致
                    <Card key={item.category_l1} size="small" style={{ width: 200, borderLeft: `3px solid ${categoryColors[item.category_l1] || '#ddd'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><Text style={{ marginRight: 6 }}>{categories[item.category_l1]?.label || item.category_l1}</Text><Text type="secondary" style={{ fontSize: 11 }}>{pct}%</Text></span>
                        <Text strong style={{ color: '#cf1322' }}>¥{item.total.toFixed(2)}</Text>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : <Empty description={t('stats.noData')} />}
          </Card>
        </Col>
      </Row>
    </Spin>
  )
}

// ---------- ⑤ 分类管理 ----------

/** 分类管理页面的输入参数 */
interface CategoryPageProps {
  userCategories: UserCategory[]     // 用户自定义的分类列表
  onRefresh: () => void              // 增删改后刷新
}

/**
 * 分类管理页面组件
 *
 * 两栏布局：
 * - 上半部分：展示预置分类（锁定不可修改的标签）
 * - 下半部分：展示自定义分类（可增删改的卡片列表）
 *
 * 添加/编辑用的是同一个弹窗(Modal)，通过 editingCat 是否为空来区分模式。
 */
const CategoryPage: React.FC<CategoryPageProps> = ({ userCategories, onRefresh }) => {
  const { t } = useTranslation()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<UserCategory | null>(null)
  const [catForm] = Form.useForm()
  const [subItems, setSubItems] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)

  const openAdd = () => { setEditingCat(null); catForm.resetFields(); setSubItems(['']); setFormOpen(true) }
  const openEdit = (c: UserCategory) => { setEditingCat(c); catForm.setFieldsValue({ category_l1: c.category_l1, emoji: c.emoji }); setSubItems(c.children.length > 0 ? [...c.children] : ['']); setFormOpen(true) }

  const handleSubmit = async () => {
    try {
      const v = await catForm.validateFields()
      const children = subItems.filter((s) => s.trim() !== '')
      if (children.length === 0) { message.warning(t('cat.minOneSub')); return }
      setSaving(true)
      if (editingCat) {
        const r = await window.electronAPI.updateUserCategory({ id: editingCat.id, category_l1: v.category_l1?.trim(), emoji: v.emoji?.trim(), children })
        if (r.success) { message.success(t('cat.editSuccess')); setFormOpen(false); onRefresh() } else { message.warning(r.message) }
      } else {
        const r = await window.electronAPI.addUserCategory({ category_l1: v.category_l1?.trim(), emoji: v.emoji?.trim(), children })
        if (r.success) { message.success(t('cat.addSuccess')); setFormOpen(false); onRefresh() } else { message.warning(r.message) }
      }
    } catch { /* validation */ }
    finally { setSaving(false) }
  }

  const handleDelete = (c: UserCategory) => {
    Modal.confirm({
      title: `${t('cat.deleteConfirm')} "${c.category_l1}"?`,
      content: t('cat.deleteDesc'),
      okText: t('cat.deleteOk'), cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => { await window.electronAPI.deleteUserCategory(c.id); message.success(t('cat.deletedSuccess')); onRefresh() },
    })
  }

  const addSub = () => setSubItems([...subItems, ''])
  const removeSub = (i: number) => { if (subItems.length <= 1) return; const n = [...subItems]; n.splice(i, 1); setSubItems(n) }

  return (
    <div>
      <div style={pageTitleStyle}>{t('menu.categories')}</div>

      {/* 预置分类 */}
      <Card title={t('cat.preset')} size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(presetCategories).map(([key, val]) => (
            <Tag key={key} color="default" style={{ padding: '4px 10px', fontSize: 13 }}>🔒 {val.label}（{val.children.length}{t('cat.subCategories')}）</Tag>
          ))}
        </div>
      </Card>

      {/* 自定义分类 */}
      <Card title={t('cat.custom')} size="small" style={{ marginBottom: 16 }}
        extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAdd}>{t('cat.addBtn')}</Button>}>
        {userCategories.length === 0 ? (
          <Empty description={t('cat.noCustom')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {userCategories.map((c) => (
              <Card key={c.id} size="small" styles={{ body: { padding: '10px 14px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div><Text strong style={{ fontSize: 14 }}>{c.emoji} {c.category_l1}</Text><Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{c.children.length}{t('cat.subCategories')}</Text></div>
                  <Space size={4}>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(c)} />
                    <Popconfirm title={`${t('cat.deleteConfirm')}?`} description={t('cat.deleteDesc')} onConfirm={() => handleDelete(c)} okText={t('cat.deleteOk')} cancelText={t('common.cancel')} okButtonProps={{ danger: true }}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {c.children.map((child, i) => <Tag key={i} color="blue" style={{ fontSize: 12 }}>{child}</Tag>)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* 添加/编辑弹窗 */}
      <Modal title={editingCat ? t('cat.editDialog') : t('cat.addDialog')} open={formOpen} onOk={handleSubmit} onCancel={() => { setFormOpen(false); setEditingCat(null) }} okText={t('cat.save')} cancelText={t('cat.cancel')} confirmLoading={saving} destroyOnClose>
        <Form form={catForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="category_l1" label={t('cat.name')} rules={[{ required: true, message: t('cat.nameRequired') }, { max: 20, message: t('cat.nameMax') }]}>
            <Input placeholder={t('cat.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="emoji" label={t('cat.emoji')}><Input placeholder={t('cat.emojiPlaceholder')} maxLength={2} style={{ width: 120 }} /></Form.Item>
          <Form.Item label={t('cat.subLabel')} required>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {subItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input value={item} onChange={(e) => { const n = [...subItems]; n[i] = e.target.value; setSubItems(n) }} placeholder={t('cat.subPlaceholder').replace('{index}', String(i + 1))} maxLength={15} />
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeSub(i)} disabled={subItems.length <= 1} />
                </div>
              ))}
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addSub} style={{ alignSelf: 'flex-start' }}>{t('cat.addSub')}</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ---------- ⑥ 设置页面 ----------

/** 设置页面的输入参数 */
interface SettingsProps {
  onCheckUpdate: () => void     // 触发检查更新的回调
  updateChecking: boolean       // 是否正在检查中(控制按钮 loading)
}

/**
 * 设置页面组件
 *
 * 提供：语言切换、版本检查、关于信息、数据位置说明。
 * 这个页面几乎没有交互状态，纯展示型组件。
 */
const SettingsPage: React.FC<SettingsProps> = ({ onCheckUpdate, updateChecking }) => {
  const { t, lang } = useTranslation()

  return (
    <div>
      <div style={pageTitleStyle}>{t('menu.settings')}</div>

      <Card title={t('settings.language')} size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text type="secondary">{t('settings.languageDesc')}</Text>
          <Select value={lang} style={{ width: 140 }} onChange={(v) => setLanguage(v as Language)}
            options={[{ value: 'zh-CN', label: '🇨🇳 中文' }, { value: 'en-US', label: '🇺🇸 English' }]} />
        </div>
      </Card>

      <Card title={t('settings.update')} size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<SyncOutlined spin={updateChecking} />} onClick={onCheckUpdate} loading={updateChecking}>{t('settings.updateCheck')}</Button>
        </Space>
      </Card>

      <Card title={t('settings.about')} size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><Text type="secondary">{t('settings.appName')}：</Text><Text>黑马记账 Heima Tracker</Text></div>
          <div><Text type="secondary">{t('settings.version')}：</Text><Tag color="blue">v{APP_VERSION}</Tag></div>
          <div><Text type="secondary">{t('settings.repo')}：</Text><a href="https://github.com/x-1784/heima-accounting" target="_blank" rel="noreferrer"><GithubOutlined /> GitHub</a></div>
        </div>
      </Card>

      <Card title={t('settings.data')} size="small">
        <Text type="secondary">{t('settings.dbLocation')}</Text>
      </Card>
    </div>
  )
}

// ---------- ⑦ 贪吃蛇小游戏 ----------

// ===== 游戏常量 =====
// 这些值放到组件外部，因为它们在组件的整个生命周期里不变

/** 棋盘网格数（20×20 = 400 个格子） */
export const SNAKE_GRID = 20

/** 每个格子的像素大小（24×24 px） */
const SNAKE_CELL = 24

/** 初始移动速度（毫秒/步，数值越小蛇越快） */
const SNAKE_INITIAL_SPEED = 200

/** 每吃一个食物加速多少毫秒 */
const SNAKE_SPEED_INC = 5

/** 最快速度上限（防止快到无法操作） */
const SNAKE_MIN_SPEED = 60

// ===== 类型定义 =====

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
interface Point { x: number; y: number }

/**
 * 方向对应的坐标变化量（向量）
 * 坐标系说明：x 轴向右增加，y 轴向下增加（屏幕坐标系，不是数学坐标系！）
 * 所以 UP    = y 减 1（屏幕上方向是往上）
 *     DOWN  = y 加 1（屏幕下方向是往下）
 *     LEFT  = x 减 1
 *     RIGHT = x 加 1
 */
export const DIR: Record<Direction, Point> = {
  UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 },
}

/**
 * 禁止 180° 掉头的反方向表
 * 例如蛇正往右走(RIGHT)时，用户按左键(LEFT)：
 * 检查 OPPOSITE['LEFT'] === 'RIGHT'，和当前方向一致 → 忽略这次按键
 */
export const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
}

// 键盘按键 → 方向的映射表
// 放在模块顶层而非组件内，避免每次按键都重新创建一个新对象
// 支持方向键(Arrow*) 和 WASD(小写+大写,开大写锁定也能玩)
export const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
  W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
}

/**
 * 随机生成一个不在蛇身上的食物位置
 *
 * 算法：
 * 1. 把蛇占的所有格子放进"黑名单"集合(Set)，查找是 O(1) 的
 * 2. 遍历 400 格棋盘，收集不在黑名单中的格子
 * 3. 从可用格子中随机挑一个
 * 4. 棋盘全满时返回 null（意味着玩家通关了整个 400 格棋盘！）
 *
 * @param snake 蛇当前占用的格子列表
 * @returns 食物坐标，棋盘满时返回 null
 */
export function randomFood(snake: Point[]): Point | null {
  const occupied = new Set(snake.map(p => `${p.x},${p.y}`))
  const available: Point[] = []
  for (let x = 0; x < SNAKE_GRID; x++)
    for (let y = 0; y < SNAKE_GRID; y++)
      if (!occupied.has(`${x},${y}`)) available.push({ x, y })
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

/**
 * 贪吃蛇游戏页面组件
 *
 * —— 整体架构说明（理解这段注释很重要）——
 *
 * 游戏状态用两组变量来管理：
 *
 * 【ref 组（"参考值"）】— 游戏循环内部高速读写，不触发界面重绘
 * 为什么需要 ref？
 *   setTimeout 的回调会"抓住"创建时的旧值（闭包陷阱），
 *   如果用 state 值，tick 里读到的永远是游戏开始那一刻的初始值。
 *   用 ref 可以确保每次读取到的都是最新值。
 *   - snakeRef, foodRef：实体坐标
 *   - directionRef：当前实际移动方向
 *   - nextDirRef：用户最新按键方向（排队到下个 tick 生效，防止同一步内多次按键穿墙）
 *   - speedRef：当前速度（毫秒/步）
 *   - bestRef：最高分（从 best state 同步过来）
 *
 * 【state 组】— 改了之后 React 自动刷新界面显示
 *   - snake, food → 画面上的蛇身和食物
 *   - running, paused, gameOver → 控制游戏流程的三个开关
 *   - best → 最高分（同时存 localStorage 做持久化）
 */
const SnakeGamePage: React.FC = () => {
  const { t } = useTranslation()

  // ===== ref 组（游戏循环内部用，避免闭包陷阱） =====
  const snakeRef = useRef<Point[]>([])
  const foodRef = useRef<Point>({ x: 10, y: 10 })
  const directionRef = useRef<Direction>('RIGHT')
  const nextDirRef = useRef<Direction>('RIGHT')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speedRef = useRef(SNAKE_INITIAL_SPEED)
  const bestRef = useRef(0)

  // ===== state 组（触发界面重绘） =====
  const [snake, setSnake] = useState<Point[]>([])
  const [food, setFood] = useState<Point>({ x: 10, y: 10 })
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [best, setBest] = useState(() => {
    // 应用启动时，从浏览器本地存储读取历史最高分
    try { return parseInt(localStorage.getItem('snake-best') || '0', 10) } catch { return 0 }
  })

  // 把 best state 的值同步到 bestRef，确保游戏结束回调能拿到最新值
  useEffect(() => { bestRef.current = best }, [best])

  // 得分 = 蛇身长度 - 3（初始 3 格 = 0 分，每吃一个食物身体 +1 = 得分 +1）
  const score = snake.length > 0 ? snake.length - 3 : 0

  // ===== 游戏流程控制 =====

  /** 初始化 / 重新开始：重置所有状态到"准备开始" */
  const init = useCallback(() => {
    const s: Point[] = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
    snakeRef.current = s; directionRef.current = 'RIGHT'; nextDirRef.current = 'RIGHT'
    speedRef.current = SNAKE_INITIAL_SPEED
    const f = randomFood(s)
    if (!f) return // 不可能发生（初始蛇只占 3 格，400 格棋盘远未满）
    foodRef.current = f
    setSnake([...s]); setFood({ ...f })
    setGameOver(false); setPaused(false); setRunning(true)
  }, [])

  /** 停止游戏循环（清除定时器，防止内存泄漏） */
  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  /** 游戏结束处理：停止循环 + 更新最高分 + 存档到本地 */
  const endGame = useCallback(() => {
    stop(); setRunning(false); setGameOver(true)
    const s = snakeRef.current.length - 3
    if (s > bestRef.current) {
      setBest(s)
      try { localStorage.setItem('snake-best', String(s)) } catch {}
    }
  }, [stop]) // bestRef 不是 state，引用不会变，不需要加入依赖

  /**
   * 游戏世界的"一次心跳"（tick = 时钟滴答）
   *
   * 每 speedRef.current 毫秒调用一次，流程：
   * 1. 把用户最新输入的方向拿来（nextDirRef → directionRef）
   * 2. 算出新的蛇头坐标
   * 3. 检查新蛇头是否撞墙 → 游戏结束
   * 4. 检查新蛇头是否撞到自己 → 游戏结束
   *    （注意：检查的是 body = 去掉尾巴的蛇身，因为尾巴马上去掉，
   *      所以新蛇头踩到"即将移走的尾巴"不算撞自己）
   * 5. 检查新蛇头是否和食物重合 → 吃到食物（蛇变长 + 加速 + 生成新食物）
   * 6. 没吃到食物 → 尾部去掉一格（整体前移一步的效果）
   */
  const tick = useCallback(() => {
    const dir = nextDirRef.current; directionRef.current = dir
    const head = snakeRef.current[0]
    const nh: Point = { x: head.x + DIR[dir].x, y: head.y + DIR[dir].y }

    // 撞墙检测
    if (nh.x < 0 || nh.x >= SNAKE_GRID || nh.y < 0 || nh.y >= SNAKE_GRID) { endGame(); return }
    // 撞自己检测（检查"去尾蛇身"，不带尾巴）
    const body = snakeRef.current.slice(0, -1)
    if (body.some(p => p.x === nh.x && p.y === nh.y)) { endGame(); return }

    const ate = nh.x === foodRef.current.x && nh.y === foodRef.current.y
    const ns = [nh, ...snakeRef.current]  // 新蛇身 = 新蛇头 + 旧蛇身
    if (!ate) ns.pop()                     // 没吃到食物：去掉尾巴（=前移一步）

    snakeRef.current = ns; setSnake(ns)

    if (ate) {
      const nf = randomFood(ns)
      if (!nf) { endGame(); return }      // 棋盘满 = 通关！
      foodRef.current = nf; setFood({ ...nf })
      // 加速但不低于最低限制
      speedRef.current = Math.max(SNAKE_MIN_SPEED, speedRef.current - SNAKE_SPEED_INC)
    }
  }, [endGame])

  /**
   * 游戏主循环（递归 setTimeout 模式）
   *
   * 为什么选递归 setTimeout 而不是 setInterval？
   * setInterval 是固定间隔触发，如果某次 tick 因为计算量而卡住，
   * 下一次触发可能和前一次"叠在一起"（并发问题）。
   * 递归 setTimeout：每次 tick 完全执行完毕后才安排下一次，
   * 天然杜绝了并发问题。
   *
   * 速度值存于 speedRef 中，不作为 effect 依赖，所以改变速度不用重建 effect。
   */
  useEffect(() => {
    if (!running || paused) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      return
    }
    const run = () => {
      tick()
      timerRef.current = setTimeout(run, speedRef.current)
    }
    timerRef.current = setTimeout(run, speedRef.current)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [running, paused, tick])

  // ===== 键盘事件监听 =====
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const newDir = KEY_MAP[e.key]
      // 游戏运行中响应方向键，同时禁止 180° 掉头
      // 用 directionRef.current 而非 state，保证拿到的是实时方向
      if (newDir && running && OPPOSITE[newDir] !== directionRef.current) {
        e.preventDefault(); nextDirRef.current = newDir
      }
      // 空格键：暂停/继续（仅在游戏中，不会影响页面的正常空格滚动）
      if (e.key === ' ' && running) { e.preventDefault(); setPaused(p => !p) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [running])

  // 组件卸载时清理计时器（防止内存泄漏——计时器在组件消失后还活着）
  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current) } }, [])

  /**
   * 推导遮罩层状态
   *
   * 棋盘上方的半透明遮罩层有三个互斥的界面状态：
   * - init：游戏还没开始（或结束后再来一轮之前）
   * - over：游戏结束（撞墙/撞自己/通关），显示得分和"重新开始"按钮
   * - paused：游戏中暂停，显示"继续"提示文字
   *
   * 把三个状态合并为一个 overlayState，避免了 JSX 里写三套样式。
   */
  const showOverlay = !running || paused
  const overlayState: 'init' | 'over' | 'paused' = paused ? 'paused' : gameOver ? 'over' : 'init'

  return (
    <div>
      <div style={pageTitleStyle}>🐍 {t('menu.snake')}</div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 18 }}>
          <Statistic title={t('snake.score')} value={score} valueStyle={{ color: '#1677ff', fontSize: 22 }} />
          <Statistic title={t('snake.highScore')} value={best} valueStyle={{ color: '#52c41a', fontSize: 22 }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            position: 'relative', width: SNAKE_GRID * SNAKE_CELL, height: SNAKE_GRID * SNAKE_CELL,
            border: '2px solid #d9d9d9', borderRadius: 6, background: '#1a1a2e', overflow: 'hidden',
            // CSS 渐变绘制网格线（替代 400 个 div）
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: `${SNAKE_CELL}px ${SNAKE_CELL}px`,
          }}>
            {/* 蛇 */}
            {snake.map((p, i) => (
              <div key={`s-${i}`} style={{
                position: 'absolute', left: p.x * SNAKE_CELL + 1, top: p.y * SNAKE_CELL + 1,
                width: SNAKE_CELL - 2, height: SNAKE_CELL - 2,
                borderRadius: i === 0 ? 6 : 4,
                background: i === 0 ? '#95de64' : '#52c41a',
                border: i === 0 ? '2px solid #b7eb8f' : '1px solid #73d13d',
                boxShadow: i === 0 ? '0 0 8px rgba(82,196,26,0.4)' : 'none',
              }} />
            ))}

            {/* 食物 */}
            <div style={{
              position: 'absolute', left: food.x * SNAKE_CELL + 2, top: food.y * SNAKE_CELL + 2,
              width: SNAKE_CELL - 4, height: SNAKE_CELL - 4, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #ff7875, #ff4d4f)',
              boxShadow: '0 0 10px rgba(255,77,79,0.6)',
            }} />

            {/* 遮罩层（初始 / 游戏结束 / 暂停 — 三种状态合并为一个组件） */}
            {showOverlay && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
                {overlayState === 'init' && (<>
                  <div style={{ fontSize: 48 }}>🐍</div>
                  <Button type="primary" size="large" onClick={init}>{t('snake.start')}</Button>
                </>)}
                {overlayState === 'over' && (<>
                  <div style={{ color: '#fff', fontSize: 30, fontWeight: 800 }}>{t('snake.gameOver')}</div>
                  <div style={{ color: '#ddd', fontSize: 16 }}>{t('snake.score')}: {score}</div>
                  <Button type="primary" size="large" onClick={init}>{t('snake.restart')}</Button>
                </>)}
                {overlayState === 'paused' && (
                  <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{t('snake.pause')}</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Space>
            {running && !gameOver && (
              <Button onClick={() => setPaused(p => !p)}>{paused ? t('snake.resume') : t('snake.pause')}</Button>
            )}
            {(gameOver || !running) && (
              <Button type="primary" onClick={init}>{gameOver ? t('snake.restart') : t('snake.start')}</Button>
            )}
          </Space>
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('snake.controlsDesc')}：↑ ↓ ← → &nbsp;|&nbsp; {t('snake.spaceHint')}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ==================== 主应用 ====================

/**
 * 项目的入口组件（"总指挥"）
 *
 * 职责：
 * 1. 管理全局共享状态（支出数据、分类、统计等），作为"数据中心"分发给各页面
 * 2. 渲染整体布局（左侧暗色侧边栏 + 右侧内容区 + 顶栏）
 * 3. 协调数据加载逻辑（何时加载、何时刷新）
 * 4. 处理自动更新流程（只在生产模式下触发）
 *
 * 所有页面的数据都从 App 组件获取（通过 props 传递），这样各页面不需要自己
 * 管理数据加载逻辑，只负责展示和交互。
 */

type PageKey = 'home' | 'add' | 'expenses' | 'stats' | 'categories' | 'snake' | 'settings'

const App: React.FC = () => {
  const { t, lang } = useTranslation()

  // ===== 全局共享状态（"数据中心"） =====

  /** 当前显示的是哪个页面 */
  const [currentPage, setCurrentPage] = useState<PageKey>('home')

  /** 本月全部支出记录列表 */
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)

  /** 选中的月份（格式 YYYY-MM），在顶栏的月份选择器中修改 */
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'))

  /** 本月总支出金额 */
  const [monthlyTotal, setMonthlyTotal] = useState(0)

  /** 本月各分类的支出汇总（饼图用） */
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])

  /** 近 12 个月的月度趋势数据（柱状图用） */
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

  /** 用户自定义的分类列表 */
  const [userCategories, setUserCategories] = useState<UserCategory[]>([])

  /** 触发刷新的计数器：每次 +1 会让所有加载函数重新执行 */
  const [triggerRefresh, setTriggerRefresh] = useState(0)

  // ===== 自动更新相关状态 =====
  const [updateModalOpen, setUpdateModalOpen] = useState(false)      // 更新弹窗是否打开
  const [updateVersion, setUpdateVersion] = useState('')            // 新版本号
  const [updateDownloading, setUpdateDownloading] = useState(false)  // 是否正在下载
  const [updateDownloaded, setUpdateDownloaded] = useState(false)   // 是否已下载完成
  const [updateProgress, setUpdateProgress] = useState(0)            // 下载进度（0-100%）
  const [updateError, setUpdateError] = useState('')                 // 下载失败的错误信息
  const [updateChecking, setUpdateChecking] = useState(false)        // 是否正在检查更新
  const manualCheckRef = useRef(false)  // 是否是用户手动触发的检查（区分静默检查和手动检查）

  /**
   * 合并分类表
   *
   * 把用户自定义的分类和系统预置分类合到一起，形成一个完整的可用分类表。
   * 自定义分类放在前面（用户选的），预置分类放在后面（如果同名，预置的会覆盖自定义的）。
   * 用 useMemo 缓存结果，只在 userCategories 变化时重新计算。
   */
  const allCategories: Record<string, CategoryItem> = useMemo(() => {
    const m: Record<string, CategoryItem> = {}
    for (const uc of userCategories) m[uc.category_l1] = { label: `${uc.emoji || '📌'} ${uc.category_l1}`, children: uc.children }
    return { ...m, ...presetCategories }
  }, [userCategories])

  // ===== 数据加载函数 =====
  // triggerRefresh 变化时（用户在添加/编辑/删除后调用 refreshAll），
  // 所有依赖它的加载函数会自动重新执行。

  const refreshTrigger = triggerRefresh

  /**
   * 加载组件需要的各种数据
   *
   * 这些函数在以下情况下执行：
   * 1. 组件首次加载时（useEffect 触发）
   * 2. 用户切换了月份（selectedMonth 变化 → useEffect 触发）
   * 3. 用户做了增/删/改操作后（refreshAll 被调用 → triggerRefresh 变化）
   *
   * window.electronAPI 是预加载脚本暴露给页面的安全接口（见 src/preload/index.ts）。
   * 在开发环境中如果直接用浏览器打开（而非通过 Electron 运行），
   * electronAPI 可能不存在，所以这里做了空值判断以防崩溃。
   */

  /** 加载支出列表和月度总额 */
  const loadExpenses = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    try {
      const data = await window.electronAPI.getExpenses(selectedMonth)
      setExpenses(data || [])
      const { total } = await window.electronAPI.getMonthlyTotal(selectedMonth)
      setMonthlyTotal(total || 0)
    } catch (err) { console.error(err) }  // TODO: 这里应该给用户一个可见的错误提示
    finally { setLoading(false) }
  }, [selectedMonth, refreshTrigger])

  /** 加载统计数据（分类饼图数据 + 月度趋势数据），两个请求并行发出以加快速度 */
  const loadStats = useCallback(async () => {
    if (!window.electronAPI) return
    setStatsLoading(true)
    try {
      // Promise.all: 两个数据请求同时发出，等两个都回来了再一起处理
      const [stats, trend] = await Promise.all([window.electronAPI.getCategoryStats(selectedMonth), window.electronAPI.getMonthlyTrend()])
      setCategoryStats(stats || [])
      setMonthlyTrend(trend || [])
    } catch (err) { console.error(err) }
    finally { setStatsLoading(false) }
  }, [selectedMonth, refreshTrigger])

  /** 加载用户自定义分类列表 */
  const loadUserCategories = useCallback(async () => {
    if (!window.electronAPI) return
    try { const data = await window.electronAPI.getUserCategories(); setUserCategories(data || []) }
    catch (err) { console.error(err) }
  }, [refreshTrigger])

  /** 刷新全部数据（给 triggerRefresh +1,触发所有 load* 函数重新执行） */
  const refreshAll = useCallback(() => setTriggerRefresh((n) => n + 1), [])

  // ===== 数据加载的生命周期 =====

  // 组件首次打开时加载支出数据和用户分类
  useEffect(() => { loadExpenses() }, [loadExpenses])

  // 切换月份或刷新数据时,同时重新加载支出数据和统计数据
  useEffect(() => { loadExpenses(); loadStats() }, [selectedMonth])

  // 用户分类加载(仅首次打开)
  useEffect(() => { loadUserCategories() }, [loadUserCategories])

  // ===== 自动更新事件监听(来自主进程的推送) =====
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.onUpdateAvailable((info) => { manualCheckRef.current = false; message.destroy('updateCheck'); setUpdateChecking(false); setUpdateVersion(info.version); setUpdateModalOpen(true) })
    window.electronAPI.onDownloadProgress((p) => setUpdateProgress(p.percent))
    window.electronAPI.onUpdateDownloaded((info) => { setUpdateDownloading(false); setUpdateDownloaded(true); setUpdateVersion(info.version) })
    window.electronAPI.onUpdateError((msg) => { manualCheckRef.current = false; message.destroy('updateCheck'); setUpdateChecking(false); setUpdateDownloading(false); setUpdateError(msg) })
    window.electronAPI.onUpdateNotAvailable(() => {
      if (manualCheckRef.current) { manualCheckRef.current = false; message.destroy('updateCheck'); setUpdateChecking(false); message.success(t('settings.upToDate')) }
    })
  }, [lang])

  /** 手动检查更新 */
  const handleCheckUpdate = async () => {
    try {
      manualCheckRef.current = true  // 标记为"用户自己点的"(而非后台静默检查)
      setUpdateChecking(true)
      message.loading({ content: t('settings.checking'), key: 'updateCheck' })
      await window.electronAPI.checkForUpdates()
    } catch {
      manualCheckRef.current = false; setUpdateChecking(false); message.destroy('updateCheck'); message.warning(t('settings.updateFail'))
    }
  }

  /** 顶栏的"记一笔"按钮 → 跳转到添加页面 */
  const handleAddFromHeader = () => setCurrentPage('add')

  /**
   * 侧边栏菜单配置
   *
   * 每个菜单项对应一个页面,点击后 currentPage 变化 → renderPage 返回对应的页面组件。
   * key 值和 PageKey 类型一致,Ant Design Menu 的回调直接返回 key 字符串。
   */
  // --- 侧边栏配置 ---
  const menuItems = [
    { key: 'home', icon: <HomeOutlined />, label: t('menu.home') },
    { key: 'add', icon: <PlusCircleOutlined />, label: t('menu.addExpense') },
    { key: 'expenses', icon: <UnorderedListOutlined />, label: t('menu.expenses') },
    { key: 'stats', icon: <PieChartOutlined />, label: t('menu.statistics') },
    { key: 'categories', icon: <TagsOutlined />, label: t('menu.categories') },
    { key: 'snake', icon: <span style={{ fontSize: 16 }}>🐍</span>, label: t('menu.snake') },
    { key: 'settings', icon: <SettingOutlined />, label: t('menu.settings') },
  ]

  /**
   * 根据 currentPage 渲染对应的页面组件
   *
   * 每个页面从全局状态中获取自己需要的数据（通过 props 传递）。
   * 这样设计的好处是：所有数据在 App 组件统一管理加载逻辑，
   * 各页面组件只管"渲染和交互"，不需要操心数据从哪来。
   */
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <DashboardPage expenses={expenses} monthlyTotal={monthlyTotal} selectedMonth={selectedMonth} loading={loading} onGoExpenses={() => setCurrentPage('expenses')} />
      case 'add':
        return <AddExpensePage categories={allCategories} selectedMonth={selectedMonth} onSuccess={refreshAll} goToExpenses={() => setCurrentPage('expenses')} />
      case 'expenses':
        return <ExpenseListPage expenses={expenses} loading={loading} selectedMonth={selectedMonth} monthlyTotal={monthlyTotal} categories={allCategories} onRefresh={refreshAll} />
      case 'stats':
        return <StatsPage categoryStats={categoryStats} monthlyTrend={monthlyTrend} selectedMonth={selectedMonth} loading={statsLoading} categories={allCategories} />
      case 'categories':
        return <CategoryPage userCategories={userCategories} onRefresh={loadUserCategories} />
      case 'snake':
        return <SnakeGamePage />
      case 'settings':
        return <SettingsPage onCheckUpdate={handleCheckUpdate} updateChecking={updateChecking} />
      default:
        return null
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ========== 侧边栏 ========== */}
      <Sider theme="dark" width={200} breakpoint="lg" collapsedWidth={60} style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}>
        <div style={siderMenuStyle}>
          <div style={logoStyle}>
            <WalletOutlined style={{ marginRight: 8 }} />
            <span style={{ fontSize: 17, fontWeight: 700 }}>黑马记账</span>
          </div>
          <Menu theme="dark" mode="inline" selectedKeys={[currentPage]} items={menuItems} onClick={({ key }) => setCurrentPage(key as PageKey)} style={{ flex: 1, borderRight: 0 }} />
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>v{APP_VERSION}</Text>
          </div>
        </div>
      </Sider>

      {/* ========== 右侧主体 ========== */}
      <Layout>
        {/* Header */}
        <Layout.Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56 }}>
          <div />
          <Space>
            <DatePicker picker="month" value={dayjs(selectedMonth)} onChange={(d: Dayjs | null) => { if (d) setSelectedMonth(d.format('YYYY-MM')) }} allowClear={false} />
            <Button icon={<PlusCircleOutlined />} type="primary" onClick={handleAddFromHeader}>{t('menu.addExpense')}</Button>
          </Space>
        </Layout.Header>

        {/* Content */}
        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 56px)' }}>
          {renderPage()}
        </Content>
      </Layout>

      {/* ========== 自动更新弹窗 ========== */}
      <Modal title={t('update.title')} open={updateModalOpen} onCancel={() => { if (!updateDownloading) setUpdateModalOpen(false) }} closable={!updateDownloading} maskClosable={false}
        width={480}
        footer={
          updateError ? <Button onClick={() => setUpdateModalOpen(false)}>{t('update.later')}</Button>
            : updateDownloaded ? <Button type="primary" onClick={async () => { try { await window.electronAPI.installUpdate() } catch { message.error(t('common.error')) } }}>{t('update.install')}</Button>
              : updateDownloading ? <Button disabled>{t('update.downloading')}</Button>
                : <Space><Button onClick={() => setUpdateModalOpen(false)}>{t('update.later')}</Button><Button type="primary" onClick={async () => { setUpdateDownloading(true); setUpdateError(''); const r = await window.electronAPI.downloadUpdate(); if (!r.success) { setUpdateError(r.message || ''); setUpdateDownloading(false) } }}>{t('update.now')}</Button></Space>
        }>
        <div style={{ padding: '12px 0' }}>
          {updateError ? <div style={{ color: '#ff4d4f' }}><p>{t('update.error')}{updateError}</p><p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>{t('update.checkNetwork')}</p></div>
            : updateDownloading ? <div><p style={{ marginBottom: 16 }}>{t('update.downloading')}</p><div style={{ height: 6, background: '#f0f0f0', borderRadius: 3 }}><div style={{ height: '100%', width: `${updateProgress}%`, background: '#1677ff', borderRadius: 3, transition: 'width 0.3s' }} /></div><p style={{ textAlign: 'center', color: '#999', marginTop: 8, fontSize: 12 }}>{updateProgress.toFixed(1)}%</p></div>
              : updateDownloaded ? <div><p style={{ color: '#52c41a', fontWeight: 500 }}>{t('update.downloaded')}</p><p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>{t('update.install')}</p></div>
                : <div><p style={{ marginBottom: 8 }}>{t('update.found')} <Tag color="blue">v{updateVersion}</Tag></p><p style={{ color: '#999', fontSize: 13 }}>{t('update.safe')}</p></div>}
        </div>
      </Modal>
    </Layout>
  )
}

export default App
