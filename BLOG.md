# CheatSheet AI: The Free, Open-Source Alternative to Expensive Interview Tools

## Introduction: Breaking Down the $200/Month Barrier

If you've ever looked into AI-powered coding interview assistants, you've probably seen the price tags: $60, $100, even $200 per month for subscription-based tools. These premium services promise to help you ace technical interviews with invisible overlays, instant code generation, and AI-powered debugging. But what if I told you there's a completely free, open-source alternative that not only matches these features but actually surpasses them in several key areas?

Meet **CheatSheet AI** – a powerful, privacy-focused desktop application that puts you in control of your interview preparation without the recurring subscription fees.

## What Makes CheatSheet AI Different?

### 1. **You Own Your Data (and Your Wallet)**

Unlike subscription-based services that process everything on their servers, CheatSheet AI runs entirely on your machine. You bring your own API key from OpenAI, Google Gemini, or Anthropic Claude, and you only pay for what you use. No monthly subscriptions, no hidden fees, no vendor lock-in.

**Cost Comparison:**
- Premium Tools: $60-200/month (fixed cost regardless of usage)
- CheatSheet AI: $0/month + your actual API usage (typically $2-10/month for moderate use)

### 2. **True Multi-AI Support**

Most paid tools lock you into a single AI provider. CheatSheet AI gives you the freedom to choose:

- **OpenAI**: GPT-4o and GPT-4o-mini for balanced performance
- **Google Gemini**: Pro, Flash, and Flash-Lite models for different speed/quality tradeoffs
- **Anthropic Claude**: Sonnet 4, Sonnet 3.7, and Haiku 3.5 for various use cases

And here's the kicker: you can switch between models **instantly** with a keyboard shortcut (`Ctrl+\` or `Alt+2`). Testing different models for the same problem? Done in seconds.

### 3. **Invisible When It Needs to Be**

CheatSheet AI features an undetectable overlay that bypasses most screen capture methods:

✅ **Invisible to:**
- Zoom (versions below 6.1.6)
- All browser-based screen recording
- Discord screen sharing
- macOS screenshot tools (Cmd+Shift+3/4)

⚠️ **Visible to:**
- Zoom 6.1.6+ (but you can downgrade)
- macOS native screen recording (Cmd+Shift+5)

The application gives you complete control over window opacity, positioning, and visibility with intuitive keyboard shortcuts.

## Core Features That Actually Matter

### Quick Answer Mode: The One-Key Solution

Press `Ctrl+D` and watch the magic happen:
1. Automatically resets any previous work
2. Captures a screenshot of your current screen
3. Processes it through AI
4. Delivers a complete solution with explanation

All in one keystroke. No clicking through menus, no multi-step workflows. Just instant results.

### Smart Question Detection

CheatSheet AI automatically identifies what type of problem you're working on:

- **Multiple Choice Questions (MCQ)**: Analyzes options and provides the correct answer with reasoning
- **Python/Coding Problems**: Generates optimized solutions with detailed explanations
- **Web Development**: Creates complete HTML/CSS matching design screenshots
- **Text Questions**: Provides comprehensive written answers

No need to manually specify the question type – the AI figures it out.

### Advanced Screenshot Workflow

For more complex problems, use the manual mode:

1. **Capture Multiple Screenshots** (`Ctrl+H`): Take up to 2 screenshots of different parts of the problem
2. **Review Your Queue**: See thumbnails of captured screenshots
3. **Delete if Needed** (`Ctrl+Backspace`): Remove the last screenshot if you made a mistake
4. **Process Together** (`Ctrl+Enter`): Analyze all screenshots as a single context

This is perfect for problems that span multiple screens or require capturing both the question and starter code.

### Conversational Debugging

Got an error? Don't start over – just debug:

1. Take a screenshot of your error message
2. The AI analyzes what went wrong
3. Get structured feedback with:
   - Identified issues
   - Corrected code
   - Optimization suggestions
   - Detailed explanations

It's like having a senior developer looking over your shoulder.

### Web Development Superpowers

For front-end interviews, CheatSheet AI is a game-changer:

- **Screenshot to Code**: Capture a design mockup, get complete HTML/CSS
- **Separate Copy Functions**: 
  - `Ctrl+Shift+C` copies HTML
  - `Ctrl+Shift+D` copies CSS
- **Auto-Type Clipboard** (`Ctrl+Shift+V`): Bypasses paste restrictions by typing the content character-by-character

No more manually recreating designs or struggling with paste-blocked environments.

## The Complete Keyboard Shortcut Arsenal

CheatSheet AI is built for speed. Here's your complete reference:

### Essential Actions
- `Ctrl+D` – Quick Answer (capture + process in one)
- `Ctrl+H` – Take Screenshot
- `Ctrl+Enter` – Process Screenshots
- `Ctrl+R` – Reset/Clear Everything
- `Ctrl+Backspace` – Delete Last Screenshot

### Window Control
- `Ctrl+B` or `Alt+1` – Toggle Visibility
- `Ctrl+Q` – Quit Application
- `Ctrl+Arrow Keys` – Move Window
- `Ctrl+[` / `Ctrl+]` – Adjust Opacity
- `Ctrl+-` / `Ctrl+0` / `Ctrl+=` – Zoom Controls

### Copy & Paste
- `Ctrl+Shift+C` – Copy HTML/Code
- `Ctrl+Shift+D` – Copy CSS
- `Ctrl+Shift+V` – Type Clipboard Content

### AI & Models
- `Ctrl+\` or `Alt+2` – Cycle Through Models

All shortcuts are global and undetectable by browsers or other applications.

## Real-World Use Cases

### Case 1: The Timed Coding Challenge

You're in a 45-minute HackerRank assessment. The problem is complex, and you're stuck on the optimal approach.

**With CheatSheet AI:**
1. Press `Ctrl+D` to capture the problem
2. Get an optimized solution with Big-O analysis in 10-15 seconds
3. Understand the approach from the detailed explanation
4. Implement it in your own style
5. Use `Ctrl+Shift+C` to copy key code snippets if needed

**Time saved:** 15-20 minutes that you can use to refine your solution or tackle bonus questions.

### Case 2: The Web Design Interview

You need to recreate a complex UI mockup in 30 minutes.

**With CheatSheet AI:**
1. Capture the design with `Ctrl+H`
2. Process with `Ctrl+Enter`
3. Get complete HTML structure with `Ctrl+Shift+C`
4. Get matching CSS with `Ctrl+Shift+D`
5. Use `Ctrl+Shift+V` to type it into the paste-restricted editor
6. Customize and refine

**Result:** A pixel-perfect implementation in a fraction of the time.

### Case 3: The Debugging Nightmare

Your code works locally but fails the test cases. The error message is cryptic.

**With CheatSheet AI:**
1. Capture your code with `Ctrl+H`
2. Capture the error message with `Ctrl+H` again
3. Process both with `Ctrl+Enter`
4. Get a detailed analysis of what's wrong
5. Receive corrected code with explanations

**Outcome:** You understand the bug and fix it properly, not just patch it.

## Privacy and Security: Your Data Stays Yours

In an era where data privacy is paramount, CheatSheet AI takes a different approach:

- **No Account Required**: No sign-ups, no email collection, no user tracking
- **Local Processing**: All screenshot handling happens on your machine
- **Direct API Calls**: Your data goes straight from your computer to your chosen AI provider
- **No Middleman**: We never see your code, your questions, or your solutions
- **Open Source**: Audit the code yourself – it's all on GitHub

Compare this to subscription services where:
- Your code passes through their servers
- They may log your usage for "quality improvement"
- You have no visibility into what happens to your data
- You're trusting a black box with sensitive interview content

## Technical Architecture: Built for Developers, By Developers

CheatSheet AI is built with modern web technologies:

**Frontend:**
- React + TypeScript for type-safe UI development
- Tailwind CSS for rapid, responsive styling
- Radix UI for accessible, customizable components
- Vite for lightning-fast builds

**Backend:**
- Electron for cross-platform desktop functionality
- Native screenshot APIs for reliable capture
- Global keyboard hooks for undetectable shortcuts
- Local configuration management

**AI Integration:**
- Modular API clients for OpenAI, Gemini, and Claude
- Vision API support for screenshot analysis
- Streaming responses for real-time feedback
- Error handling and retry logic

## Customization: Make It Your Own

Because CheatSheet AI is open source, you can customize everything:

### Add New AI Models

Want to use Deepseek, Grok, or a local Llama model? The architecture is designed for easy extension:

1. Add your API client in `electron/ProcessingHelper.ts`
2. Update the UI in `src/components/Settings/SettingsDialog.tsx`
3. Configure your model parameters

The modular design means you can add new providers without breaking existing functionality.

### Modify the UI

Don't like the color scheme? Want different keyboard shortcuts? It's all configurable:

- Tailwind classes for styling
- Keyboard shortcuts in `electron/shortcuts.ts`
- Window behavior in `electron/main.ts`

### Extend Functionality

The codebase is well-structured for adding features:

- Add support for new programming languages
- Implement custom prompt templates
- Create specialized modes for different interview types
- Build integrations with your favorite tools

## Getting Started: From Zero to Running in 5 Minutes

### Prerequisites

- Node.js v16 or higher
- An API key from OpenAI, Google, or Anthropic
- Screen recording permission (macOS only)

### Installation

```bash
# Clone the repository
git clone https://github.com/greeneu/cheatsheet-ai.git
cd cheatsheet-ai

# Install dependencies
npm install

# Clean any previous builds
npm run clean

# Run the application
# Windows:
stealth-run.bat

# macOS/Linux:
chmod +x stealth-run.sh
./stealth-run.sh
```

The window will be invisible by default. Press `Ctrl+B` to make it visible.

### First-Time Setup

1. Press `Ctrl+B` to show the window
2. Click "Open Settings" in the welcome screen
3. Add your API key
4. Choose your preferred AI provider and models
5. Close settings and you're ready to go!

### Building Distributable Packages

Want to share with friends or use on multiple machines?

```bash
# macOS
npm run package-mac

# Windows
npm run package-win
```

Find your installer in the `release` directory.

## The Cost Reality: Let's Do the Math

### Premium Tool Subscription
- **Monthly Cost**: $100 (average)
- **Annual Cost**: $1,200
- **3-Month Interview Prep**: $300

### CheatSheet AI
- **Software Cost**: $0
- **API Usage** (heavy use, 100 problems):
  - GPT-4o: ~$5-8
  - Gemini Pro: ~$2-4
  - Claude Sonnet: ~$6-10
- **3-Month Interview Prep**: $15-30

**Savings**: $270-285 over 3 months

And that's for heavy usage. Most users spend even less.

## Ethical Considerations: Use Responsibly

Let's address the elephant in the room: interview ethics.

CheatSheet AI is a powerful tool, but with great power comes great responsibility. Here's our stance:

### Recommended Use Cases ✅

- **Practice and Learning**: Use it to understand problem-solving approaches
- **Take-Home Assignments**: Get help with concepts, but ensure you understand the solution
- **Skill Development**: Learn from the detailed explanations and improve your coding
- **Time Management**: Use it to move past blockers and keep momentum

### Questionable Use Cases ⚠️

- **Live Interviews**: If asked directly about assistance, be honest
- **Assessments**: Make sure you can explain and defend any code you submit
- **Certification Exams**: Check the rules – many explicitly prohibit AI assistance

### The Bottom Line

This tool is most valuable when used to **enhance your learning**, not replace it. The goal isn't just to pass interviews – it's to become a better developer. Use CheatSheet AI to:

- Understand patterns and approaches
- Learn from well-structured solutions
- Debug your thinking process
- Build confidence in your abilities

## Comparison Table: CheatSheet AI vs. Premium Tools

| Feature | Premium Tools | CheatSheet AI |
|---------|---------------|---------------|
| **Pricing** | $60-200/month | Free + API costs ($2-10/month) |
| **AI Providers** | Single provider | OpenAI, Gemini, Claude |
| **Model Switching** | Limited/None | Instant (Ctrl+\\) |
| **Privacy** | Server-processed | 100% local |
| **Customization** | Locked down | Full source access |
| **Screenshot Capture** | ✅ | ✅ |
| **Auto Question Detection** | ✅ | ✅ |
| **Code Generation** | ✅ | ✅ |
| **Debugging Mode** | ✅ | ✅ |
| **Web Dev Support** | Limited | ✅ Full HTML/CSS |
| **Clipboard Features** | Basic | Advanced (separate HTML/CSS, auto-type) |
| **Window Management** | Basic | Advanced (opacity, zoom, positioning) |
| **Keyboard Shortcuts** | Limited | 20+ shortcuts |
| **Open Source** | ❌ | ✅ |
| **No Account Required** | ❌ | ✅ |
| **Offline Mode** | ❌ | ✅ (after setup) |

## Community and Contribution

CheatSheet AI is built on the principle of collective improvement. The project welcomes contributions:

### Ways to Contribute

- **Code**: Add features, fix bugs, improve performance
- **Documentation**: Help others get started
- **Testing**: Report issues, test on different platforms
- **Ideas**: Suggest features and improvements

### License: AGPL-3.0

The project uses the GNU Affero General Public License v3.0, which means:

- ✅ Free to use, modify, and distribute
- ✅ Must share modifications under the same license
- ✅ Network use requires source code availability
- ✅ Encourages giving back to the community

This ensures the project remains free and open for everyone.

## Troubleshooting Common Issues

### Window Not Appearing
- Press `Ctrl+B` multiple times
- Adjust opacity with `Ctrl+]`
- Run `npm run clean` and rebuild

### Screenshots Not Capturing
- Check screen recording permissions (macOS)
- Ensure the app has focus
- Try the alternative shortcut `Ctrl+M`

### API Errors
- Verify your API key is correct
- Check your API credits/quota
- Try switching to a different model

### Window Manager Conflicts
- Some tools (like Rectangle Pro) may interfere
- Temporarily disable window management apps
- Use CheatSheet AI's built-in positioning

## The Future of CheatSheet AI

The roadmap includes exciting features:

- **Local Model Support**: Run Llama or other models locally
- **Custom Prompts**: Create your own prompt templates
- **Plugin System**: Extend functionality without modifying core code
- **Multi-Language UI**: Support for non-English interfaces
- **Advanced Analytics**: Track your learning progress
- **Collaborative Features**: Share solutions with study groups

## Conclusion: Take Control of Your Interview Prep

CheatSheet AI represents a fundamental shift in how developers approach interview preparation. Instead of paying hundreds of dollars per month for a black-box service, you get:

- **Complete transparency** through open source code
- **Full control** over your data and privacy
- **Flexibility** to choose and switch AI providers
- **Customization** to fit your exact needs
- **Community support** from fellow developers
- **Significant cost savings** without sacrificing features

Whether you're preparing for FAANG interviews, freelance coding assessments, or just want to level up your problem-solving skills, CheatSheet AI gives you professional-grade tools without the professional-grade price tag.

## Get Started Today

Ready to revolutionize your interview prep?

1. **Star the repo**: [github.com/greeneu/cheatsheet-ai](https://github.com/greeneu/cheatsheet-ai)
2. **Clone and install**: Follow the 5-minute setup guide
3. **Join the community**: Report issues, suggest features, contribute code
4. **Share your experience**: Help others discover this free alternative

Remember: The best tool is the one you understand and control. With CheatSheet AI, you're not just using software – you're part of a community building better tools for everyone.

---

## Additional Resources

- **GitHub Repository**: [github.com/greeneu/cheatsheet-ai](https://github.com/greeneu/cheatsheet-ai)
- **Issue Tracker**: Report bugs and request features
- **Contributing Guide**: Learn how to contribute
- **License**: AGPL-3.0 for transparency and community growth

---

*CheatSheet AI is a community project. If you find it valuable, consider contributing code, documentation, or ideas. Together, we're building tools that empower developers without exploiting them.*

**Disclaimer**: This tool is designed for learning and practice. Always use it ethically and in accordance with the rules of any assessment or interview you're participating in. The goal is to become a better developer, not just to pass tests.
