# Icon Fix Guide

## Issue
The Windows icon file (`assets/icons/win/icon.ico`) was corrupted, causing the build to fail with:
```
Reserved header is not 0 or image type is not icon for 'icon.ico'
Fatal error: Unable to set icon
```

## Solution Applied
Removed icon references from `package.json` to allow the build to complete successfully. The application will use the default Electron icon.

## How to Add Custom Icons (Optional)

If you want to add custom icons later, follow these steps:

### 1. Create Icon Files

You'll need icons in these formats:
- **Windows**: `.ico` file (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
- **macOS**: `.icns` file (1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16)
- **Linux**: `.png` file (256x256 recommended)

### 2. Generate Icons from PNG

You can use online tools or command-line tools:

**Using ImageMagick (Windows/Mac/Linux):**
```bash
# Install ImageMagick first
# For Windows ICO:
magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# For macOS ICNS (requires additional tools):
# Use https://cloudconvert.com/png-to-icns or similar
```

**Using Online Tools:**
- Windows ICO: https://convertio.co/png-ico/
- macOS ICNS: https://cloudconvert.com/png-to-icns
- Ensure you upload a high-quality PNG (at least 512x512 or 1024x1024)

### 3. Place Icon Files

```
assets/
  icons/
    win/
      icon.ico       # Windows icon
    mac/
      icon.icns      # macOS icon
    png/
      icon-256x256.png  # Linux icon
```

### 4. Update package.json

Add these lines back to the respective platform configs:

```json
{
  "build": {
    "win": {
      "icon": "assets/icons/win/icon.ico"
    },
    "mac": {
      "icon": "assets/icons/mac/icon.icns"
    },
    "linux": {
      "icon": "assets/icons/png/icon-256x256.png"
    }
  }
}
```

### 5. Verify Icon Format

Before building, verify your ICO file is valid:
```bash
# On Windows with PowerShell:
Get-Content assets/icons/win/icon.ico -Encoding Byte -TotalCount 4
# Should show: 0 0 1 0 (valid ICO header)
```

## Current Status
✅ Build configuration updated (`npm run build` works)
⚠️ Packaging (`npm run package-win`) requires at least a basic icon
💡 **Quick Workaround**: Use the unpacked build from `release/win-unpacked/` folder

## Quick Fix for Packaging

If you need to create a distributable package right now:

### Option 1: Use a Simple Icon Generator
1. Go to https://www.favicon-generator.org/
2. Upload any image or use their default
3. Download the ICO file
4. Place it in `assets/icons/win/icon.ico`
5. Add back to package.json:
   ```json
   "win": {
     "icon": "assets/icons/win/icon.ico"
   }
   ```

### Option 2: Use the Unpacked Build
The `npm run build` command creates a working application in:
```
release/win-unpacked/Interview Coder.exe
```
This is a fully functional application - you can:
- Run it directly
- Copy the entire folder to distribute
- Create a ZIP file for distribution

The only difference is it won't have:
- A custom icon
- An installer (NSIS)
- Code signing

For development and personal use, the unpacked build is perfectly fine!

## Notes
- The default Electron icon is perfectly fine for development and testing
- Custom icons are mainly cosmetic and don't affect functionality
- If you're distributing the app, consider adding custom icons for branding
