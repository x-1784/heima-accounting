# Generate Heima Accounting app icon v2
# Design: dark rounded bg + gold coin + Yen symbol

Add-Type -AssemblyName System.Drawing

$sizes = @(256, 128, 64, 48, 32, 16)
$memoryStreams = @()

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'HighQuality'
    $g.TextRenderingHint = 'AntiAlias'

    # === Background (#1E1E2E dark) ===
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 30, 46))

    # Rounded rect background
    $cr = [Math]::Max(1, $size / 8)
    $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bgPath.AddArc(0, 0, $cr * 2, $cr * 2, 180, 90)
    $bgPath.AddArc($size - $cr * 2 - 1, 0, $cr * 2, $cr * 2, 270, 90)
    $bgPath.AddArc($size - $cr * 2 - 1, $size - $cr * 2 - 1, $cr * 2, $cr * 2, 0, 90)
    $bgPath.AddArc(0, $size - $cr * 2 - 1, $cr * 2, $cr * 2, 90, 90)
    $bgPath.CloseFigure()
    $g.FillPath($bgBrush, $bgPath)
    $bgPath.Dispose()
    $bgBrush.Dispose()

    # === Gold coin outer circle ===
    $coinD = $size * 0.64
    $coinX = ($size - $coinD) / 2
    $coinY = ($size - $coinD) / 2
    $coinRect = New-Object System.Drawing.RectangleF($coinX, $coinY, $coinD, $coinD)

    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 192, 64))
    $g.FillEllipse($goldBrush, $coinRect)
    $goldBrush.Dispose()

    # Coin outer border
    $borderW = [Math]::Max(1, $size / 64)
    $outerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 200, 155, 40), $borderW)
    $g.DrawEllipse($outerPen, $coinRect)
    $outerPen.Dispose()

    # === Inner cutout (creates coin-with-hole effect) ===
    $innerD = $size * 0.50
    $innerX = ($size - $innerD) / 2
    $innerY = ($size - $innerD) / 2
    $innerRect = New-Object System.Drawing.RectangleF($innerX, $innerY, $innerD, $innerD)

    $innerBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 30, 46))
    $g.FillEllipse($innerBgBrush, $innerRect)
    $innerBgBrush.Dispose()

    $innerBorderW = [Math]::Max(1, $size / 80)
    $innerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 200, 155, 40), $innerBorderW)
    $g.DrawEllipse($innerPen, $innerRect)
    $innerPen.Dispose()

    # === Center Yen symbol ===
    $fontSize = [Math]::Max(5, [Math]::Floor($size * 0.30))
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 30, 30, 46))

    $yenText = [char]0xA5  # Yen sign
    $textSize = $g.MeasureString($yenText, $font)
    $textX = ($size - $textSize.Width) / 2
    $textY = ($size - $textSize.Height) / 2
    $g.DrawString($yenText, $font, $textBrush, $textX, $textY)

    $font.Dispose()
    $textBrush.Dispose()

    # === Small gold dot decoration (top-right) ===
    $dotD = [Math]::Max(1, $size * 0.06)
    if ($dotD -ge 1) {
        $dotX = $size * 0.78
        $dotY = $size * 0.16
        $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 192, 64))
        $g.FillEllipse($dotBrush, $dotX, $dotY, $dotD, $dotD)
        $dotBrush.Dispose()
    }

    $g.Dispose()

    # Save to PNG memory stream
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $memoryStreams += @{ Size = $size; Data = $ms.ToArray() }
    $ms.Dispose()
    $bmp.Dispose()
}

# === Write ICO file ===
$rootDir = Split-Path -Parent $PSScriptRoot
$icoPath = Join-Path $rootDir 'resources\icon.ico'
$fs = [System.IO.File]::OpenWrite($icoPath)
$writer = New-Object System.IO.BinaryWriter($fs)

# ICO header
$writer.Write([Int16]0)
$writer.Write([Int16]1)
$writer.Write([Int16]$sizes.Count)

$dataOffset = 6 + (16 * $sizes.Count)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $sz = $sizes[$i]
    $pngData = $memoryStreams[$i].Data

    # Width/Height: 0 means 256
    if ($sz -ge 256) { $dim = 0 } else { $dim = $sz }

    $writer.Write([Byte]$dim)
    $writer.Write([Byte]$dim)
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([Int16]1)
    $writer.Write([Int16]32)
    $writer.Write([Int32]$pngData.Length)
    $writer.Write([Int32]$dataOffset)
    $dataOffset += $pngData.Length
}

foreach ($entry in $memoryStreams) {
    $writer.Write($entry.Data)
}

$writer.Dispose()
$fs.Dispose()

Write-Host "ICO saved: $icoPath"

# Save 256x256 PNG separately
$pngMs = New-Object System.IO.MemoryStream(,$memoryStreams[0].Data)
$png = [System.Drawing.Image]::FromStream($pngMs)
$pngPath = Join-Path $rootDir 'resources\icon.png'
$png.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$png.Dispose()
$pngMs.Dispose()

Write-Host "PNG saved: $pngPath"
Write-Host "Done! Icon design: dark rounded bg + gold coin + Yen"
