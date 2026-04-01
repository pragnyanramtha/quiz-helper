import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import { configHelper } from "./ConfigHelper"
import { ocrHelper } from "./OCRHelper"
import { ErrorHandler } from "./errors/ErrorHandler"
import { performanceMonitor } from "./utils/PerformanceMonitor"
import { GroqProvider } from "./processing/ai-providers/GroqProvider"
import { API } from "./constants/app-constants"
import { MCQParser, WebDevParser, PythonParser, CodingParser, TextParser } from "./processing/parsers/Parsers"
import { getSystemPrompt } from "./processing/prompts/system-prompts"
import { statusHelper } from "./StatusHelper"

export class ProcessingHelper {
  private deps: IProcessingHelperDeps
  private screenshotHelper: ScreenshotHelper | null = null

  // AI Providers
  private groqProvider: GroqProvider;

  // Parsers (initialized in constructor but not stored as we use them directly)
  // private parsers: ResponseParser[] = [];

  // Conversation history for debugging
  private conversationHistory: Array<{ role: string, content: any }> = []
  private lastResponse: string = ""

  // AbortControllers
  private currentAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    try {
      this.screenshotHelper = deps.getScreenshotHelper()
    } catch (error) {
      console.error('Error getting screenshot helper:', error)
    }

    this.groqProvider = new GroqProvider();

    // Parsers are used directly in parseResponse method, no need to store them
    // this.parsers = [
    //   new MCQParser(),
    //   new WebDevParser(),
    //   new PythonParser(),
    //   new TextParser() // Fallback
    // ];
  }

  public cancelOngoingRequests(): void {
    try {
      if (this.currentAbortController) {
        this.currentAbortController.abort()
        this.currentAbortController = null
      }
    } catch (error) {
      console.error('Error canceling ongoing requests:', error)
      this.currentAbortController = null
    }
  }

  // MAIN PROCESSING - Single API call
  public async processScreenshots() {
    performanceMonitor.startTimer('processScreenshots (Total)');
    try {
      const view = this.deps.getView()
      const mainQueue = this.deps.getScreenshotQueue() || []
      const extraQueue = this.deps.getExtraScreenshotQueue() || []

      console.log(`processScreenshots called - View: ${view}, Main queue: ${mainQueue.length}, Extra queue: ${extraQueue.length}`)

      // If we have screenshots in main queue, it's a new question (even if view is "solutions")
      if (mainQueue.length > 0) {
        console.log("Processing main queue (new question)")
        // Reset to queue view for new question
        this.deps.setView("queue")
        const result = await this.processInitialQuestion()
        performanceMonitor.endTimer('processScreenshots (Total)');
        return result;
      }

      // If we're in solutions view and have extra screenshots, it's debugging
      if (view === "solutions" && extraQueue.length > 0) {
        console.log("Processing extra queue (debugging)")
        const result = await this.processDebugging()
        performanceMonitor.endTimer('processScreenshots (Total)');
        return result;
      }

      console.log("No screenshots to process")
      performanceMonitor.endTimer('processScreenshots (Total)');
      return { success: false, error: "No screenshots to process" }
    } catch (error: any) {
      performanceMonitor.endTimer('processScreenshots (Total)');
      console.error('Error in processScreenshots:', error)
      return { success: false, error: error.message || "Processing failed" }
    }
  }

  private async processInitialQuestion() {
    const mainWindow = this.deps.getMainWindow()

    try {
      const screenshots = this.deps.getScreenshotQueue()
      console.log(`processInitialQuestion - Found ${screenshots.length} screenshots:`, screenshots)

      if (screenshots.length === 0) {
        console.log("ERROR: Screenshot queue is empty in processInitialQuestion")
        return { success: false, error: "No screenshots to process" }
      }

      // Reset conversation for new question
      this.conversationHistory = []
      this.lastResponse = ""

      const config = configHelper.loadConfig()
      let model = config.groqModel || API.DEFAULT_GROQ_MODEL
      
      // Check status mode and enforce restrictions
      const appMode = statusHelper.getMode()
      if (appMode === 'gpt') {
        // Force GPT-OSS mode
        model = API.GROQ_MODELS.GPT_OSS_TEXT
        console.log('[Status] Forced GPT-OSS mode (OCR required)')
      } else if (appMode === 'maverick' && model.includes('gpt-oss')) {
        // Legacy status mode: map to Kimi text model
        model = API.GROQ_MODELS.KIMI_K2_TEXT
        console.log('[Status] Legacy maverick mode mapped to Kimi text model (OCR required)')
      }
      
      console.log('Processing with text model + high-precision OCR')

      if (mainWindow) {
        console.log("Sending INITIAL_START event to switch to solutions view")
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
        
        mainWindow.webContents.send("processing-status", {
          message: "Extracting text with high-precision OCR...",
          progress: 30
        })
      }

      // All supported models are text-only, so OCR is always required.
      let extractedText = ""
      performanceMonitor.startTimer('OCR Extraction');
      try {
        extractedText = await ocrHelper.extractTextFromMultiple(screenshots)
        console.log(`OCR extracted ${extractedText.length} characters`)
        
        // Dev mode: Log extracted text
        if (process.env.NODE_ENV === 'development') {
          console.log('\n========== EXTRACTED TEXT (OCR) ==========')
          console.log(extractedText)
          console.log('==========================================\n')
        }
      } catch (error) {
        console.error('OCR failed:', error)
        throw new Error('OCR extraction failed')
      }
      performanceMonitor.endTimer('OCR Extraction');

      const imageDataList: string[] = []

      this.currentAbortController = new AbortController()
      const signal = this.currentAbortController.signal

      const language = configHelper.getLanguage()
      const mode = configHelper.getMode()

      // Get optimized system prompt based on mode
      const systemPrompt = getSystemPrompt(mode, language)

      let responseText = ""

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Generating solution...",
          progress: 60
        })
      }

      // Call appropriate API based on mode (fallback handled in GroqProvider)
      performanceMonitor.startTimer('API Call');

      // Use appropriate method based on model type
      try {
        performanceMonitor.startTimer('Groq Text API (with OCR)');
        responseText = await this.groqProvider.generateContent(systemPrompt, imageDataList, signal, undefined, extractedText, model);
        performanceMonitor.endTimer('Groq Text API (with OCR)');
      } catch (error: any) {
        // Handle rate limit fallback to OCR + GPT-OSS
        if (error.message === 'RATE_LIMIT_USE_OCR_FALLBACK') {
          // Check if fallback is allowed
          if (!statusHelper.isGptFallbackAllowed()) {
            console.error('[Status] GPT fallback not allowed in current mode');
            throw new Error(statusHelper.getMessage() || 'Rate limit reached. Fallback not available in current mode.');
          }
          
          console.log('[ProcessingHelper] Primary model rate-limited. Using OCR + GPT-OSS fallback...');
          
          if (mainWindow) {
            mainWindow.webContents.send("processing-status", {
              message: "Rate limited - using GPT-OSS fallback...",
              progress: 50
            })
          }
          
          // Extract text with OCR if not already done
          if (!extractedText) {
            performanceMonitor.startTimer('OCR Extraction (Fallback)');
            console.log('[ProcessingHelper] Extracting text with OCR for fallback...');
            extractedText = await ocrHelper.extractTextFromMultiple(screenshots)
            console.log(`[ProcessingHelper] OCR extracted ${extractedText.length} characters for fallback`)
            performanceMonitor.endTimer('OCR Extraction (Fallback)');
          }
          
          // Retry with GPT-OSS + OCR
          performanceMonitor.startTimer('Groq GPT-OSS Fallback (with OCR)');
          
          // Enhanced system message for OCR fallback
          const fallbackSystemMessage = `${systemPrompt}

⚠️ IMPORTANT: You are using OCR-extracted text as input (not direct image analysis).
- The text may have OCR errors or formatting issues
- Numbers/symbols might be misread (e.g., "0" vs "O", "1" vs "l")
- Be extra careful with calculations - verify numbers make sense
- If text seems garbled, use context to infer the correct meaning
- Double-check your work before providing the final answer`;

          responseText = await this.groqProvider.generateContent(
            fallbackSystemMessage, 
            [], // No images for text-only model
            signal, 
            undefined, 
            extractedText
          );
          performanceMonitor.endTimer('Groq GPT-OSS Fallback (with OCR)');
          
          // Notify user about fallback
          if (mainWindow) {
            mainWindow.webContents.send("show-notification", {
              title: "Using Fallback Model",
              message: "Primary model rate-limited. Using GPT-OSS fallback.",
              type: "warning"
            });
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }

      performanceMonitor.endTimer('API Call');

      // Store for debugging
      this.lastResponse = responseText
      this.conversationHistory.push({
        role: "user",
        content: "Screenshots provided"
      })
      this.conversationHistory.push({
        role: "assistant",
        content: responseText
      })

      // Parse response
      const parsedResponse = this.parseResponse(responseText)

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Complete!",
          progress: 100
        })

        console.log("Sending SOLUTION_SUCCESS event with data:", JSON.stringify(parsedResponse).substring(0, 200))
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          parsedResponse
        )
      }

      // Clear the main queue after successful processing
      if (this.screenshotHelper) {
        this.screenshotHelper.clearMainScreenshotQueue()
      }
      
      this.deps.setView("solutions")
      console.log("Processing completed successfully, view set to solutions")
      return { success: true, data: parsedResponse }

    } catch (error: any) {
      // Use standardized ErrorHandler
      this.deps.setView("queue")
      return ErrorHandler.handle(error, "processInitialQuestion", mainWindow || undefined)
    }
  }

  private async processDebugging() {
    const mainWindow = this.deps.getMainWindow()

    try {
      const screenshots = this.deps.getExtraScreenshotQueue()

      if (screenshots.length === 0) {
        return { success: false, error: "No error screenshots provided" }
      }

      if (mainWindow) {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)
        mainWindow.webContents.send("processing-status", {
          message: "Analyzing errors...",
          progress: 30
        })
      }

      const config = configHelper.loadConfig()
      let debugModel = config.groqModel || API.DEFAULT_GROQ_MODEL
      const appMode = statusHelper.getMode()
      if (appMode === 'gpt') {
        debugModel = API.GROQ_MODELS.GPT_OSS_TEXT
      } else if (appMode === 'maverick' && debugModel.includes('gpt-oss')) {
        debugModel = API.GROQ_MODELS.KIMI_K2_TEXT
      }

      // All supported models are text-only, so OCR is always required.
      let extractedText = ""
      performanceMonitor.startTimer('OCR Extraction (Debug)');
      try {
        extractedText = await ocrHelper.extractTextFromMultiple(screenshots)
        console.log(`OCR extracted ${extractedText.length} characters (debug mode)`)
        
        // Dev mode: Log extracted text
        if (process.env.NODE_ENV === 'development') {
          console.log('\n========== EXTRACTED TEXT (DEBUG OCR) ==========')
          console.log(extractedText)
          console.log('================================================\n')
        }
      } catch (error) {
        console.error('OCR failed in debug:', error)
        throw new Error('OCR extraction failed in debug mode')
      }
      performanceMonitor.endTimer('OCR Extraction (Debug)');

      const imageDataList: string[] = []

      this.currentAbortController = new AbortController()
      const signal = this.currentAbortController.signal

      // DEBUG PROMPT with conversation history
      const debugPrompt = `Previous response:
${this.lastResponse}

Now analyze these error screenshots and fix the issues. Respond in the same format as before, but with corrected code.`

      let responseText = ""

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Fixing errors...",
          progress: 60
        })
      }

      // Call API (fallback handled in GroqProvider)
      performanceMonitor.startTimer('Debug API Call');

      // Use Groq with history
      const history = this.conversationHistory.map(h => ({
          role: h.role,
          content: h.content
      }));

      try {
        if (this.groqProvider.generateContentWithHistory) {
          responseText = await this.groqProvider.generateContentWithHistory(debugPrompt, imageDataList, history, signal, extractedText, debugModel);
        } else {
            throw new Error("Groq provider does not support history");
        }
      } catch (error: any) {
        // Handle rate limit fallback to OCR + GPT-OSS
        if (error.message === 'RATE_LIMIT_USE_OCR_FALLBACK') {
          console.log('[ProcessingHelper] Primary model rate-limited in debug. Using OCR + GPT-OSS fallback...');
          
          if (mainWindow) {
            mainWindow.webContents.send("processing-status", {
              message: "Rate limited - using GPT-OSS fallback...",
              progress: 50
            })
          }
          
          // Extract text with OCR if not already done
          if (!extractedText) {
            performanceMonitor.startTimer('OCR Extraction (Debug Fallback)');
            console.log('[ProcessingHelper] Extracting text with OCR for debug fallback...');
            extractedText = await ocrHelper.extractTextFromMultiple(screenshots)
            console.log(`[ProcessingHelper] OCR extracted ${extractedText.length} characters for debug fallback`)
            performanceMonitor.endTimer('OCR Extraction (Debug Fallback)');
          }
          
          // Retry with GPT-OSS + OCR
          performanceMonitor.startTimer('Groq GPT-OSS Debug Fallback (with OCR)');
          
          // Enhanced debug prompt for OCR fallback
          const fallbackDebugPrompt = `${debugPrompt}

⚠️ IMPORTANT: You are using OCR-extracted text as input (not direct image analysis).
- The text may have OCR errors or formatting issues
- Be extra careful when analyzing error messages
- Double-check your fixes before providing the solution`;

          responseText = await this.groqProvider.generateContentWithHistory(
            fallbackDebugPrompt, 
            [], // No images for text-only model
            history,
            signal, 
            extractedText
          );
          performanceMonitor.endTimer('Groq GPT-OSS Debug Fallback (with OCR)');
          
          // Notify user about fallback
          if (mainWindow) {
            mainWindow.webContents.send("show-notification", {
              title: "Using Fallback Model",
              message: "Primary model rate-limited. Using GPT-OSS fallback for debugging.",
              type: "warning"
            });
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }

      performanceMonitor.endTimer('Debug API Call');

      // Update conversation
      this.lastResponse = responseText
      this.conversationHistory.push({
        role: "user",
        content: debugPrompt
      })
      this.conversationHistory.push({
        role: "assistant",
        content: responseText
      })

      const parsedResponse = this.parseResponse(responseText)

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Fixed!",
          progress: 100
        })

        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS,
          parsedResponse
        )
      }

      // Clear the extra queue after successful debugging
      if (this.screenshotHelper) {
        this.screenshotHelper.clearExtraScreenshotQueue()
      }

      return { success: true, data: parsedResponse }

    } catch (error: any) {
      // Use standardized ErrorHandler - but keep view as solutions
      return ErrorHandler.handle(error, "processDebugging", mainWindow || undefined)
    }
  }

  // RESPONSE PARSING
  private parseResponse(response: string): any {
    console.log('[ProcessingHelper] Parsing response, first 100 chars:', response.substring(0, 100))
    
    // Try each parser until one returns a specific type or fall back to TextParser
    const trimmedResponse = response.trim()
    
    // First, check if response is JSON format (for new JSON-based responses)
    if (trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}')) {
      console.log('[ProcessingHelper] Detected JSON format')
      try {
        const parsed = JSON.parse(trimmedResponse)
        
        // Check if it's a coding response
        if (parsed.explanation && parsed.language && parsed.code) {
          console.log('[ProcessingHelper] Using CodingParser for JSON response')
          return new CodingParser().parse(response)
        }
        
        // Check if it's an MCQ response
        if (parsed.reasoning && parsed.final_answer) {
          console.log('[ProcessingHelper] Using MCQParser for JSON response')
          return new MCQParser().parse(response)
        }
      } catch (e) {
        console.log('[ProcessingHelper] JSON parse failed:', e)
      }
    }

    // MCQ Detection (old format)
    if (response.match(/option\s+\d+\)/i) || response.match(/FINAL ANSWER:/i)) {
      console.log('[ProcessingHelper] Using MCQParser (old format)')
      return new MCQParser().parse(response)
    }

    // Web Dev Detection
    if (response.includes('<html>') || response.includes('<!DOCTYPE html>')) {
      console.log('[ProcessingHelper] Using WebDevParser')
      return new WebDevParser().parse(response)
    }

    // Coding Detection - supports all programming languages
    // Check for common code block markers
    const codingLanguages = [
      'python', 'javascript', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 
      'typescript', 'ruby', 'swift', 'kotlin', 'php', 'sql', 'r', 'scala',
      'perl', 'lua', 'dart', 'haskell', 'elixir', 'clojure', 'jsx', 'tsx'
    ]
    
    for (const lang of codingLanguages) {
      if (response.includes(`\`\`\`${lang}`)) {
        console.log('[ProcessingHelper] Using CodingParser for', lang)
        return new CodingParser().parse(response)
      }
    }

    // Fallback to Python parser for backward compatibility
    if (response.includes('```python')) {
      console.log('[ProcessingHelper] Using PythonParser')
      return new PythonParser().parse(response)
    }

    // Default
    console.log('[ProcessingHelper] Using TextParser (fallback)')
    return new TextParser().parse(response)
  }
}
