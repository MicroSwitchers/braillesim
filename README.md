# Braille Writer Simulator

A comprehensive, accessible web-based simulator of a mechanical Braille writer, designed for learning and practicing Braille writing techniques. This Progressive Web App (PWA) provides an authentic experience of operating a traditional Braille typewriter with modern web technology.

![Braille Writer Simulator](mbw.svg)

## 🌟 Features

### Core Functionality
- **6-Key Braille Input System**: Authentic dot pattern creation using F, D, S, J, K, L keys
- **Mechanical Key Simulation**: Realistic 3D key animations with tactile feedback
- **Paper Simulation**: 31-cell line capacity with visual paper representation
- **Carriage Movement**: Navigate between cells using arrow keys or slider control
- **Line Spacing**: Advance paper lines with line spacer key (A)
- **Backspace Function**: Remove characters with backspace key (;)
- **Space Bar**: Insert spaces using G and/or H keys

### Advanced Features
- **Braille Eraser Mode**: Click to flatten raised dots for corrections
- **Warning Bell System**: Configurable margin bell (3-7 spaces from end)
- **Sound Effects**: Authentic key embossing and bell sounds
- **Volume Control**: Adjustable sound levels
- **Auto-Save**: Automatic preservation of work progress
- **Full Screen Mode**: Immersive writing experience

### Progressive Web App (PWA)
- **Offline Functionality**: Works without internet connection
- **Install on Device**: Add to home screen on mobile/desktop
- **Background Sync**: Seamless updates and data synchronization
- **Push Notifications**: Stay informed of app updates
- **Responsive Design**: Optimized for all screen sizes

## 🚀 Getting Started

### Quick Start
1. Open `index.html` in a modern web browser
2. The app will automatically initialize and display the Braille grid
3. Start typing using the keyboard keys or clicking the on-screen buttons
4. Use the Instructions & Settings panel for detailed controls

### Installation as PWA
1. Open the app in Chrome, Edge, or Safari
2. Look for the "Install" button in the header or browser address bar
3. Click "Install" to add the app to your device
4. Launch from your home screen or app menu

### Keyboard Controls

| Key | Function | Description |
|-----|----------|-------------|
| F | Dot 1 | Top-left Braille dot |
| D | Dot 2 | Middle-left Braille dot |
| S | Dot 3 | Bottom-left Braille dot |
| J | Dot 4 | Top-right Braille dot |
| K | Dot 5 | Middle-right Braille dot |
| L | Dot 6 | Bottom-right Braille dot |
| G/H | Space | Insert space character |
| A | Line Spacer | Advance to next line |
| ; | Backspace | Delete previous character |
| ← → | Carriage | Move cursor left/right |
| ↑ ↓ | Paper Feed | Move between lines |

## 🎯 Educational Use

### Perfect for:
- **Braille Students**: Learn proper finger positioning and typing techniques
- **Educators**: Demonstrate mechanical Braille writer operation
- **Accessibility Training**: Understand assistive technology principles
- **Historical Study**: Experience traditional Braille writing methods

### Learning Benefits:
- Develops muscle memory for Braille dot patterns
- Teaches proper mechanical operation procedures
- Provides safe practice environment
- Builds confidence before using physical equipment

## 🛠️ Technical Specifications

### Technologies Used
- **HTML5**: Modern semantic markup
- **CSS3**: Advanced styling with animations and responsive design
- **JavaScript ES6+**: Modern functionality and PWA features
- **Service Worker**: Offline functionality and caching
- **Web App Manifest**: Native app-like experience
- **Web Audio API**: Realistic sound effects

## 📱 Mobile Experience

### Touch Optimization
- Large touch targets for easy interaction
- Gesture-friendly interface
- Portrait and landscape support
- Virtual keyboard integration

### Accessibility Features
- Screen reader compatible
- High contrast mode support
- Reduced motion options
- Keyboard navigation support

## ⚙️ Configuration Options

### Sound Settings
- **Warning Bell**: 3-7 spaces from right margin
- **Key Embossing Sound**: Toggle on/off
- **Volume Control**: 0-100% adjustment

### Visual Settings
- **Full Screen Mode**: Distraction-free writing
- **Cursor Visibility**: Bright position indicator
- **Responsive Layout**: Adapts to screen size

### File Structure
```
├── index.html          # Main application file
├── styles.css          # Complete styling
├── script.js           # Application logic
├── manifest.json       # PWA configuration
├── sw.js              # Service worker
├── mbw.svg            # App icon
├── *.wav              # Sound effects
└── README.md          # This file
```

## 🤝 Contributing

We welcome contributions to improve the Braille Writer Simulator:

1. Fork the repository
2. Create a feature branch
3. Make your improvements
4. Test thoroughly across devices
5. Submit a pull request

### Areas for Enhancement
- Additional Braille languages/codes
- More sound effect options
- Export functionality
- Print preview features
- Advanced settings panel

## 📄 License

This project is open source and available under the MIT License.


---


*Experience the authentic feel of mechanical Braille writing in your browser!*

App by Niall Brown - Early Childhood Vision Consultnat
