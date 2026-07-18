import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 单元测试(自动批改工具 Vitest)的配置文件
export default defineConfig({
  plugins: [react()],
  test: {
    // 默认使用 jsdom(模拟浏览器环境),主进程测试文件内部会单独声明 node 环境
    environment: 'jsdom',
    // 测试文件放在源文件旁边,以 .test.ts / .test.tsx 结尾
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 20000,
  },
})
