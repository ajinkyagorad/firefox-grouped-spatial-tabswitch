# Firefox Tab Switcher

A spatial tab switcher for Firefox that organizes your tabs into intuitive categories for quick navigation.

## Features

- **Smart Categorization**: Automatically groups tabs by category (Social, Work, Development, etc.)
- **Minimalist Design**: Clean, dark theme with smooth animations
- **Keyboard-Centric**: Navigate quickly without touching your mouse
- **Responsive Layout**: Works on all screen sizes
- **Lightweight**: Uses native browser APIs for optimal performance

## Installation

1. Open Firefox and go to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this directory

## Usage

### Basic Controls

- `Ctrl+Shift+Space`: Open/close tab switcher
- `↑/↓`: Navigate between tab groups
- `←/→`: Navigate between tabs
- `Enter`: Switch to selected tab
- `Esc`: Close tab switcher

### Tab Cycling

- `Ctrl+Alt+→`: Switch to next tab in current window
- `Ctrl+Alt+←`: Switch to previous tab in current window

## Customization

Edit the `categorizeDomain` function in `background.js` to add or modify website categories.

## License

MIT

---

*Note: This is a temporary extension. You'll need to reload it when you restart Firefox.*
