# Braille Writer Simulator PWA

A Progressive Web App for learning and practicing Braille writing techniques. This app works offline and can be installed on all platforms.

## Features

- ✅ **Progressive Web App (PWA)** - Install on any device
- ✅ **Offline Support** - Works without internet connection
- ✅ **Cross-Platform** - Runs on Windows, macOS, Linux, iOS, Android
- ✅ **Native App Feel** - Standalone window, app icon, splash screen
- ✅ **Responsive Design** - Adapts to all screen sizes
- ✅ **Accessible** - Built with accessibility in mind

## Installation

### Web Browser
1. Visit the app URL in any modern browser
2. Look for the "Install App" button or browser install prompt
3. Click "Install" to add it to your device

### Platform-Specific Installation

#### Desktop (Windows/Mac/Linux)
- **Chrome/Edge**: Click the install icon in the address bar
- **Firefox**: Use the "Install" button in the app
- **Safari**: Click "Add to Dock" from the Share menu

#### Mobile (iOS/Android)
- **iOS Safari**: Tap Share → "Add to Home Screen"
- **Android Chrome**: Tap "Add to Home Screen" prompt
- **Other browsers**: Use the in-app install button

## PWA Features

### Icon Integration
- App icon appears in the title bar
- Native app icons on all platforms
- Adaptive icons for different system themes

### Offline Capabilities
- Full app functionality without internet
- Automatic caching of app resources
- Local document storage and retrieval

### Native App Experience
- Standalone window (no browser UI)
- Custom splash screen
- Platform-specific behaviors
- Home screen/dock integration

## Setup Instructions

### 1. Generate Icons (Required)
Before using the PWA, you need to generate icon files:

#### Option A: Use the HTML Generator
1. Open `generate-icons.html` in your browser
2. Icons will automatically download
3. Move downloaded files to the `icons/` folder

#### Option B: Online Tool (Recommended)
1. Visit [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload `braillesim.svg`
3. Download the generated package
4. Extract PNG files to the `icons/` folder

#### Option C: Command Line (if ImageMagick installed)
```bash
magick braillesim.svg -resize 72x72 icons/icon-72x72.png
magick braillesim.svg -resize 96x96 icons/icon-96x96.png
magick braillesim.svg -resize 128x128 icons/icon-128x128.png
magick braillesim.svg -resize 144x144 icons/icon-144x144.png
magick braillesim.svg -resize 152x152 icons/icon-152x152.png
magick braillesim.svg -resize 192x192 icons/icon-192x192.png
magick braillesim.svg -resize 384x384 icons/icon-384x384.png
magick braillesim.svg -resize 512x512 icons/icon-512x512.png
```

### 2. Required Files Structure
```
your-app-folder/
├── index.html          (Main app file)
├── manifest.json       (PWA configuration)
├── sw.js              (Service worker)
├── braillesim.svg     (Original icon)
├── icons/             (Generated icons folder)
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
└── README.md          (This file)
```

### 3. Serve the App
For PWA features to work, the app must be served over HTTPS:

#### Local Development
```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8000
```

#### Production Deployment
- Deploy to any web hosting service
- Ensure HTTPS is enabled
- All files must be accessible

## Browser Support

| Browser | Desktop | Mobile | PWA Support |
|---------|---------|---------|-------------|
| Chrome  | ✅      | ✅      | Full        |
| Edge    | ✅      | ✅      | Full        |
| Firefox | ✅      | ✅      | Partial*    |
| Safari  | ✅      | ✅      | Good        |

*Firefox supports PWA installation with some limitations

## Troubleshooting

### Install Button Not Showing
- Ensure all icon files are present in `icons/` folder
- Check that you're using HTTPS (not HTTP)
- Try refreshing the page
- Check browser console for errors

### App Not Working Offline
- Verify the service worker is registered (check browser DevTools)
- Ensure all required files are cached
- Check network settings in browser DevTools

### Icons Not Displaying
- Verify icon files exist in the `icons/` folder
- Check file permissions
- Ensure correct file sizes and formats

## Development

### Updating the App
1. Modify `index.html` as needed
2. Update version in `sw.js` cache name
3. The service worker will automatically update users

### Adding New Features
- All features work offline automatically
- Audio features use Tone.js (cached for offline use)
- Local storage is used for settings and documents

### Testing PWA Features
1. Use Chrome DevTools → Application → Manifest
2. Test offline mode in DevTools → Network → Offline
3. Verify service worker in DevTools → Application → Service Workers

## License

This Braille Writer Simulator PWA is created for educational and accessibility purposes.

## Support

For issues or questions about the PWA setup, check:
1. Browser DevTools console for errors
2. Manifest validation at [Web Manifest Validator](https://manifest-validator.appspot.com/)
3. PWA audit in Chrome DevTools → Lighthouse
