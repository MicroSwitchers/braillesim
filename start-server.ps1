# Braille Writer PWA Development Server
# This script starts a local HTTPS server for testing PWA features

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Braille Writer PWA Test Server" -ForegroundColor Cyan  
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "index.html")) {
    Write-Host "Error: index.html not found!" -ForegroundColor Red
    Write-Host "Please run this script from the app directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Check for required files
$requiredFiles = @("manifest.json", "sw.js", "braillesim.svg")
$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "Warning: Missing required files:" -ForegroundColor Yellow
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Check for icons directory
if (-not (Test-Path "icons")) {
    Write-Host "Warning: icons directory not found!" -ForegroundColor Yellow
    Write-Host "You need to generate PWA icons first." -ForegroundColor Yellow
    Write-Host "Run generate-icons.html or use an online tool." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Starting development server..." -ForegroundColor Green
Write-Host ""

# Try different server options
$serverStarted = $false

# Option 1: Try Python
try {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        Write-Host "Using Python HTTP server..." -ForegroundColor Green
        Write-Host "Server will run at: http://localhost:8000" -ForegroundColor Cyan
        Write-Host "PWA Test page: http://localhost:8000/pwa-test.html" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
        Write-Host ""
        python -m http.server 8000
        $serverStarted = $true
    }
} catch {
    Write-Host "Python not available, trying other options..." -ForegroundColor Yellow
}

# Option 2: Try Node.js serve
if (-not $serverStarted) {
    try {
        if (Get-Command npx -ErrorAction SilentlyContinue) {
            Write-Host "Using Node.js serve..." -ForegroundColor Green
            Write-Host "Installing serve if needed..." -ForegroundColor Yellow
            npx serve . -l 8000
            $serverStarted = $true
        }
    } catch {
        Write-Host "Node.js serve not available, trying other options..." -ForegroundColor Yellow
    }
}

# Option 3: Try PHP
if (-not $serverStarted) {
    try {
        if (Get-Command php -ErrorAction SilentlyContinue) {
            Write-Host "Using PHP built-in server..." -ForegroundColor Green
            Write-Host "Server will run at: http://localhost:8000" -ForegroundColor Cyan
            Write-Host ""
            php -S localhost:8000
            $serverStarted = $true
        }
    } catch {
        Write-Host "PHP not available..." -ForegroundColor Yellow
    }
}

# If no server could be started
if (-not $serverStarted) {
    Write-Host ""
    Write-Host "No development server available!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To test the PWA, you need to serve it over HTTP/HTTPS." -ForegroundColor Yellow
    Write-Host "Please install one of the following:" -ForegroundColor Yellow
    Write-Host "  1. Python 3: https://python.org" -ForegroundColor White
    Write-Host "  2. Node.js: https://nodejs.org" -ForegroundColor White  
    Write-Host "  3. PHP: https://php.net" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternative: Use VS Code Live Server extension" -ForegroundColor Cyan
    Write-Host ""
}

Read-Host "Press Enter to exit"
