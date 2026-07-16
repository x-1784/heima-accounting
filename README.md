# 黑马记账 🐴

一个简洁好用的个人记账桌面应用，支持 Windows 和 macOS。

## ✨ 功能

- 📝 **记一笔** — 选择分类、输入金额、添加备注，快速记录日常花销
- 📂 **二级分类** — 10 个一级分类 + 50+ 个二级分类，覆盖日常消费场景
- 📊 **统计图表** — 月度汇总、支出占比饼图、消费趋势折线图
- 📅 **按月筛选** — 查看任意月份的支出明细
- ⚙️ **自定义分类** — 可以添加、编辑自己的分类
- 🌐 **中英文切换** — 支持中文和英文界面
- 🔄 **自动更新** — 新版本发布后自动提示更新
- 💾 **数据本地存储** — 所有数据存在电脑上，无需联网

## 🖥️ 界面截图

> 截图待补充

## 🛠️ 技术栈

| 层面 | 技术 |
|------|------|
| 桌面框架 | Electron |
| 前端 | React 18 + TypeScript |
| UI 组件 | Ant Design 5 |
| 图表 | @ant-design/charts |
| 构建 | Vite 5 |
| 数据库 | sql.js（SQLite） |
| 打包 | electron-builder |

## 🚀 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发模式
npm run dev

# 3. 打包为安装程序
npm run pack:win   # Windows
npm run pack:mac   # macOS
```

## 📦 下载安装

前往 [Releases](https://github.com/X-1784/heima-accounting/releases) 页面下载最新版本。

## 📁 项目结构

```
src/
├── main/            # Electron 主进程（窗口、数据库、更新）
├── preload/         # 预加载脚本（安全桥梁）
└── renderer/        # React 前端界面
    ├── components/  # 可复用组件
    ├── pages/       # 页面组件
    └── styles/      # 样式文件
```

## 📄 开源协议

MIT License
