import { globalShortcut, app, clipboard } from "electron"
import { IShortcutsHelperDeps } from "./main"
import { configHelper } from "./ConfigHelper"
import { keyboard, Key } from "@nut-tree-fork/nut-js"

export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps

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

    // Model cycling function
    const cycleModels = () => {
      console.log("Cycling through models in the same family.")
      try {
        const config = configHelper.loadConfig()
        const provider = config.apiProvider

        let newModel = ""

        if (provider === "gemini") {
          // Cycle through Gemini models: pro -> flash -> lite -> pro
          const geminiModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
          const currentIndex = geminiModels.indexOf(config.solutionModel)
          const nextIndex = (currentIndex + 1) % geminiModels.length
          newModel = geminiModels[nextIndex]
        } else if (provider === "openai") {
          // Cycle through OpenAI models: gpt-5 -> gpt-5-mini -> gpt-5
          const openaiModels = ["gpt-5", "gpt-5-mini"]
          const currentIndex = openaiModels.indexOf(config.solutionModel)
          const nextIndex = (currentIndex + 1) % openaiModels.length
          newModel = openaiModels[nextIndex]
        } else if (provider === "anthropic") {
          // Cycle through Claude models
          const claudeModels = ["claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-haiku-20241022"]
          const currentIndex = claudeModels.indexOf(config.solutionModel)
          const nextIndex = (currentIndex + 1) % claudeModels.length
          newModel = claudeModels[nextIndex]
        }

        if (newModel) {
          configHelper.updateConfig({
            extractionModel: newModel,
            solutionModel: newModel,
            debuggingModel: newModel
          })
          console.log(`Switched to model: ${newModel}`)

          // Notify the renderer process about the model change
          const mainWindow = this.deps.getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("model-changed", { model: newModel, provider })
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


    
    // Backup: Ctrl+Shift+V as alternative for typing clipboard
    globalShortcut.register("CommandOrControl+Shift+V", async () => {
      console.log("Ctrl+Shift+V pressed. Typing out clipboard content...")
      try {
        const clipboardText = clipboard.readText()

        if (!clipboardText) {
          console.log("Clipboard is empty")
          return
        }

        console.log(`Typing ${clipboardText.length} characters from clipboard`)

        // Small delay to allow user to focus the target window
        await new Promise(resolve => setTimeout(resolve, 500))

        // Use nut-js to type the text
        await keyboard.type(clipboardText)
        
        console.log('Successfully typed clipboard content')

      } catch (error) {
        console.error("Error in Ctrl+Shift+V handler:", error)
      }
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
