import { IShortcutsHelperDeps } from "./main"
import { app } from "electron"
import { ShortcutsManager } from "./shortcuts/ShortcutsManager"
import { ClipboardTyper } from "./shortcuts/typing/ClipboardTyper"
import { configHelper } from "./ConfigHelper"
import { performanceMonitor } from "./utils/PerformanceMonitor"
import { API } from "./constants/app-constants"

export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps
  private clipboardTyper: ClipboardTyper

  constructor(deps: IShortcutsHelperDeps) {
    this.deps = deps
    this.clipboardTyper = new ClipboardTyper(this.showNotification.bind(this))
  }

  private showNotification(title: string, message: string, type: string = "info"): void {
    const mainWindow = this.deps.getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send("show-notification", {
        title,
        message,
        type
      })
    }
  }

  public setProcessedClipboard(text: string): void {
    this.clipboardTyper.setProcessedClipboard(text)
  }

  private adjustOpacity(delta: number): void {
    try {
      const mainWindow = this.deps.getMainWindow();
      if (!mainWindow || mainWindow.isDestroyed()) return;

      let currentOpacity = mainWindow.getOpacity();
      if (typeof currentOpacity !== 'number' || isNaN(currentOpacity)) {
        currentOpacity = 1.0;
      }
      
      let newOpacity = Math.max(0.1, Math.min(1.0, currentOpacity + delta));
      console.log(`Adjusting opacity from ${currentOpacity} to ${newOpacity}`);

      mainWindow.setOpacity(newOpacity);

      try {
        const config = configHelper.loadConfig();
        config.opacity = newOpacity;
        configHelper.saveConfig(config);
      } catch (error) {
        console.error('Error saving opacity to config:', error);
      }

      if (newOpacity > 0.1 && !this.deps.isVisible()) {
        this.deps.toggleMainWindow();
      }
    } catch (error) {
      console.error('Error adjusting opacity:', error);
    }
  }

  public registerGlobalShortcuts(): void {
    // Screenshot shortcuts
    const takeScreenshot = async () => {
      try {
        const mainWindow = this.deps.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log("Taking screenshot...")
          const screenshotPath = await this.deps.takeScreenshot()
          if (screenshotPath) {
            const preview = await this.deps.getImagePreview(screenshotPath)
            mainWindow.webContents.send("screenshot-taken", {
              path: screenshotPath,
              preview
            })
          }
        }
      } catch (error) {
        console.error("Error capturing screenshot:", error)
      }
    }

    ShortcutsManager.register("CommandOrControl+H", takeScreenshot)
    ShortcutsManager.register("CommandOrControl+M", takeScreenshot)

    // Process screenshots
    ShortcutsManager.register("CommandOrControl+Enter", async () => {
      console.log("Ctrl+Enter pressed - Processing screenshots...")
      performanceMonitor.startTimer('Shortcut to Processing');
      try {
        const result = await this.deps.processingHelper?.processScreenshots()
        performanceMonitor.endTimer('Shortcut to Processing');
        if (result) {
          if (result.success) {
            console.log("Processing result: SUCCESS")
          } else {
            console.log(`Processing result: FAILED: ${(result as any).error}`)
          }
        }
      } catch (error) {
        performanceMonitor.endTimer('Shortcut to Processing');
        console.error("Unexpected error in Ctrl+Enter handler:", error)
      }
    })

    // Quick Answer
    const quickAnswer = async () => {
      console.log("Quick Answer triggered: Reset → Capture → Process")
      performanceMonitor.startTimer('Quick Answer (Total)');
      const mainWindow = this.deps.getMainWindow()

      try {
        performanceMonitor.startTimer('Quick Answer - Reset');
        console.log("Step 1: Resetting queues...")
        this.deps.processingHelper?.cancelOngoingRequests()
        this.deps.clearQueues()
        this.deps.setView("queue")

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send("reset")
        }
        performanceMonitor.endTimer('Quick Answer - Reset');

        // Reduced delay from 100ms to 20ms
        await new Promise(resolve => setTimeout(resolve, 20))

        performanceMonitor.startTimer('Quick Answer - Screenshot');
        console.log("Step 2: Capturing screenshot...")
        if (mainWindow && !mainWindow.isDestroyed()) {
          const screenshotPath = await this.deps.takeScreenshot()
          performanceMonitor.endTimer('Quick Answer - Screenshot');
          
          if (screenshotPath) {
            performanceMonitor.startTimer('Quick Answer - Preview');
            const preview = await this.deps.getImagePreview(screenshotPath)
            performanceMonitor.endTimer('Quick Answer - Preview');
            
            mainWindow.webContents.send("screenshot-taken", {
              path: screenshotPath,
              preview
            })

            // Reduced delay from 200ms to 20ms
            await new Promise(resolve => setTimeout(resolve, 20))

            performanceMonitor.startTimer('Quick Answer - Processing');
            console.log("Step 3: Processing screenshot...")
            const result = await this.deps.processingHelper?.processScreenshots()
            performanceMonitor.endTimer('Quick Answer - Processing');
            performanceMonitor.endTimer('Quick Answer (Total)');
            
            if (result) {
              if (result.success) {
                console.log("Quick Answer result: SUCCESS")
              } else {
                console.log(`Quick Answer result: FAILED: ${(result as any).error}`)
              }
            }
          } else {
            performanceMonitor.endTimer('Quick Answer (Total)');
          }
        } else {
          performanceMonitor.endTimer('Quick Answer (Total)');
        }
      } catch (error) {
        performanceMonitor.endTimer('Quick Answer (Total)');
        console.error("Error in Quick Answer:", error)
      }
    }

    ShortcutsManager.register("CommandOrControl+D", quickAnswer)

    // Reset
    ShortcutsManager.register("CommandOrControl+R", () => {
      try {
        console.log("Command + R pressed. Canceling requests and resetting queues...")
        this.deps.processingHelper?.cancelOngoingRequests()
        this.deps.clearQueues()
        this.deps.setView("queue")

        const mainWindow = this.deps.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send("reset")
        }
      } catch (error) {
        console.error("Error in reset handler:", error)
      }
    })

    // Window Movement
    ShortcutsManager.register("CommandOrControl+Left", () => this.deps.moveWindowLeft())
    ShortcutsManager.register("CommandOrControl+Right", () => this.deps.moveWindowRight())
    ShortcutsManager.register("CommandOrControl+Down", () => this.deps.moveWindowDown())
    ShortcutsManager.register("CommandOrControl+Up", () => this.deps.moveWindowUp())
    ShortcutsManager.register("CommandOrControl+N", () => this.deps.centerWindow())

    // Window Visibility
    const toggleWindow = () => {
      console.log("Toggling window visibility")
      this.deps.toggleMainWindow()
    }
    ShortcutsManager.register("CommandOrControl+B", toggleWindow)
    ShortcutsManager.register("Alt+1", toggleWindow)
    ShortcutsManager.register("CommandOrControl+I", toggleWindow)

    // Quit
    ShortcutsManager.register("CommandOrControl+Q", () => app.quit())

    // Mode Toggle (MCQ vs Coding)
    ShortcutsManager.register("CommandOrControl+/", () => {
      const currentMode = configHelper.getMode()
      const newMode = currentMode === 'mcq' ? 'coding' : 'mcq'
      configHelper.setMode(newMode)
      
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        const modeInfo = newMode === 'mcq' 
          ? { mode: 'mcq', icon: '📝', description: 'MCQ Mode - Clean, concise answers' }
          : { mode: 'coding', icon: '💻', description: 'Coding Mode - Detailed explanations + minimal code' }
        
        mainWindow.webContents.send('mode-changed', modeInfo)
      }
      
      console.log(`Mode switched to: ${newMode}`)
    })

    // Opacity
    ShortcutsManager.register("CommandOrControl+[", () => this.adjustOpacity(-0.1))
    ShortcutsManager.register("CommandOrControl+]", () => this.adjustOpacity(0.1))

    // Zoom
    ShortcutsManager.register("CommandOrControl+-", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom - 0.5)
      }
    })

    ShortcutsManager.register("CommandOrControl+0", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.setZoomLevel(0)
      }
    })

    ShortcutsManager.register("CommandOrControl+=", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        const currentZoom = mainWindow.webContents.getZoomLevel()
        mainWindow.webContents.setZoomLevel(currentZoom + 0.5)
      }
    })

    // Model Cycling
    const cycleModels = () => {
      console.log("Cycling between Groq models...")
      try {
        const config = configHelper.loadConfig()
        const currentModel = config.groqModel || API.DEFAULT_GROQ_MODEL
        
        // Toggle between Kimi K2 and GPT-OSS text models
        const newModel = currentModel === API.GROQ_MODELS.KIMI_K2_TEXT 
          ? API.GROQ_MODELS.GPT_OSS_TEXT 
          : API.GROQ_MODELS.KIMI_K2_TEXT
        
        configHelper.updateConfig({ groqModel: newModel })
        
        const modelName = newModel === API.GROQ_MODELS.KIMI_K2_TEXT ? "Kimi K2 Instruct" : "GPT-OSS Text"
        console.log(`Switched to: ${modelName}`)

        const mainWindow = this.deps.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("model-changed", { model: newModel })
        }
      } catch (error) {
        console.error("Error cycling models:", error)
      }
    }

    ShortcutsManager.register("CommandOrControl+\\", cycleModels)
    ShortcutsManager.register("Alt+2", cycleModels)

    // Clipboard Utils
    ShortcutsManager.register("CommandOrControl+Shift+C", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("copy-html-to-clipboard")
      }
    })

    ShortcutsManager.register("CommandOrControl+Shift+D", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("copy-css-to-clipboard")
      }
    })

    ShortcutsManager.register("CommandOrControl+Backspace", () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("delete-last-screenshot")
      }
    })

    // Typing
    ShortcutsManager.register("CommandOrControl+Shift+V", () => this.clipboardTyper.typeClipboardContent())
    ShortcutsManager.register("CommandOrControl+Shift+X", () => this.clipboardTyper.stopTyping())
    ShortcutsManager.register("Alt+Backspace", () => this.clipboardTyper.togglePause())
    ShortcutsManager.register("F1", () => this.clipboardTyper.adjustTypingSpeed(-15)) // Faster
    ShortcutsManager.register("F2", () => this.clipboardTyper.adjustTypingSpeed(15)) // Slower

    app.on("will-quit", () => {
      ShortcutsManager.unregisterAll()
    })
  }
}
