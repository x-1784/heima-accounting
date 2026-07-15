$env:GH_TOKEN = & "C:\Program Files\GitHub CLI\gh.exe" auth token
Write-Host "==> 开始构建并发布到 GitHub..."
Set-Location "d:\Vibe Coding\黑马记账APP"
npx electron-builder --win --publish always
Write-Host "==> 完成！"