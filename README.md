# Quiz helper - Free & Open Source


> ## 🔑 API KEY INFORMATION
>
> I have tested and confirmed that **Gemini, OpenAI, and Anthropic APIs work properly** with the current version. If you are experiencing issues with your API keys:
>
> - Try deleting your API key entry from the config file located in your user data directory
> - Log out and log back in to the application
> - Check your API key dashboard to verify the key is active and has sufficient credits
> - Ensure you're using the correct API key format (OpenAI keys start with "sk-", Gemini keys start with "AI", Anthropic keys start with "sk-ant-")

### Customization Possibilities

The codebase is designed to be adaptable:

- **AI Models**: Currently supports OpenAI, Google Gemini, and Anthropic Claude. You can modify the code to integrate with other providers like Deepseek, Llama, or any model with an API. All integration code is in `electron/ProcessingHelper.ts` and UI settings are in `src/components/Settings/SettingsDialog.tsx`.
- **Languages**: Add support for additional programming languages
- **Features**: Extend the functionality with new capabilities 
- **UI**: Customize the interface to your preferences

All it takes is modest JavaScript/TypeScript knowledge and understanding of the API you want to integrate.

## Features

- 🎯 **99% Invisibility**: Undetectable window that bypasses most screen capture methods
- �  **Smart Screenshot Capture**: Capture both question text and code separately for better analysis
- 🤖 **AI-Powered Analysis**: Automatically extracts and analyzes coding problems using GPT-5, Gemini, or Claude
- � **Solution Generation**: Get detailed explanations and optimized solutions
- � **Real-time Debugging**: Debug your code with AI assistance and structured feedback
- 🎨 **Advanced Window Management**: Freely move, resize, change opacity, and zoom the window
- 🔄 **Multi-Model Support**: Choose between OpenAI (GPT-5/5-mini), Google Gemini (Pro/Flash/Lite), or Anthropic Claude models
- 🔀 **Quick Model Switching**: Cycle through models in the same family with a single shortcut
- 📋 **Code Clipboard**: Copy generated solutions directly to clipboard
- 🗑️ **Screenshot Management**: Delete screenshots with keyboard shortcuts
- 🔒 **Privacy-Focused**: Your API key and data never leave your computer except for API calls

## Global Keyboard Shortcuts

The application uses undetectable global keyboard shortcuts that won't be detected by browsers or other applications:

### Core Functions
- **Toggle Window Visibility**: `Ctrl/Cmd + B` or `Ctrl/Cmd + I`
- **Take Screenshot**: `Ctrl/Cmd + H` or `Ctrl/Cmd + M`
- **Process Screenshots**: `Ctrl/Cmd + Enter`
- **Start New Problem**: `Ctrl/Cmd + R`
- **Quit Application**: `Ctrl/Cmd + Q`

### Screenshot Management
- **Delete Last Screenshot**: `Ctrl/Cmd + Backspace`
- **Copy Code to Clipboard**: `Ctrl/Cmd + Shift + C`

### Window Movement
- **Move Left**: `Ctrl/Cmd + Left Arrow`
- **Move Right**: `Ctrl/Cmd + Right Arrow`
- **Move Up**: `Ctrl/Cmd + Up Arrow`
- **Move Down**: `Ctrl/Cmd + Down Arrow`

### Window Appearance
- **Decrease Opacity**: `Ctrl/Cmd + [`
- **Increase Opacity**: `Ctrl/Cmd + ]`
- **Zoom Out**: `Ctrl/Cmd + -`
- **Reset Zoom**: `Ctrl/Cmd + 0`
- **Zoom In**: `Ctrl/Cmd + =`

### AI Model Control
- **Cycle Through Models**: `Ctrl/Cmd + \` (cycles through models in the same provider family)
  - OpenAI: GPT-5 ↔ GPT-5-mini
  - Gemini: Pro → Flash → Lite → Pro
  - Claude: Sonnet 4 → Sonnet 3.7 → Haiku 3.5 → Sonnet 4

## Invisibility Compatibility

The application is invisible to:

- Zoom versions below 6.1.6 (inclusive)
- All browser-based screen recording software
- All versions of Discord
- Mac OS screenshot functionality (Command + Shift + 3/4)

Note: The application is **NOT** invisible to:

- Zoom versions 6.1.6 and above
  - https://zoom.en.uptodown.com/mac/versions (link to downgrade Zoom if needed)
- Mac OS native screen recording (Command + Shift + 5)

## Prerequisites

- Node.js (v16 or higher)
- npm or bun package manager
- API Key from one of the following:
  - OpenAI API Key
  - Google Gemini API Key
  - Anthropic Claude API Key
- Screen Recording Permission for Terminal/IDE
  - On macOS:
    1. Go to System Preferences > Security & Privacy > Privacy > Screen Recording
    2. Ensure that Interview Coder has screen recording permission enabled
    3. Restart Interview Coder after enabling permissions
  - On Windows:
    - No additional permissions needed
  - On Linux:
    - May require `xhost` access depending on your distribution

## Running the Application

### Quick Start

1. Clone the repository:

```bash
git clone https://github.com/greeneu/interview-coder-withoupaywall-opensource.git
cd interview-coder-withoupaywall-opensource
```

2. Install dependencies:

```bash
npm install
```

3. **RECOMMENDED**: Clean any previous builds:

```bash
npm run clean
```

4. Run the appropriate script for your platform:

**For Windows:**
```bash
stealth-run.bat
```

**For macOS/Linux:**
```bash
# Make the script executable first
chmod +x stealth-run.sh
./stealth-run.sh
```

**IMPORTANT**: The application window will be invisible by default! Use `Ctrl+B` (or `Cmd+B` on Mac) to toggle visibility.

### Building Distributable Packages

To create installable packages for distribution:

**For macOS (DMG):**
```bash
npm run package-mac
```

**For Windows (Installer):**
```bash
npm run package-win
```

The packaged applications will be available in the `release` directory.

**What the scripts do:**
- Create necessary directories for the application
- Clean previous builds to ensure a fresh start
- Build the application in production mode
- Launch the application in invisible mode

### Notes & Troubleshooting

- **Window Manager Compatibility**: Some window management tools (like Rectangle Pro on macOS) may interfere with the app's window movement. Consider disabling them temporarily.

- **API Usage**: Be mindful of your API key's rate limits and credit usage. Vision API calls are more expensive than text-only calls.

- **LLM Customization**: You can easily customize the app to include additional LLMs by modifying the API calls in `ProcessingHelper.ts` and related UI components.

- **Common Issues**:
  - Run `npm run clean` before starting the app for a fresh build
  - Use `Ctrl+B`/`Cmd+B` multiple times if the window doesn't appear
  - Adjust window opacity with `Ctrl+[`/`]` or `Cmd+[`/`]` if needed
  - For macOS: ensure script has execute permissions (`chmod +x stealth-run.sh`)

## Comparison with Paid Interview Tools

| Feature | Premium Tools (Paid) | Interview Coder (This Project) |
|---------|------------------------|----------------------------------------|
| Price | $60-200/month subscription | Free (only pay for your API usage) |
| Solution Generation | ✅ | ✅ |
| Debugging Assistance | ✅ | ✅ |
| Invisibility | ✅ | ✅ |
| Multi-language Support | ✅ | ✅ |
| Detailed Solution Explanations | ✅ | ✅ |
| Window Management | ✅ | ✅ (Enhanced with keyboard shortcuts) |
| Quick Model Switching | ❌ | ✅ |
| Multiple AI Providers | ❌ | ✅ (OpenAI, Gemini, Claude) |
| Code Clipboard | Limited | ✅ |
| Auth System | Required | None (Simplified) |
| Payment Processing | Required | None (Use your own API key) |
| Privacy | Server-processed | 100% Local Processing |
| Customization | Limited | Full Source Code Access |
| Model Selection | Limited | Choice Between Multiple Models |

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI Components
- OpenAI API / Google Gemini API / Anthropic Claude API

## How It Works

1. **Initial Setup**
   - Launch the invisible window
   - Enter your API key (OpenAI, Gemini, or Anthropic) in the settings
   - Choose your preferred AI provider and model for extraction, solution generation, and debugging

2. **Capturing Problem**
   - Use global shortcut `Ctrl/Cmd + H` (or `Ctrl/Cmd + M`) to take screenshots of code problems
   - Screenshots are automatically added to the queue (up to 2)
   - Remove the last screenshot with `Ctrl/Cmd + Backspace` if needed

3. **Processing**
   - Press `Ctrl/Cmd + Enter` to analyze the screenshots
   - AI extracts problem requirements from the screenshots using Vision API
   - The model generates an optimal solution based on the extracted information
   - All analysis is done using your personal API key

4. **Solution & Debugging**
   - View the generated solutions with detailed explanations
   - Copy code to clipboard with `Ctrl/Cmd + Shift + C`
   - Use debugging feature by taking more screenshots of error messages or code
   - Get structured analysis with identified issues, corrections, and optimizations
   - Toggle between solutions and queue views as needed

5. **Window Management**
   - Move window using `Ctrl/Cmd + Arrow keys`
   - Toggle visibility with `Ctrl/Cmd + B` or `Ctrl/Cmd + I`
   - Adjust opacity with `Ctrl/Cmd + [` and `Ctrl/Cmd + ]`
   - Zoom in/out with `Ctrl/Cmd + =` and `Ctrl/Cmd + -`, reset with `Ctrl/Cmd + 0`
   - Window remains invisible to specified screen sharing applications
   - Start a new problem using `Ctrl/Cmd + R`

6. **Model Management**
   - Quickly cycle through models in the same family with `Ctrl/Cmd + \`
   - Switch between AI providers in the settings dialog
   - Your preferences are saved between sessions

7. **Language Selection**
   - Easily switch between programming languages with a single click
   - Use arrow keys for keyboard navigation through available languages
   - The system dynamically adapts to any languages added or removed from the codebase
   - Your language preference is saved between sessions

## Adding More AI Models

This application is built with extensibility in mind. You can easily add support for additional LLMs alongside the existing integrations:

- Currently supports OpenAI (GPT-5, GPT-5-mini), Google Gemini (Pro, Flash, Lite), and Anthropic Claude (Sonnet 4, Sonnet 3.7, Haiku 3.5)
- You can add Deepseek, Grok, Llama, or any other AI model as alternative options
- The application architecture allows for multiple LLM backends to coexist
- Users have the freedom to choose their preferred AI provider

To add new models, simply extend the API integration in `electron/ProcessingHelper.ts` and add the corresponding UI options in `src/components/Settings/SettingsDialog.tsx`. The modular design makes this straightforward without disrupting existing functionality.

## Configuration

- **API Key**: Your personal API key is stored locally and only used for API calls to your chosen provider
- **AI Provider Selection**: Choose between OpenAI, Google Gemini, or Anthropic Claude
- **Model Selection**: You can choose different models for each stage of processing:
  - Problem Extraction: Analyzes screenshots to understand the coding problem
  - Solution Generation: Creates optimized solutions with explanations
  - Debugging: Provides detailed analysis of errors and improvement suggestions
- **Language**: Select your preferred programming language for solutions
- **Window Controls**: Adjust opacity, position, and zoom level using keyboard shortcuts
- **All settings are stored locally** in your user data directory and persist between sessions

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

### What This Means

- You are free to use, modify, and distribute this software
- If you modify the code, you must make your changes available under the same license
- If you run a modified version on a network server, you must make the source code available to users
- We strongly encourage you to contribute improvements back to the main project

See the [LICENSE-SHORT](LICENSE-SHORT) file for a summary of terms or visit [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html) for the full license text.

### Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information.

## Disclaimer and Ethical Usage

This tool is intended as a learning aid and practice assistant. While it can help you understand problems and solution approaches during interviews, consider these ethical guidelines:

- Be honest about using assistance tools if asked directly in an interview
- Use this tool to learn concepts, not just to get answers
- Recognize that understanding solutions is more valuable than simply presenting them
- In take-home assignments, make sure you thoroughly understand any solutions you submit

Remember that the purpose of technical interviews is to assess your problem-solving skills and understanding. This tool works best when used to enhance your learning, not as a substitute for it.

## Support and Questions

If you have questions or need support, please open an issue on the GitHub repository.

---

> **Remember:** This is a community resource. If you find it valuable, consider contributing rather than just requesting features. The project grows through collective effort, not individual demands.
