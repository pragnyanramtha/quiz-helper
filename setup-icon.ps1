# Simple Icon Setup Script for Windows
# This creates a basic icon so the build can complete

Write-Host "Setting up basic icon for Interview Coder..." -ForegroundColor Cyan

# Create directories if they don't exist
$iconDir = "assets\icons\win"
if (!(Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
    Write-Host "Created directory: $iconDir" -ForegroundColor Green
}

# Create a simple 256x256 PNG icon
Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)

# Set high quality rendering
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Draw a nice gradient background
$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(33, 150, 243),
    [System.Drawing.Color]::FromArgb(21, 101, 192),
    45
)
$graphics.FillRectangle($brush, $rect)

# Draw "IC" text
$font = New-Object System.Drawing.Font("Segoe UI", 110, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString("IC", $font, $textBrush, $rect, $format)

# Save as PNG
$pngPath = "$iconDir\icon-temp.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Clean up
$graphics.Dispose()
$bmp.Dispose()
$brush.Dispose()
$textBrush.Dispose()
$font.Dispose()

Write-Host "Created PNG icon: $pngPath" -ForegroundColor Green

# Now convert to ICO using ImageMagick if available, otherwise provide instructions
$magickPath = Get-Command magick -ErrorAction SilentlyContinue

if ($magickPath) {
    Write-Host "Converting to ICO format..." -ForegroundColor Cyan
    & magick convert "$pngPath" -define icon:auto-resize=256,128,64,48,32,16 "$iconDir\icon.ico"
    
    if (Test-Path "$iconDir\icon.ico") {
        Write-Host "✓ Icon created successfully: $iconDir\icon.ico" -ForegroundColor Green
        Remove-Item $pngPath
        
        Write-Host "`nYou can now run: npm run package-win" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Failed to create ICO file" -ForegroundColor Red
    }
} else {
    Write-Host "`n⚠ ImageMagick not found. Please install it or use an online converter:" -ForegroundColor Yellow
    Write-Host "  1. Install ImageMagick: https://imagemagick.org/script/download.php#windows" -ForegroundColor White
    Write-Host "  2. Or use online converter: https://convertio.co/png-ico/" -ForegroundColor White
    Write-Host "  3. Convert $pngPath to icon.ico" -ForegroundColor White
    Write-Host "  4. Place the ICO file in: $iconDir\icon.ico" -ForegroundColor White
}

Write-Host "`nDone!" -ForegroundColor Green
