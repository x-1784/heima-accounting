import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Layout,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Popconfirm,
  message,
  Tag,
  Space,
  Statistic,
  Card,
  Typography,
  Tabs,
  Row,
  Col,
  Empty,
  Spin,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  WalletOutlined,
  PieChartOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { Pie, Column } from '@ant-design/charts'
import dayjs, { Dayjs } from 'dayjs'

const { Header, Content } = Layout
const { Title, Text } = Typography

// ==================== 分类数据 ====================

interface CategoryItem {
  label: string
  children: string[]
}

const categories: Record<string, CategoryItem> = {
  '餐饮美食': {
    label: '🍜 餐饮美食',
    children: ['早餐', '午餐', '晚餐', '零食饮料', '外出聚餐', '食材采购'],
  },
  '交通出行': {
    label: '🚗 交通出行',
    children: ['公交地铁', '打车/网约车', '加油充电', '停车费', '车辆保养', '火车/机票'],
  },
  '购物消费': {
    label: '🛒 购物消费',
    children: ['衣服鞋包', '数码电子', '家居日用', '美妆护肤', '书籍文具', '运动户外'],
  },
  '住房居家': {
    label: '🏠 住房居家',
    children: ['房租', '水电燃气', '物业费', '维修装修', '宽带话费'],
  },
  '休闲娱乐': {
    label: '🎮 休闲娱乐',
    children: ['电影演出', '游戏充值', '旅游度假', '运动健身', '视频会员', '聚会社交'],
  },
  '医疗健康': {
    label: '💊 医疗健康',
    children: ['看病变医', '药品购买', '牙科口腔', '体检', '保健品'],
  },
  '教育学习': {
    label: '📚 教育学习',
    children: ['学费', '书籍资料', '网课', '培训考试', '文具耗材'],
  },
  '金融理财': {
    label: '💰 金融理财',
    children: ['保险', '投资亏损', '贷款还款', '手续费'],
  },
  '家庭生活': {
    label: '👨‍👩‍👧 家庭生活',
    children: ['育儿支出', '宠物花销', '家居用品', '人情红包'],
  },
  '其他支出': {
    label: '📦 其他支出',
    children: ['快递物流', '其他杂项'],
  },
}

const categoryL1Options = Object.entries(categories).map(([key, val]) => ({
  value: key,
  label: val.label,
}))

// ==================== 颜色映射 ====================

const categoryColors: Record<string, string> = {
  '餐饮美食': '#FF6B6B',
  '交通出行': '#4ECDC4',
  '购物消费': '#45B7D1',
  '住房居家': '#96CEB4',
  '休闲娱乐': '#FFEAA7',
  '医疗健康': '#DDA0DD',
  '教育学习': '#98D8C8',
  '金融理财': '#F7DC6F',
  '家庭生活': '#BB8FCE',
  '其他支出': '#808B96',
}

// ==================== 类型 ====================

interface Expense {
  id: number
  amount: number
  category_l1: string
  category_l2: string
  note: string
  date: string
}

interface CategoryStat {
  category_l1: string
  total: number
}

interface MonthlyTrend {
  month: string
  total: number
}

// ==================== 支出明细页 ====================

interface ExpenseTabProps {
  expenses: Expense[]
  loading: boolean
  selectedMonth: string
  monthlyTotal: number
  onRefresh: () => void
  /** 外部触发的添加弹窗信号 */
  triggerAdd: number
  /** 信号已被处理后的回调 */
  onTriggerAddHandled: () => void
}

const ExpenseTab: React.FC<ExpenseTabProps> = ({
  expenses,
  loading,
  selectedMonth,
  monthlyTotal,
  onRefresh,
  triggerAdd,
  onTriggerAddHandled,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [form] = Form.useForm()
  const [searchText, setSearchText] = useState('')
  const [budget, setBudget] = useState<number | null>(null)
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetForm] = Form.useForm()

  // 响应外部触发的添加操作
  useEffect(() => {
    if (triggerAdd > 0) {
      setEditingExpense(null)
      form.resetFields()
      form.setFieldsValue({
        date: dayjs(),
        amount: undefined,
      })
      setModalOpen(true)
      onTriggerAddHandled()
    }
  }, [triggerAdd])

  // 加载月度预算
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getBudget(selectedMonth).then((data) => {
        setBudget(data ? data.amount : null)
      })
    }
  }, [selectedMonth, monthlyTotal])

  // 搜索过滤
  const filteredExpenses = expenses.filter((e) => {
    if (!searchText.trim()) return true
    const kw = searchText.trim().toLowerCase()
    return (
      e.note.toLowerCase().includes(kw) ||
      e.category_l1.includes(kw) ||
      e.category_l2.includes(kw) ||
      String(e.amount).includes(kw)
    )
  })

  // 导出 CSV
  const handleExportCSV = async () => {
    try {
      const result = await window.electronAPI.exportCSV(selectedMonth)
      if (result.success) {
        message.success('导出成功！')
      }
    } catch (err) {
      message.error('导出失败')
    }
  }

  // 设置预算
  const handleSetBudget = async () => {
    try {
      const values = await budgetForm.validateFields()
      await window.electronAPI.setBudget(selectedMonth, values.amount)
      setBudget(values.amount)
      setBudgetModalOpen(false)
      message.success('预算设置成功')
    } catch (err) {
      // 表单验证失败时不做处理
    }
  }

  // 打开添加弹窗
  const openAddModal = () => {
    setEditingExpense(null)
    form.resetFields()
    form.setFieldsValue({
      date: dayjs(),
      amount: undefined,
    })
    setModalOpen(true)
  }

  // 打开编辑弹窗
  const openEditModal = (record: Expense) => {
    setEditingExpense(record)
    form.setFieldsValue({
      amount: record.amount,
      category_l1: record.category_l1,
      category_l2: record.category_l2,
      date: dayjs(record.date),
      note: record.note,
    })
    setModalOpen(true)
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        amount: values.amount,
        category_l1: values.category_l1,
        category_l2: values.category_l2,
        date: values.date.format('YYYY-MM-DD'),
        note: values.note || '',
      }

      if (editingExpense) {
        await window.electronAPI.updateExpense({ ...data, id: editingExpense.id })
        message.success('修改成功')
      } else {
        await window.electronAPI.addExpense(data)
        message.success('添加成功')
      }

      setModalOpen(false)
      form.resetFields()
      onRefresh()
    } catch (err) {
      console.error('提交失败:', err)
      message.error('操作失败，请重试')
    }
  }

  // 删除记录
  const handleDelete = async (id: number) => {
    try {
      await window.electronAPI.deleteExpense(id)
      message.success('删除成功')
      onRefresh()
    } catch (err) {
      console.error('删除失败:', err)
      message.error('删除失败')
    }
  }

  // 一级分类变化时清空二级
  const handleCategoryL1Change = () => {
    form.setFieldsValue({ category_l2: undefined })
  }

  const selectedL1: string | undefined = Form.useWatch('category_l1', form)
  const categoryL2Options = selectedL1
    ? categories[selectedL1]?.children.map((c) => ({ value: c, label: c })) || []
    : []

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => <span style={{ color: '#666' }}>{date}</span>,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount: number) => (
        <span style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 15 }}>
          ¥ {amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: '分类',
      key: 'category',
      width: 200,
      render: (_: unknown, record: Expense) => (
        <Space size={4}>
          <Tag color="blue">{record.category_l1}</Tag>
          <span style={{ color: '#999' }}>·</span>
          <Tag>{record.category_l2}</Tag>
        </Space>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      render: (note: string) => (
        <span style={{ color: note ? '#333' : '#ccc' }}>{note || '无备注'}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: Expense) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条记录吗？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 月度汇总卡片 + 预算 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Statistic
              title={`${selectedMonth} 月总支出`}
              value={monthlyTotal}
              precision={2}
              prefix="¥"
              valueStyle={{ color: monthlyTotal > 0 ? '#cf1322' : '#999' }}
            />
          </Col>
          <Col>
            <div
              style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 6, background: '#fafafa', border: '1px dashed #d9d9d9' }}
              onClick={() => {
                budgetForm.setFieldsValue({ amount: budget || undefined })
                setBudgetModalOpen(true)
              }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                月度预算 {budget ? `¥${budget.toFixed(0)}` : '（点击设置）'}
              </Text>
              {budget && budget > 0 ? (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: monthlyTotal > budget ? '#ff4d4f' : '#52c41a' }}>
                      已用 {((monthlyTotal / budget) * 100).toFixed(0)}%
                    </span>
                    <span style={{ color: monthlyTotal > budget ? '#ff4d4f' : '#52c41a' }}>
                      {monthlyTotal > budget ? '超支' : '剩余'} ¥{Math.abs(budget - monthlyTotal).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 2, width: 160 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((monthlyTotal / budget) * 100, 100)}%`,
                      background: monthlyTotal > budget ? '#ff4d4f' : '#52c41a',
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              ) : null}
            </div>
          </Col>
        </Row>
      </Card>

      {/* 搜索 + 导出工具栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input
              placeholder="搜索备注、分类、金额..."
              prefix={<span style={{ color: '#999' }}>🔍</span>}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ maxWidth: 400 }}
            />
          </Col>
          <Col>
            <Button onClick={handleExportCSV} icon={<span>📥</span>}>
              导出 CSV
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 支出列表 */}
      <Card>
        <Table
          dataSource={filteredExpenses}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total, range) => {
              const base = `共 ${total} 条记录`
              return searchText ? `${base}（已过滤）` : base
            },
          }}
          locale={{ emptyText: searchText ? '没有匹配的记录' : '还没有记账记录，点击「记一笔」开始吧！' }}
        />
      </Card>

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingExpense ? '编辑支出' : '记一笔'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
        }}
        okText="保存"
        cancelText="取消"
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item
            name="amount"
            label="金额（元）"
            rules={[
              { required: true, message: '请输入金额' },
              { type: 'number', min: 0.01, message: '金额必须大于 0' },
            ]}
          >
            <InputNumber
              prefix="¥"
              placeholder="请输入金额"
              style={{ width: '100%' }}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="category_l1"
            label="一级分类"
            rules={[{ required: true, message: '请选择一级分类' }]}
          >
            <Select
              placeholder="请选择大类"
              options={categoryL1Options}
              onChange={handleCategoryL1Change}
            />
          </Form.Item>

          <Form.Item
            name="category_l2"
            label="二级分类"
            rules={[{ required: true, message: '请选择二级分类' }]}
          >
            <Select
              placeholder={selectedL1 ? '请选择小类' : '请先选择一级分类'}
              options={categoryL2Options}
              disabled={!selectedL1}
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="note" label="备注">
            <Input.TextArea placeholder="写点备注（可选）" rows={2} maxLength={100} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预算设置弹窗 */}
      <Modal
        title={`设置 ${selectedMonth} 月预算`}
        open={budgetModalOpen}
        onOk={handleSetBudget}
        onCancel={() => setBudgetModalOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={budgetForm} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item
            name="amount"
            label="预算金额（元）"
            rules={[
              { required: true, message: '请输入预算金额' },
              { type: 'number', min: 0.01, message: '金额必须大于 0' },
            ]}
          >
            <InputNumber
              prefix="¥"
              placeholder="请输入月度预算"
              style={{ width: '100%' }}
              precision={2}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ==================== 统计分析页 ====================

interface StatsTabProps {
  categoryStats: CategoryStat[]
  monthlyTrend: MonthlyTrend[]
  selectedMonth: string
  loading: boolean
}

const StatsTab: React.FC<StatsTabProps> = ({ categoryStats, monthlyTrend, selectedMonth, loading }) => {
  // 饼图配置
  const pieConfig = {
    data: categoryStats.map((item) => ({
      category: item.category_l1,
      value: item.total,
    })),
    angleField: 'value',
    colorField: 'category',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      text: 'category',
      position: 'outside' as const,
      style: { fontSize: 12 },
    },
    statistic: {
      title: {
        content: '总支出',
        style: { fontSize: 14 },
      },
    },
    legend: {
      position: 'bottom' as const,
      layout: 'horizontal' as const,
    },
    color: Object.values(categoryColors),
    tooltip: {
      title: 'category',
      items: [{ channel: 'y', valueFormatter: (v: number) => `¥ ${v.toFixed(2)}` }],
    },
  }

  // 柱状图配置
  const columnConfig = {
    data: monthlyTrend.map((item) => ({
      month: item.month,
      total: item.total,
    })),
    xField: 'month',
    yField: 'total',
    color: '#1677ff',
    label: {
      text: (d: { total: number }) => `¥${d.total.toFixed(0)}`,
      position: 'top' as const,
      style: { fontSize: 11, fontWeight: 500 },
    },
    tooltip: {
      items: [{ channel: 'y', valueFormatter: (v: number) => `¥ ${v.toFixed(2)}` }],
    },
    axis: {
      y: {
        title: '金额（元）',
      },
    },
    style: {
      radiusTopLeft: 6,
      radiusTopRight: 6,
    },
  }

  const hasCategoryData = categoryStats.length > 0
  const hasTrendData = monthlyTrend.length > 0

  return (
    <Spin spinning={loading}>
      <Row gutter={[24, 24]}>
        {/* 分类饼图 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <PieChartOutlined style={{ color: '#1677ff' }} />
                <span>{selectedMonth} 月分类支出占比</span>
              </Space>
            }
          >
            {hasCategoryData ? (
              <div style={{ height: 380 }}>
                <Pie {...pieConfig} />
              </div>
            ) : (
              <Empty
                description={`${selectedMonth} 月暂无支出数据`}
                style={{ padding: '60px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* 月度趋势图 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: '#1677ff' }} />
                <span>近12个月支出趋势</span>
              </Space>
            }
          >
            {hasTrendData ? (
              <div style={{ height: 380 }}>
                <Column {...columnConfig} />
              </div>
            ) : (
              <Empty
                description="暂无历史数据"
                style={{ padding: '60px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* 分类金额排行 */}
        <Col xs={24}>
          <Card title="分类支出排行">
            {hasCategoryData ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {categoryStats.map((item) => {
                  const total = categoryStats.reduce((sum, s) => sum + s.total, 0)
                  const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0'
                  return (
                    <Card
                      key={item.category_l1}
                      size="small"
                      style={{
                        width: 200,
                        borderLeft: `3px solid ${categoryColors[item.category_l1] || '#ddd'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <Text style={{ marginRight: 6 }}>
                            {categories[item.category_l1]?.label || item.category_l1}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {pct}%
                          </Text>
                        </span>
                        <Text strong style={{ color: '#cf1322' }}>
                          ¥{item.total.toFixed(2)}
                        </Text>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>
    </Spin>
  )
}

// ==================== 主应用 ====================

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'))
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('expense')
  const [triggerAdd, setTriggerAdd] = useState(0)

  // ========== 自动更新状态 ==========
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateDownloading, setUpdateDownloading] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateError, setUpdateError] = useState('')

  // 加载支出列表数据
  const loadExpenses = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    try {
      const data = await window.electronAPI.getExpenses(selectedMonth)
      setExpenses(data || [])
      const { total } = await window.electronAPI.getMonthlyTotal(selectedMonth)
      setMonthlyTotal(total || 0)
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  // 加载统计数据
  const loadStats = useCallback(async () => {
    if (!window.electronAPI) return
    setStatsLoading(true)
    try {
      const [stats, trend] = await Promise.all([
        window.electronAPI.getCategoryStats(selectedMonth),
        window.electronAPI.getMonthlyTrend(),
      ])
      setCategoryStats(stats || [])
      setMonthlyTrend(trend || [])
    } catch (err) {
      console.error('加载统计失败:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  // 月份切换时刷新
  useEffect(() => {
    loadExpenses()
    loadStats()
  }, [selectedMonth])

  // 监听自动更新事件
  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateVersion(info.version)
      setUpdateModalOpen(true)
    })

    window.electronAPI.onDownloadProgress((progress) => {
      setUpdateProgress(progress.percent)
    })

    window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateDownloading(false)
      setUpdateDownloaded(true)
      setUpdateVersion(info.version)
    })

    window.electronAPI.onUpdateError((message) => {
      setUpdateDownloading(false)
      setUpdateError(message)
    })

    window.electronAPI.onUpdateNotAvailable(() => {
      // 静默忽略，仅手动检查时有用
    })
  }, [])

  // 点击"记一笔"按钮
  const handleAddClick = () => {
    if (activeTab === 'expense') {
      // 已在支出明细页，直接触发添加
      setTriggerAdd((prev) => prev + 1)
    } else {
      // 先切换到支出明细页，再触发添加
      setActiveTab('expense')
      // 延迟触发，等 Tab 切换完成
      setTimeout(() => {
        setTriggerAdd((prev) => prev + 1)
      }, 100)
    }
  }

  const tabItems = [
    {
      key: 'expense',
      label: '支出明细',
      children: (
        <ExpenseTab
          expenses={expenses}
          loading={loading}
          selectedMonth={selectedMonth}
          monthlyTotal={monthlyTotal}
          onRefresh={loadExpenses}
          triggerAdd={triggerAdd}
          onTriggerAddHandled={() => setTriggerAdd(0)}
        />
      ),
    },
    {
      key: 'stats',
      label: '统计分析',
      children: (
        <StatsTab
          categoryStats={categoryStats}
          monthlyTrend={monthlyTrend}
          selectedMonth={selectedMonth}
          loading={statsLoading}
        />
      ),
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ========== 顶部导航 ========== */}
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: 64,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <WalletOutlined style={{ fontSize: 28, color: '#1677ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            黑马记账
          </Title>
        </div>
        <Space>
          <DatePicker
            picker="month"
            value={dayjs(selectedMonth)}
            onChange={(d: Dayjs | null) => {
              if (d) setSelectedMonth(d.format('YYYY-MM'))
            }}
            allowClear={false}
          />
          <Button
            type="text"
            size="small"
            onClick={async () => {
              try {
                message.loading({ content: '正在检查更新...', key: 'updateCheck' })
                const result = await window.electronAPI.checkForUpdates()
                message.destroy('updateCheck')
                if (result && result.updateInfo && result.updateInfo.version) {
                  // 有更新时 autoUpdater 事件会自动弹出弹窗
                } else {
                  message.success({ content: '已是最新版本', key: 'updateCheck' })
                }
              } catch {
                message.destroy('updateCheck')
                message.warning({ content: '检查更新失败，请检查网络连接', key: 'updateCheck' })
              }
            }}
          >
            检查更新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddClick} size="large">
            记一笔
          </Button>
        </Space>
      </Header>

      {/* ========== 内容区域 ========== */}
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        <Tabs
          activeKey={activeTab}
          items={tabItems}
          onChange={(key) => {
            setActiveTab(key)
            if (key === 'stats') loadStats()
          }}
          size="large"
          style={{ background: '#fff', padding: '0 24px 24px', borderRadius: 8 }}
        />
      </Content>

      {/* ========== 自动更新弹窗 ========== */}
      <Modal
        title="发现新版本"
        open={updateModalOpen}
        onCancel={() => {
          if (!updateDownloading) setUpdateModalOpen(false)
        }}
        closable={!updateDownloading}
        maskClosable={false}
        footer={
          updateError ? (
            <Button onClick={() => setUpdateModalOpen(false)}>稍后再说</Button>
          ) : updateDownloaded ? (
            <Button
              type="primary"
              onClick={async () => {
                try {
                  await window.electronAPI.installUpdate()
                } catch {
                  message.error('安装失败，请重试')
                }
              }}
            >
              立即安装并重启
            </Button>
          ) : updateDownloading ? (
            <Button disabled>下载中...</Button>
          ) : (
            <Space>
              <Button onClick={() => setUpdateModalOpen(false)}>稍后再说</Button>
              <Button
                type="primary"
                onClick={async () => {
                  setUpdateDownloading(true)
                  setUpdateError('')
                  const result = await window.electronAPI.downloadUpdate()
                  if (!result.success) {
                    setUpdateError(result.message || '下载失败')
                    setUpdateDownloading(false)
                  }
                }}
              >
                立即更新
              </Button>
            </Space>
          )
        }
        width={480}
      >
        <div style={{ padding: '12px 0' }}>
          {updateError ? (
            <div style={{ color: '#ff4d4f' }}>
              <p>更新失败：{updateError}</p>
              <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                请检查网络连接后重试
              </p>
            </div>
          ) : updateDownloading ? (
            <div>
              <p style={{ marginBottom: 16 }}>
                正在下载 v{updateVersion} 版本，请稍候...
              </p>
              <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${updateProgress}%`,
                    background: '#1677ff',
                    borderRadius: 3,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <p style={{ textAlign: 'center', color: '#999', marginTop: 8, fontSize: 12 }}>
                {updateProgress.toFixed(1)}%
              </p>
            </div>
          ) : updateDownloaded ? (
            <div>
              <p style={{ color: '#52c41a', fontWeight: 500 }}>
                新版本 v{updateVersion} 已下载完成！
              </p>
              <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>
                点击下方按钮将自动重启应用并完成更新。
              </p>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: 8 }}>
                检测到新版本 <Tag color="blue">v{updateVersion}</Tag>，是否立即更新？
              </p>
              <p style={{ color: '#999', fontSize: 13 }}>
                更新不会影响您的记账数据，请放心操作。
              </p>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  )
}

export default App
