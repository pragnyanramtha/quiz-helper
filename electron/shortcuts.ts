import { globalShortcut, app, clipboard } from "electron"
import { IShortcutsHelperDeps } from "./main"
import { configHelper } from "./ConfigHelper"
import { keyboard } from "@nut-tree-fork/nut-js"

export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps
  private isTyping: boolean = false
  private shouldStopTyping: boolean = false

  constructor(deps: IShortcutsHelperDeps) {
    this.deps = deps
  }

  private adjustOpacity(delta: number): void {
    const mainWindow = this.deps.getMainWindow();
    if (!mainWindow) return;

    let currentOpacity = mainWindow.getOpacity();
    let newOpacity = Math.max(0.1, Math.min(1.0, currentOpacity + delta));
    console.log(`Adjusting opacity from ${currentOpacity} to ${newOpacity}`);

    mainWindow.setOpacity(newOpacity);

    // Save the opacity setting to config without re-initializing the client
    try {
      const config = configHelper.loadConfig();
      config.opacity = newOpacity;
      configHelper.saveConfig(config);
    } catch (error) {
      console.error('Error saving opacity to config:', error);
    }

    // If we're making the window visible, also make sure it's shown and interaction is enabled
    if (newOpacity > 0.1 && !this.deps.isVisible()) {
      this.deps.toggleMainWindow();
    }
  }

  public registerGlobalShortcuts(): void {
    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot...")
        try {
          const screenshotPath = await this.deps.takeScreenshot()
          const preview = await this.deps.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })

    // Alias for Ctrl+H - Ctrl+M to take screenshot
    globalShortcut.register("CommandOrControl+M", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot (alias for Ctrl+H)...")
        try {
          const screenshotPath = await this.deps.takeScreenshot()
          const preview = await this.deps.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })

    globalShortcut.register("CommandOrControl+Enter", async () => {
      console.log("Ctrl+Enter pressed - Processing screenshots...")
      try {
        const result = await this.deps.processingHelper?.processScreenshots()
        if (result) {
          console.log("Processing result:", result.success ? "SUCCESS" : `FAILED: ${result.error}`)
        }
      } catch (error) {
        console.error("Unexpected error in Ctrl+Enter handler:", error)
      }
    })

    // Quick Answer function - Reset, Capture, and Process in one go
    const quickAnswer = async () => {
      console.log("Quick Answer triggered: Reset → Capture → Process")
      const mainWindow = this.deps.getMainWindow()

      try {
        // Step 1: Reset (like Ctrl+R)
        console.log("Step 1: Resetting queues...")
        this.deps.processingHelper?.cancelOngoingRequests()
        this.deps.clearQueues()
        this.deps.setView("queue")

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send("reset")
        }

        // Small delay to ensure reset completes
        await new Promise(resolve => setTimeout(resolve, 100))

        // Step 2: Capture screenshot (like Ctrl+H)
        console.log("Step 2: Capturing screenshot...")
        if (mainWindow) {
          const screenshotPath = await this.deps.takeScreenshot()
          const preview = await this.deps.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })

          // Small delay to ensure screenshot is added to queue
          await new Promise(resolve => setTimeout(resolve, 200))

          // Step 3: Process (like Ctrl+Enter)
          console.log("Step 3: Processing screenshot...")
          const result = await this.deps.processingHelper?.processScreenshots()
          if (result) {
            console.log("Quick Answer result:", result.success ? "SUCCESS" : `FAILED: ${result.error}`)
          }
        }
      } catch (error) {
        console.error("Error in Quick Answer:", error)
      }
    }

    // Quick Answer shortcut - Ctrl+D
    globalShortcut.register("CommandOrControl+D", quickAnswer)

    globalShortcut.register("CommandOrControl+R", () => {
      console.log(
        "Command + R pressed. Canceling requests and resetting queues..."
      )

      // Cancel ongoing API requests
      this.deps.processingHelper?.cancelOngoingRequests()

      // Clear both screenshot queues
      this.deps.clearQueues()

      console.log("Cleared queues.")

      // Update the view state to 'queue'
      this.deps.setView("queue")

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }
    })

    // New shortcuts for moving the window
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.")
      this.deps.moveWindowLeft()
    })

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.")
      this.deps.moveWindowRight()
    })

    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.")
      this.deps.moveWindowDown()
    })

    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.")
      this.deps.moveWindowUp()
    })

    globalShortcut.register("CommandOrControl+B", () => {
      console.log("Command/Ctrl + B pressed. Toggling window visibility.")
      this.deps.toggleMainWindow()
    })

    // Alias for Ctrl+B - Alt+1 to toggle visibility
    globalShortcut.register("Alt+1", () => {
      console.log("Alt+1 pressed. Toggling window visibility (alias for Ctrl+B).")
      this.deps.toggleMainWindow()
    })

    // Alias for Ctrl+B - Ctrl+I to toggle visibility
    globalShortcut.register("CommandOrControl+I", () => {
      console.log("Command/Ctrl + I pressed. Toggling window visibility (alias for Ctrl+B).")
      this.deps.toggleMainWindow()
    })

    globalShortcut.register("CommandOrControl+Q", () => {
      console.log("Command/Ctrl + Q pressed. Quitting application.")
      app.quit()
    })

    // Adjust opacity shortcuts
    globalShortcut.register("CommandOrControl+[", () => {
      console.log("Command/Ctrl + [ pressed. Decreasing opacity.")
      this.adjustOpacity(-0.1)
    })

    globalShortcut.register("CommandOrControl+]", () => {
      console.log("Command/Ctrl + ] pressed. Increasing opacity.")
      this.adjustOpacity(0.1)
    })

    // Zoom controls
    globalShortcut.register("CommandOrControl+-", () => {
      console.log("Command/Ctrl + - pressed. Zooming out.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom - 0.5)
      }
    })

    globalShortcut.register("CommandOrControl+0", () => {
      console.log("Command/Ctrl + 0 pressed. Resetting zoom.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.setZoomLevel(0)
      }
    })

    globalShortcut.register("CommandOrControl+=", () => {
      console.log("Command/Ctrl + = pressed. Zooming in.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom + 0.5)
      }
    })

    // Model cycling function - cycles models based on current mode
    const cycleModels = () => {
      console.log("Cycling through models based on current mode.")
      try {
        const config = configHelper.loadConfig()
        const mode = config.mode

        if (mode === "mcq") {
          // Cycle through Groq models
          const groqModels = ["llama-3.3-70b-versatile", "meta-llama/llama-4-maverick-17b-128e-instruct", "openai/gpt-oss-120b"]
          const currentIndex = groqModels.indexOf(config.groqModel)
          const nextIndex = (currentIndex + 1) % groqModels.length
          const newModel = groqModels[nextIndex]
          
          configHelper.updateConfig({ groqModel: newModel })
          console.log(`Switched Groq model to: ${newModel}`)

          // Notify the renderer process
          const mainWindow = this.deps.getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("model-changed", { model: newModel, mode: "mcq" })
          }
        } else {
          // Cycle through Gemini models
          const geminiModels = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"]
          const currentIndex = geminiModels.indexOf(config.geminiModel)
          const nextIndex = (currentIndex + 1) % geminiModels.length
          const newModel = geminiModels[nextIndex]
          
          configHelper.updateConfig({ geminiModel: newModel })
          console.log(`Switched Gemini model to: ${newModel}`)

          // Notify the renderer process
          const mainWindow = this.deps.getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("model-changed", { model: newModel, mode: "general" })
          }
        }
      } catch (error) {
        console.error("Error cycling models:", error)
      }
    }

    // Ctrl+\ to cycle through models in the same family
    globalShortcut.register("CommandOrControl+\\", cycleModels)

    // Alt+2 alias for cycling models
    globalShortcut.register("Alt+2", cycleModels)

    // Ctrl+/ to toggle between MCQ and General mode
    globalShortcut.register("CommandOrControl+/", () => {
      console.log("Ctrl+/ pressed. Toggling processing mode...")
      try {
        const newMode = configHelper.toggleMode()
        const modeIcon = newMode === "mcq" ? "⚡" : "🎯"
        const modeDescription = newMode === "mcq" 
          ? "MCQ Mode - Ultra-fast with Groq" 
          : "General Mode - All questions with Gemini"
        
        console.log(`${modeIcon} Switched to ${newMode.toUpperCase()} MODE - ${modeDescription}`)

        // Notify the renderer process about the mode change
        const mainWindow = this.deps.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("mode-changed", { 
            mode: newMode,
            icon: modeIcon,
            description: modeDescription
          })
        }
      } catch (error) {
        console.error("Error toggling mode:", error)
      }
    })

    // Copy HTML to clipboard shortcut (for web dev questions)
    globalShortcut.register("CommandOrControl+Shift+C", () => {
      console.log("Command/Ctrl + Shift + C pressed. Copying HTML to clipboard.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        // Send an event to the renderer to copy HTML
        mainWindow.webContents.send("copy-html-to-clipboard")
      }
    })

    // Copy CSS to clipboard shortcut (for web dev questions)
    globalShortcut.register("CommandOrControl+Shift+D", () => {
      console.log("Command/Ctrl + Shift + D pressed. Copying CSS to clipboard.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        // Send an event to the renderer to copy CSS
        mainWindow.webContents.send("copy-css-to-clipboard")
      }
    })

    // Delete last screenshot shortcut
    globalShortcut.register("CommandOrControl+Backspace", () => {
      console.log("Command/Ctrl + Backspace pressed. Deleting last screenshot.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        // Send an event to the renderer to delete the last screenshot
        mainWindow.webContents.send("delete-last-screenshot")
      }
    })



    // Ctrl+Shift+V: Type clipboard content with faster speed
    globalShortcut.register("CommandOrControl+Shift+V", async () => {
      console.log("Ctrl+Shift+V pressed. Typing out clipboard content...")

      if (this.isTyping) {
        console.log("Already typing, ignoring request")
        return
      }

      try {
        const clipboardText = clipboard.readText()

        if (!clipboardText) {
          console.log("Clipboard is empty")
          return
        }

        console.log(`Typing ${clipboardText.length} characters from clipboard`)
        this.isTyping = true
        this.shouldStopTyping = false

        // Small delay to allow user to focus the target window
        await new Promise(resolve => setTimeout(resolve, 500))

        // Configure keyboard for slightly faster typing (reduce delay between keystrokes)
        keyboard.config.autoDelayMs = 75 // Slightly faster than default (default is 100ms)

        // Type character by character to allow interruption
        for (let i = 0; i < clipboardText.length; i++) {
          if (this.shouldStopTyping) {
            console.log(`Typing stopped at character ${i + 1}/${clipboardText.length}`)
            break
          }
          await keyboard.type(clipboardText[i])
        }

        if (!this.shouldStopTyping) {
          console.log('Successfully typed clipboard content')
        }

      } catch (error) {
        console.error("Error in Ctrl+Shift+V handler:", error)
      } finally {
        this.isTyping = false
        this.shouldStopTyping = false
        // Reset to default speed
        keyboard.config.autoDelayMs = 100
      }
    })

    // Ctrl+Shift+X: Stop typing
    globalShortcut.register("CommandOrControl+Shift+X", () => {
      console.log("Ctrl+Shift+X pressed. Stopping typing...")
      if (this.isTyping) {
        this.shouldStopTyping = true
        console.log("Typing will stop after current character")
      } else {
        console.log("No typing in progress")
      }
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
