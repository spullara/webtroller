# Claude Web Controller

Claude Web Controller is a Chrome extension that allows you to control web pages using Claude AI. This extension integrates Claude's natural language processing capabilities with web browsing, enabling users to interact with web content in a more intuitive and efficient manner.

## Features

- Control web pages using natural language commands
- Interact with web content through AI-powered assistance
- Seamless integration with Claude AI
- Draggable input box for convenient placement
- Persistent chat position across page reloads
- Support for Claude API key configuration

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/spullara/webtroller.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (usually a toggle switch in the top right corner)
4. Click "Load unpacked" and select the directory containing the extension files

## Usage

1. After installation, you'll see a small input box in the bottom right corner of your web pages.
2. If you haven't set your Claude API key, enter it when prompted.
3. Once the API key is set, you can enter natural language commands to control the web page.
4. Use Command-K (or Ctrl-K on non-Mac systems) to toggle the visibility of the input box.

## Files

- `manifest.json`: Contains metadata about the extension and its capabilities
- `background.js`: Handles background processes for the extension
- `content.js`: Interacts with web page content
- `popup.html`: Provides the user interface for the extension popup

## Contributing

Contributions to the Claude Web Controller are welcome. Please feel free to submit pull requests or open issues to improve the functionality of this extension.

## License

This project is licensed under the terms found in the LICENSE file in this repository.

## Privacy

This extension interacts with the Claude AI API. Please ensure you're comfortable with the data being sent to the API and review Claude's privacy policy.

---

For more information or support, please open an issue in this repository.