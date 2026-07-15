#!/bin/bash
# 黑马记账 — 发布到 GitHub Releases
export GH_TOKEN=$(/c/Program\ Files/GitHub\ CLI/gh.exe auth token)
echo "==> 开始构建并发布..."
cd "d:/Vibe Coding/黑马记账APP"
npx electron-builder --win --publish always
echo "==> 完成！"
