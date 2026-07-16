import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Layout,
  Menu,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Popconfirm,
  Progress,
  message,
  Tag,
  Space,
  Statistic,
  Card,
  Typography,
  Row,
  Col,
  Empty,
  Spin,
} from 'antd'
import {
  PlusOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HomeOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
  TagsOutlined,
  SettingOutlined,
  WalletOutlined,
  BarChartOutlined,
  SyncOutlined,
  GithubOutlined,
} from '@ant-design/icons'
import { Pie, Column } from '@ant-design/charts'
import dayjs, { Dayjs } from 'dayjs'
import { t, setLanguage, getLanguage, useTranslation, Language } from './i18n'

const { Sider, Content } = Layout
const { Title, Text } = Typography

// ==================== 常量 ====================

const APP_VERSION = '1.1.1'

interface CategoryItem {
  label: string
  children: string[]
}

const presetCategories: Record<string, CategoryItem> = {
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

const categoryColors: Record<string, string> = {
  '餐饮美食': '#FF6B6B', '交通出行': '#4ECDC4', '购物消费': '#45B7D1',
  '住房居家': '#96CEB4', '休闲娱乐': '#FFEAA7', '医疗健康': '#DDA0DD',
  '教育学习': '#98D8C8', '金融理财': '#F7DC6F', '家庭生活': '#BB8FCE',
  '其他支出': '#808B96',
}

// ==================== 类型 ====================

interface Expense {
  id: number; amount: number; category_l1: string; category_l2: string; note: string; date: string
}
interface CategoryStat { category_l1: string; total: number }
interface MonthlyTrend { month: string; total: number }
interface UserCategory { id: number; category_l1: string; emoji: string; children: string[]; created_at: string }

const siderMenuStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' }
const logoStyle: React.CSSProperties = { padding: '20px 16px', textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' }
const pageTitleStyle: React.CSSProperties = { marginBottom: 24, fontSize: 20, fontWeight: 600 }

// ==================== 页面组件 ====================

// ---------- 首页 ----------

interface DashboardProps {
  expenses: Expense[]; monthlyTotal: number; selectedMonth: string; loading: boolean
  onGoExpenses: () => void
}
const DashboardPage: React.FC<DashboardProps> = ({ expenses, monthlyTotal, selectedMonth, loading, onGoExpenses }) => {
  const { t } = useTranslation()
  const [budget, setBudget] = useState<number | null>(null)
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses])
  const budgetPct = budget && budget > 0 ? Math.min((monthlyTotal / budget) * 100, 100) : 0
  const isOver = budget && monthlyTotal > budget

  useEffect(() => {
    window.electronAPI?.getBudget(selectedMonth).then((data) => setBudget(data ? data.amount : null))
  }, [selectedMonth, monthlyTotal])

  return (
    <Spin spinning={loading}>
      <div style={pageTitleStyle}>{t('home.welcome')}</div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t('home.monthlyTotal')} value={monthlyTotal} precision={2} prefix="¥" valueStyle={{ color: monthlyTotal > 0 ? '#cf1322' : '#999' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div style={{ fontSize: 14, color: '#999', marginBottom: 8 }}>{t('home.budgetUsage')}</div>
            {budget ? (
              <>
                <Progress type="circle" percent={Math.round(budgetPct)} size={80} status={isOver ? 'exception' : 'normal'} />
                <div style={{ marginTop: 8, fontSize: 12, color: isOver ? '#ff4d4f' : '#52c41a' }}>
                  {isOver ? t('home.overBudget') : t('home.budgetRemaining')}: ¥{Math.abs((budget || 0) - monthlyTotal).toFixed(2)}
                </div>
              </>
            ) : (
              <Button type="link" onClick={onGoExpenses} style={{ padding: 0 }}>{t('home.noBudget')}，{t('expense.budgetClick')}</Button>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title={t('home.recordCount')} value={expenses.length} suffix={t('common.records')} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      <Card title={t('home.recentRecords')}>
        {recentExpenses.length === 0 ? (
          <Empty description={t('home.noRecords')}>
            <span style={{ color: '#999', fontSize: 13 }}>{t('home.noRecordsHint')}</span>
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentExpenses.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
                <div>
                  <Text style={{ fontSize: 13, color: '#666', minWidth: 90, display: 'inline-block' }}>{e.date}</Text>
                  <Tag color="blue" style={{ marginLeft: 8 }}>{e.category_l1}</Tag>
                  <Tag>{e.category_l2}</Tag>
                </div>
                <Text strong style={{ color: '#ff4d4f' }}>¥{e.amount.toFixed(2)}</Text>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Spin>
  )
}

// ---------- 记一笔 ----------

interface AddExpenseProps {
  categories: Record<string, CategoryItem>
  selectedMonth: string
  onSuccess: () => void
  goToExpenses: () => void
}
const AddExpensePage: React.FC<AddExpenseProps> = ({ categories, selectedMonth, onSuccess, goToExpenses }) => {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const selectedL1: string | undefined = Form.useWatch('category_l1', form)
  const l1Options = useMemo(() => Object.entries(categories).map(([key, val]) => ({ value: key, label: val.label })), [categories])
  const l2Options = selectedL1 ? (categories[selectedL1]?.children.map((c) => ({ value: c, label: c })) || []) : []

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      await window.electronAPI.addExpense({
        amount: values.amount,
        category_l1: values.category_l1,
        category_l2: values.category_l2,
        date: values.date.format('YYYY-MM-DD'),
        note: values.note || '',
      })
      message.success(t('add.success'))
      form.resetFields()
      form.setFieldsValue({ date: dayjs(), amount: undefined })
      onSuccess()
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    form.setFieldsValue({ date: dayjs() })
  }, [])

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={pageTitleStyle}>{t('add.title')}</div>
      <Card>
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

// ---------- 支出明细 ----------

interface ExpenseListProps {
  expenses: Expense[]; loading: boolean; selectedMonth: string; monthlyTotal: number
  categories: Record<string, CategoryItem>
  onRefresh: () => void
}
const ExpenseListPage: React.FC<ExpenseListProps> = ({ expenses, loading, selectedMonth, monthlyTotal, categories, onRefresh }) => {
  const { t } = useTranslation()
  const [searchText, setSearchText] = useState('')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [budget, setBudget] = useState<number | null>(null)
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetForm] = Form.useForm()

  useEffect(() => {
    window.electronAPI?.getBudget(selectedMonth).then((data) => setBudget(data ? data.amount : null))
  }, [selectedMonth, monthlyTotal])

  const filtered = expenses.filter((e) => {
    if (!searchText.trim()) return true
    const kw = searchText.trim().toLowerCase()
    return e.note.toLowerCase().includes(kw) || e.category_l1.includes(kw) || e.category_l2.includes(kw) || String(e.amount).includes(kw)
  })

  const handleExport = async () => {
    try { const r = await window.electronAPI.exportCSV(selectedMonth); if (r.success) message.success(t('expense.exportSuccess')) } catch { message.error(t('expense.exportFail')) }
  }
  const handleSetBudget = async () => {
    try { const v = await budgetForm.validateFields(); await window.electronAPI.setBudget(selectedMonth, v.amount); setBudget(v.amount); setBudgetModalOpen(false); message.success(t('budget.success')) } catch { /* validation */ }
  }
  const openEdit = (r: Expense) => { setEditingExpense(r); form.setFieldsValue({ amount: r.amount, category_l1: r.category_l1, category_l2: r.category_l2, date: dayjs(r.date), note: r.note }); setModalOpen(true) }
  const handleSubmit = async () => {
    try {
      const v = await form.validateFields()
      const data = { amount: v.amount, category_l1: v.category_l1, category_l2: v.category_l2, date: v.date.format('YYYY-MM-DD'), note: v.note || '' }
      if (editingExpense) { await window.electronAPI.updateExpense({ ...data, id: editingExpense.id }); message.success(t('add.editSuccess')) }
      setModalOpen(false); form.resetFields(); onRefresh()
    } catch (err: any) { if (err?.errorFields) return; message.error(t('common.error')) }
  }
  const handleDelete = async (id: number) => { try { await window.electronAPI.deleteExpense(id); message.success(t('expense.deleteSuccess')); onRefresh() } catch { message.error(t('expense.deleteFail')) } }

  const selectedL1: string | undefined = Form.useWatch('category_l1', form)
  const l1Options = useMemo(() => Object.entries(categories).map(([key, val]) => ({ value: key, label: val.label })), [categories])
  const l2Options = selectedL1 ? (categories[selectedL1]?.children.map((c) => ({ value: c, label: c })) || []) : []

  const columns = [
    { title: t('expense.colDate'), dataIndex: 'date', key: 'date', width: 120, render: (d: string) => <span style={{ color: '#666' }}>{d}</span> },
    { title: t('expense.colAmount'), dataIndex: 'amount', key: 'amount', width: 130, render: (a: number) => <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 15 }}>¥ {a.toFixed(2)}</span> },
    { title: t('expense.colCategory'), key: 'category', width: 220, render: (_: unknown, r: Expense) => <Space size={4}><Tag color="blue">{r.category_l1}</Tag><span style={{ color: '#999' }}>·</span><Tag>{r.category_l2}</Tag></Space> },
    { title: t('expense.colNote'), dataIndex: 'note', key: 'note', ellipsis: true, render: (n: string) => <span style={{ color: n ? '#333' : '#ccc' }}>{n || t('expense.noNote')}</span> },
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
      <Card style={{ marginBottom: 16 }} size="small">
        <Row gutter={16} align="middle">
          <Col>
            <Statistic title={selectedMonth + ' ' + t('expense.monthlyTotal')} value={monthlyTotal} precision={2} prefix="¥" valueStyle={{ color: monthlyTotal > 0 ? '#cf1322' : '#999', fontSize: 20 }} />
          </Col>
          <Col>
            <div style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 6, background: '#fafafa', border: '1px dashed #d9d9d9' }}
              onClick={() => { budgetForm.setFieldsValue({ amount: budget || undefined }); setBudgetModalOpen(true) }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{t('expense.budget')} {budget ? `¥${budget.toFixed(0)}` : `(${t('expense.budgetClick')})`}</Text>
              {budget && budget > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: monthlyTotal > budget ? '#ff4d4f' : '#52c41a' }}>{t('expense.budgetUsed')} {((monthlyTotal / budget) * 100).toFixed(0)}%</span>
                    <span style={{ color: monthlyTotal > budget ? '#ff4d4f' : '#52c41a' }}>{monthlyTotal > budget ? t('expense.budgetOver') : t('expense.budgetRemaining')} ¥{Math.abs(budget - monthlyTotal).toFixed(2)}</span>
                  </div>
                  <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 2, width: 160 }}>
                    <div style={{ height: '100%', width: `${Math.min((monthlyTotal / budget) * 100, 100)}%`, background: monthlyTotal > budget ? '#ff4d4f' : '#52c41a', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Card>
      <Card style={{ marginBottom: 16 }} size="small">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input prefix={<span>🔍</span>} placeholder={t('expense.search')} value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear />
          </Col>
          <Col><Button onClick={handleExport} icon={<span>📥</span>}>{t('expense.exportCSV')}</Button></Col>
        </Row>
      </Card>
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

// ---------- 统计分析 ----------

interface StatsProps {
  categoryStats: CategoryStat[]; monthlyTrend: MonthlyTrend[]; selectedMonth: string; loading: boolean
  categories: Record<string, CategoryItem>
}
const StatsPage: React.FC<StatsProps> = ({ categoryStats, monthlyTrend, selectedMonth, loading, categories }) => {
  const { t } = useTranslation()
  const pieConfig = {
    data: categoryStats.map((i) => ({ category: i.category_l1, value: i.total })),
    angleField: 'value', colorField: 'category', radius: 0.8, innerRadius: 0.6,
    label: { text: 'category', position: 'outside' as const, style: { fontSize: 12 } },
    statistic: { title: { content: t('stats.totalSpent'), style: { fontSize: 14 } } },
    legend: { position: 'bottom' as const, layout: 'horizontal' as const },
    color: Object.values(categoryColors),
    tooltip: { title: 'category', items: [{ channel: 'y', valueFormatter: (v: number) => `¥ ${v.toFixed(2)}` }] },
  }
  const columnConfig = {
    data: monthlyTrend.map((i) => ({ month: i.month, total: i.total })),
    xField: 'month', yField: 'total', color: '#1677ff',
    label: { text: (d: { total: number }) => `¥${d.total.toFixed(0)}`, position: 'top' as const, style: { fontSize: 11, fontWeight: 500 } },
    tooltip: { items: [{ channel: 'y', valueFormatter: (v: number) => `¥ ${v.toFixed(2)}` }] },
    axis: { y: { title: t('common.amount') + ' (¥)' } },
    style: { radiusTopLeft: 6, radiusTopRight: 6 },
  }

  return (
    <Spin spinning={loading}>
      <div style={pageTitleStyle}>{t('menu.statistics')}</div>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<Space><PieChartOutlined style={{ color: '#1677ff' }} /><span>{selectedMonth} {t('stats.categoryPie')}</span></Space>}>
            {categoryStats.length > 0 ? <div style={{ height: 360 }}><Pie {...pieConfig} /></div> : <Empty description={t('stats.noDataThisMonth')} style={{ padding: '60px 0' }} />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<Space><BarChartOutlined style={{ color: '#1677ff' }} /><span>{t('stats.monthlyTrend')}</span></Space>}>
            {monthlyTrend.length > 0 ? <div style={{ height: 360 }}><Column {...columnConfig} /></div> : <Empty description={t('stats.noData')} style={{ padding: '60px 0' }} />}
          </Card>
        </Col>
        <Col xs={24}>
          <Card title={t('stats.ranking')}>
            {categoryStats.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {categoryStats.map((item) => {
                  const total = categoryStats.reduce((s, x) => s + x.total, 0)
                  const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0'
                  return (
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

// ---------- 分类管理 ----------

interface CategoryPageProps {
  userCategories: UserCategory[]
  onRefresh: () => void
}
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

// ---------- 设置 ----------

interface SettingsProps {
  onCheckUpdate: () => void
  updateChecking: boolean
}
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

// ---------- 贪吃蛇 ----------

const SNAKE_GRID = 20
const SNAKE_CELL = 24
const SNAKE_INITIAL_SPEED = 200
const SNAKE_SPEED_INC = 5
const SNAKE_MIN_SPEED = 60

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
interface Point { x: number; y: number }

const DIR: Record<Direction, Point> = {
  UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 },
}
const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
}

// 键盘映射提到模块顶层，避免每次按键都重新创建对象
const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
  W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
}

/** 随机生成食物位置，棋盘满时返回 null */
function randomFood(snake: Point[]): Point | null {
  const occupied = new Set(snake.map(p => `${p.x},${p.y}`))
  const available: Point[] = []
  for (let x = 0; x < SNAKE_GRID; x++)
    for (let y = 0; y < SNAKE_GRID; y++)
      if (!occupied.has(`${x},${y}`)) available.push({ x, y })
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

const SnakeGamePage: React.FC = () => {
  const { t } = useTranslation()

  // refs 用于游戏循环内读取最新值，避免 setInterval/setTimeout 的 stale closure 问题
  const snakeRef = useRef<Point[]>([])
  const foodRef = useRef<Point>({ x: 10, y: 10 })
  const directionRef = useRef<Direction>('RIGHT')
  const nextDirRef = useRef<Direction>('RIGHT')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speedRef = useRef(SNAKE_INITIAL_SPEED)
  const bestRef = useRef(0)

  const [snake, setSnake] = useState<Point[]>([])
  const [food, setFood] = useState<Point>({ x: 10, y: 10 })
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [best, setBest] = useState(() => {
    try { return parseInt(localStorage.getItem('snake-best') || '0', 10) } catch { return 0 }
  })

  // 同步 best 到 ref，避免回调依赖 stale state
  useEffect(() => { bestRef.current = best }, [best])

  // score 从 snake 长度推导，无需单独维护状态
  const score = snake.length > 0 ? snake.length - 3 : 0

  const init = useCallback(() => {
    const s: Point[] = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
    snakeRef.current = s; directionRef.current = 'RIGHT'; nextDirRef.current = 'RIGHT'
    speedRef.current = SNAKE_INITIAL_SPEED
    const f = randomFood(s)
    if (!f) return // 不会发生（初始蛇只占3格，棋盘远未满）
    foodRef.current = f
    setSnake([...s]); setFood({ ...f })
    setGameOver(false); setPaused(false); setRunning(true)
  }, [])

  const stop = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  const endGame = useCallback(() => {
    stop(); setRunning(false); setGameOver(true)
    const s = snakeRef.current.length - 3
    if (s > bestRef.current) {
      setBest(s)
      try { localStorage.setItem('snake-best', String(s)) } catch {}
    }
  }, [stop]) // bestRef 不是 state，引用保持稳定

  const tick = useCallback(() => {
    const dir = nextDirRef.current; directionRef.current = dir
    const head = snakeRef.current[0]
    const nh: Point = { x: head.x + DIR[dir].x, y: head.y + DIR[dir].y }

    if (nh.x < 0 || nh.x >= SNAKE_GRID || nh.y < 0 || nh.y >= SNAKE_GRID) { endGame(); return }
    const body = snakeRef.current.slice(0, -1)
    if (body.some(p => p.x === nh.x && p.y === nh.y)) { endGame(); return }

    const ate = nh.x === foodRef.current.x && nh.y === foodRef.current.y
    const ns = [nh, ...snakeRef.current]
    if (!ate) ns.pop()

    snakeRef.current = ns; setSnake(ns) // ns 已是新数组引用，无需再 [...ns] 拷贝

    if (ate) {
      const nf = randomFood(ns)
      if (!nf) { endGame(); return } // 棋盘满了，通关！
      foodRef.current = nf; setFood({ ...nf })
      speedRef.current = Math.max(SNAKE_MIN_SPEED, speedRef.current - SNAKE_SPEED_INC)
    }
  }, [endGame])

  // 游戏循环：递归 setTimeout，速度通过 ref 读取，无需作为 effect 依赖
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

  // 键盘
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const newDir = KEY_MAP[e.key]
      // 仅游戏运行中才拦截方向键，避免阻止页面正常滚动
      if (newDir && running && OPPOSITE[newDir] !== directionRef.current) {
        e.preventDefault(); nextDirRef.current = newDir
      }
      if (e.key === ' ' && running) { e.preventDefault(); setPaused(p => !p) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [running])

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current) } }, [])

  // 遮罩层：三个互斥状态合并为一个，消除重复样式
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

type PageKey = 'home' | 'add' | 'expenses' | 'stats' | 'categories' | 'snake' | 'settings'

const App: React.FC = () => {
  const { t, lang } = useTranslation()

  // --- 共享状态 ---
  const [currentPage, setCurrentPage] = useState<PageKey>('home')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'))
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [userCategories, setUserCategories] = useState<UserCategory[]>([])
  const [triggerRefresh, setTriggerRefresh] = useState(0)

  // --- 更新状态 ---
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateDownloading, setUpdateDownloading] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateError, setUpdateError] = useState('')
  const [updateChecking, setUpdateChecking] = useState(false)
  const manualCheckRef = useRef(false)

  // --- 合并分类 ---
  const allCategories: Record<string, CategoryItem> = useMemo(() => {
    const m: Record<string, CategoryItem> = {}
    for (const uc of userCategories) m[uc.category_l1] = { label: `${uc.emoji || '📌'} ${uc.category_l1}`, children: uc.children }
    return { ...m, ...presetCategories }
  }, [userCategories])

  // --- 数据加载 ---
  const refreshTrigger = triggerRefresh

  const loadExpenses = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    try {
      const data = await window.electronAPI.getExpenses(selectedMonth)
      setExpenses(data || [])
      const { total } = await window.electronAPI.getMonthlyTotal(selectedMonth)
      setMonthlyTotal(total || 0)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [selectedMonth, refreshTrigger])

  const loadStats = useCallback(async () => {
    if (!window.electronAPI) return
    setStatsLoading(true)
    try {
      const [stats, trend] = await Promise.all([window.electronAPI.getCategoryStats(selectedMonth), window.electronAPI.getMonthlyTrend()])
      setCategoryStats(stats || [])
      setMonthlyTrend(trend || [])
    } catch (err) { console.error(err) }
    finally { setStatsLoading(false) }
  }, [selectedMonth, refreshTrigger])

  const loadUserCategories = useCallback(async () => {
    if (!window.electronAPI) return
    try { const data = await window.electronAPI.getUserCategories(); setUserCategories(data || []) }
    catch (err) { console.error(err) }
  }, [refreshTrigger])

  const refreshAll = useCallback(() => setTriggerRefresh((n) => n + 1), [])

  useEffect(() => { loadExpenses() }, [loadExpenses])
  useEffect(() => { loadExpenses(); loadStats() }, [selectedMonth])
  useEffect(() => { loadUserCategories() }, [loadUserCategories])

  // --- 更新事件 ---
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

  const handleCheckUpdate = async () => {
    try {
      manualCheckRef.current = true
      setUpdateChecking(true)
      message.loading({ content: t('settings.checking'), key: 'updateCheck' })
      await window.electronAPI.checkForUpdates()
    } catch {
      manualCheckRef.current = false; setUpdateChecking(false); message.destroy('updateCheck'); message.warning(t('settings.updateFail'))
    }
  }

  const handleAddFromHeader = () => setCurrentPage('add')

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

  // --- 页面渲染 ---
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
