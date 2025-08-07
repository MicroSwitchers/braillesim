@echo off
echo Braille Writer PWA Icon Generator
echo ================================
echo.
echo This script will help you generate PWA icons from your SVG file.
echo.
echo To generate icons, you have a few options:
echo.
echo Option 1: Use the generate-icons.html file
echo    1. Open generate-icons.html in your browser
echo    2. It will automatically download PNG files
echo    3. Move the downloaded files to the icons/ folder
echo.
echo Option 2: Use online tools
echo    - Visit https://realfavicongenerator.net/
echo    - Upload your braillesim.svg file
echo    - Download the generated icons
echo    - Extract to the icons/ folder
echo.
echo Option 3: Use ImageMagick (if installed)
echo    - Run: magick braillesim.svg -resize 72x72 icons/icon-72x72.png
echo    - Repeat for sizes: 96, 128, 144, 152, 192, 384, 512
echo.
echo Required icon sizes:
echo - icon-72x72.png
echo - icon-96x96.png  
echo - icon-128x128.png
echo - icon-144x144.png
echo - icon-152x152.png
echo - icon-192x192.png
echo - icon-384x384.png
echo - icon-512x512.png
echo.
echo After generating icons, your PWA will be ready!
echo.
pause
