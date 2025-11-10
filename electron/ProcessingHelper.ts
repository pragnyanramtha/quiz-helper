// ProcessingHelper.ts - SIMPLIFIED VERSION (MCQ + General Mode)
import fs from "node:fs"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import axios from "axios"
import { OpenAI } from "openai"
import { configHelper } from "./ConfigHelper"
import { ocrHelper } from "./OCRHelper"

// Gemini API interfaces
interface GeminiMessage {
  role: string;
  parts: Array<{
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    }
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class ProcessingHelper {
  private deps: IProcessingHelperDeps
  private screenshotHelper: ScreenshotHelper
  private geminiApiKey: string | null = null
  private groqClient: OpenAI | null = null

  // Conversation history for debugging
  private conversationHistory: Array<{ role: string, content: any }> = []
  private lastResponse: string = ""

  // AbortControllers
  private currentAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()
    this.initializeAIClients()

    configHelper.on('config-updated', () => {
      this.initializeAIClients()
    })
  }

  private initializeAIClients(): void {
    const config = configHelper.loadConfig()

    // Initialize Groq client if API key exists
    if (config.groqApiKey) {
      this.groqClient = new OpenAI({
        apiKey: config.groqApiKey,
        baseURL: "https://api.groq.com/openai/v1",
        timeout: 120000,
        maxRetries: 2
      })
      console.log("Groq client initialized")
    } else {
      this.groqClient = null
    }

    // Initialize Gemini API key if exists
    if (config.geminiApiKey) {
      this.geminiApiKey = config.geminiApiKey
      console.log("Gemini API key set")
    } else {
      this.geminiApiKey = null
    }
  }

  public cancelOngoingRequests(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort()
      this.currentAbortController = null
    }
  }

  // MAIN PROCESSING - Single API call
  public async processScreenshots() {
    const view = this.deps.getView()
    const mainQueue = this.deps.getScreenshotQueue()
    const extraQueue = this.deps.getExtraScreenshotQueue()

    console.log(`processScreenshots called - View: ${view}, Main queue: ${mainQueue.length}, Extra queue: ${extraQueue.length}`)

    // If we have screenshots in main queue, it's a new question (even if view is "solutions")
    if (mainQueue.length > 0) {
      console.log("Processing main queue (new question)")
      // Reset to queue view for new question
      this.deps.setView("queue")
      return await this.processInitialQuestion()
    }

    // If we're in solutions view and have extra screenshots, it's debugging
    if (view === "solutions" && extraQueue.length > 0) {
      console.log("Processing extra queue (debugging)")
      return await this.processDebugging()
    }

    console.log("No screenshots to process")
    return { success: false, error: "No screenshots to process" }
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

      // Check processing mode (MCQ or General)
      const config = configHelper.loadConfig()
      const mode = config.mode
      console.log(`Processing mode: ${mode} (${mode === "mcq" ? "Groq" : "Gemini"})`)

      // Both modes use image processing
      if (mainWindow) {
        // Send INITIAL_START event to switch UI to solutions view
        console.log("Sending INITIAL_START event to switch to solutions view")
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
        
        mainWindow.webContents.send("processing-status", {
          message: "Analyzing screenshots...",
          progress: 30
        })
      }

      // Load screenshots
      const imageDataList = await Promise.all(
        screenshots.map(async (screenshotPath) => {
          const imageBuffer = fs.readFileSync(screenshotPath)
          return imageBuffer.toString('base64')
        })
      )

      // Create abort controller
      this.currentAbortController = new AbortController()
      const signal = this.currentAbortController.signal

      const language = await this.getLanguage()

      // OPTIMIZED PROMPT - Efficient and accurate
      const systemPrompt = `You are an expert problem solver. Analyze carefully and provide complete, accurate answers.

RESPONSE FORMATS:

1. MULTIPLE CHOICE QUESTIONS (MCQ):
CRITICAL: Calculate/solve the problem yourself and give the CORRECT answer.
- Single answer MCQ: Choose ONE correct option (A/B/C/D)
- Multiple answer MCQ: Choose ALL correct options (e.g., "1, 3, 4")
- If you calculate a value, use YOUR calculated result (not necessarily the exact option text)
- OCR errors may cause option values to be slightly wrong - trust your calculation
- Example: If you calculate 6600 but option 3 shows "6500", answer "FINAL ANSWER: option 3) 6600"

Format (GROQ MODE):
FINAL ANSWER: option {number}) {your correct answer or statement}

Examples: 
- "FINAL ANSWER: option 2) True"
- "FINAL ANSWER: option 3) 6600" (your calculation, even if option says 6500)
- "FINAL ANSWER: option 1, 3, 4) Multiple correct answers"
- "FINAL ANSWER: option 1) 5050"

You may show brief reasoning if helpful (2-3 lines max), but ALWAYS end with "FINAL ANSWER: option X)" line with YOUR correct calculation.

2. FILL IN THE BLANKS:
Provide the missing word(s) or phrase(s) that complete the sentence correctly.

Format:
FINAL ANSWER: {word or phrase}

Example:
- "FINAL ANSWER: photosynthesis"
- "FINAL ANSWER: World War II"

3. SHORT ANSWER / Q&A:
Provide a clear, concise answer to the question (1-3 sentences).

Format:
\`\`\`text
Your answer here
\`\`\`

4. PYTHON QUESTION:
CRITICAL: Write MINIMAL, CONCISE code - prefer one-liners when possible.
- Use list comprehensions, lambda functions, and built-in functions
- Avoid unnecessary variables or verbose code
- If it can be done in one line, do it in one line
- Only add comments if absolutely necessary

Format:
Main concept: [Brief explanation]

\`\`\`python
# Minimal code solution - one-liner preferred
# Include examples from question if provided
\`\`\`

Examples of minimal Python:
- Sum: sum(range(1, n+1))
- Filter: [x for x in lst if x > 0]
- Map: list(map(lambda x: x**2, nums))

5. WEB DEVELOPMENT QUESTION:
⚠️ CRITICAL - FOLLOW INSTRUCTIONS EXACTLY ⚠️

STEP 1: READ EVERYTHING CAREFULLY
- Read ALL text in screenshots: question, guidelines, helping text, test cases, requirements
- If there's a design image, study it carefully - colors, spacing, layout, fonts, sizes
- Note EVERY requirement: "use Bootstrap", "3 images", "specific class names", etc.

STEP 2: ANALYZE REQUIREMENTS
- Bootstrap required? Include ALL Bootstrap classes mentioned (container, row, col-*, text-center, etc.)
- Specific elements? Count them: "3 images" = exactly 3 <img> tags
- Design image? Match it PIXEL-PERFECT: exact colors, spacing, fonts, sizes
- Test cases? Satisfy EVERY SINGLE ONE - they are requirements, not suggestions
- Naming conventions? Use what's specified OR industry standards (kebab-case for CSS classes)

STEP 3: INDUSTRY STANDARDS (if not specified otherwise)
CSS Naming:
- Use BEM methodology: .block__element--modifier
- Or semantic names: .header, .nav, .hero, .card, .footer
- Kebab-case: .main-content, .nav-item, .btn-primary
- NO generic names like .div1, .box, .thing

HTML Structure:
- Semantic tags: <header>, <nav>, <main>, <section>, <article>, <footer>
- Proper hierarchy: h1 > h2 > h3
- Accessibility: alt attributes, aria labels, proper form labels

CSS Best Practices:
- Mobile-first approach
- Flexbox or Grid for layouts
- CSS variables for colors/spacing (if appropriate)
- Consistent spacing units (rem, em, or px)

STEP 4: BOOTSTRAP IMPLEMENTATION (if required)
- Include ALL Bootstrap utility classes mentioned in test cases
- Common classes: container, row, col-*, d-flex, justify-content-*, align-items-*
- Responsive classes: d-none, d-md-block, col-md-6, etc.
- Text utilities: text-center, text-left, font-weight-bold
- Spacing: m-*, p-*, mt-*, mb-*, etc.
- Write Bootstrap-like CSS inline in <style> tag (NO CDN links)

STEP 5: DESIGN MATCHING (if image provided)
- Colors: Extract EXACT colors from image (use color picker mentally)
- Spacing: Match padding, margins, gaps exactly
- Typography: Match font sizes, weights, line heights
- Layout: Match exact positioning, alignment, structure
- Images: Use placeholder images with correct dimensions
- Responsive: Make it work on all screen sizes if shown

STEP 6: VALIDATION CHECKLIST
✓ All test case requirements included?
✓ All specified elements present? (count them!)
✓ Bootstrap classes all included? (if required)
✓ Design matches image? (if provided)
✓ Industry standard naming? (if not specified)
✓ All CSS inside <style> tag?
✓ No external links or CDN?
✓ Semantic HTML used?
✓ Accessible markup?

Format:
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solution</title>
    <style>
        /* ALL CSS here - Bootstrap-like styles if Bootstrap required */
        /* Use industry standard naming: .header, .nav, .hero, .card, etc. */
        /* Match design image EXACTLY if provided */
        /* Satisfy ALL test case requirements */
    </style>
</head>
<body>
    <!-- Semantic HTML structure -->
    <!-- ALL required elements (count them!) -->
    <!-- ALL Bootstrap classes (if required) -->
    <!-- Match design image EXACTLY (if provided) -->
</body>
</html>

REMEMBER:
- Instructions are LAW - follow them EXACTLY
- Test cases are REQUIREMENTS - satisfy ALL of them
- Design images are BLUEPRINTS - match them PIXEL-PERFECT
- Bootstrap classes are MANDATORY - include ALL mentioned
- Industry standards are DEFAULT - use them unless told otherwise

AUTO-DETECT the question type and respond accordingly. User's preferred language: ${language}

🔴 CRITICAL REMINDERS - READ BEFORE RESPONDING 🔴

WEB DEVELOPMENT:
1. FOLLOW INSTRUCTIONS EXACTLY - Every word matters
2. TEST CASES = REQUIREMENTS - Include ALL mentioned elements/classes
3. DESIGN IMAGES = BLUEPRINTS - Match colors, spacing, fonts EXACTLY
4. BOOTSTRAP - If mentioned, include ALL classes (container, row, col-*, d-*, text-*, etc.)
5. ELEMENT COUNT - "3 images" means EXACTLY 3 <img> tags, not 2, not 4
6. NAMING - Use industry standards (BEM, semantic names, kebab-case) unless specified
7. CSS LOCATION - ALL CSS inside <style> tag, NO external links
8. SEMANTIC HTML - Use <header>, <nav>, <main>, <section>, <footer>
9. ACCESSIBILITY - Include alt attributes, aria labels, proper structure
10. VALIDATION - Before responding, check: ✓ All requirements? ✓ All classes? ✓ Design match?

PYTHON:
- Minimal code - one-liners preferred
- Include examples from question if provided

GENERAL:
- Read helping instructions - they contain crucial hints
- Guidelines are MANDATORY, not optional
- If unsure, follow industry best practices`

      let responseText = ""

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Generating solution...",
          progress: 60
        })
      }

      // Call appropriate API based on mode with retry logic
      const maxRetries = 3
      let lastError: any = null

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (mode === "mcq") {
            // MCQ Mode - Use Groq
            if (!this.groqClient) {
              throw new Error("Groq API key not configured. Please add your Groq API key in settings.")
            }
            responseText = await this.callGroq(systemPrompt, imageDataList, signal)
          } else {
            // General Mode - Use Gemini
            if (!this.geminiApiKey) {
              throw new Error("Gemini API key not configured. Please add your Gemini API key in settings.")
            }
            responseText = await this.callGemini(systemPrompt, imageDataList, signal)
          }

          // Success - break retry loop
          break

        } catch (apiError: any) {
          lastError = apiError
          console.error(`API call attempt ${attempt}/${maxRetries} failed:`, apiError.message)

          // Check if it's a 503 or network error
          const is503 = apiError.response?.status === 503 || apiError.code === 'ERR_BAD_RESPONSE'
          const isNetworkError = apiError.code === 'ECONNRESET' || apiError.code === 'ETIMEDOUT'

          if ((is503 || isNetworkError) && attempt < maxRetries) {
            // Wait before retry (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
            console.log(`Waiting ${waitTime}ms before retry...`)

            if (mainWindow) {
              mainWindow.webContents.send("processing-status", {
                message: `API temporarily unavailable. Retrying (${attempt}/${maxRetries})...`,
                progress: 60
              })
            }

            await new Promise(resolve => setTimeout(resolve, waitTime))
          } else {
            // Non-retryable error or max retries reached
            throw apiError
          }
        }
      }

      // If we exhausted retries without success
      if (!responseText && lastError) {
        throw lastError
      }

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
      this.screenshotHelper.clearMainScreenshotQueue()
      
      this.deps.setView("solutions")
      console.log("Processing completed successfully, view set to solutions")
      return { success: true, data: parsedResponse }

    } catch (error: any) {
      console.error("Processing error:", error)

      // Reset view back to queue on error
      this.deps.setView("queue")

      // Send user-friendly error message
      if (mainWindow) {
        let errorMessage = "Processing failed"
        let errorTitle = "Error"

        if (error.response?.status === 503) {
          errorTitle = "Service Unavailable (503)"
          errorMessage = "API service temporarily unavailable. Please try again in a moment."
        } else if (error.code === 'ERR_BAD_RESPONSE') {
          errorTitle = "Bad Response"
          errorMessage = "API returned an error. Please try again."
        } else if (error.message?.includes('timeout')) {
          errorTitle = "Timeout"
          errorMessage = "Request timed out. Please try again."
        } else if (error.message) {
          errorMessage = error.message
        }

        mainWindow.webContents.send("processing-status", {
          message: errorMessage,
          progress: 0,
          error: true
        })

        // Send error notification toast
        mainWindow.webContents.send("show-error-notification", {
          title: errorTitle,
          message: errorMessage
        })

        // Also send reset-view to ensure UI is in sync
        mainWindow.webContents.send("reset-view")
      }

      return { success: false, error: error.message || "Processing failed" }
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
        // Send DEBUG_START event
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)
        
        mainWindow.webContents.send("processing-status", {
          message: "Analyzing errors...",
          progress: 30
        })
      }

      // Load error screenshots
      const imageDataList = await Promise.all(
        screenshots.map(async (screenshotPath) => {
          const imageBuffer = fs.readFileSync(screenshotPath)
          return imageBuffer.toString('base64')
        })
      )

      this.currentAbortController = new AbortController()
      const signal = this.currentAbortController.signal

      const config = configHelper.loadConfig()

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

      // Call API with retry logic
      const maxRetries = 3
      let lastError: any = null

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const mode = config.mode
          if (mode === "mcq") {
            // MCQ Mode - Use Groq
            if (!this.groqClient) {
              throw new Error("Groq API key not configured")
            }
            responseText = await this.callGroqWithHistory(debugPrompt, imageDataList, signal)
          } else {
            // General Mode - Use Gemini
            if (!this.geminiApiKey) {
              throw new Error("Gemini API key not configured")
            }
            responseText = await this.callGeminiWithHistory(debugPrompt, imageDataList, signal)
          }

          // Success - break retry loop
          break

        } catch (apiError: any) {
          lastError = apiError
          console.error(`Debug API call attempt ${attempt}/${maxRetries} failed:`, apiError.message)

          const is503 = apiError.response?.status === 503 || apiError.code === 'ERR_BAD_RESPONSE'
          const isNetworkError = apiError.code === 'ECONNRESET' || apiError.code === 'ETIMEDOUT'

          if ((is503 || isNetworkError) && attempt < maxRetries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
            console.log(`Waiting ${waitTime}ms before retry...`)

            if (mainWindow) {
              mainWindow.webContents.send("processing-status", {
                message: `API temporarily unavailable. Retrying (${attempt}/${maxRetries})...`,
                progress: 60
              })
            }

            await new Promise(resolve => setTimeout(resolve, waitTime))
          } else {
            throw apiError
          }
        }
      }

      if (!responseText && lastError) {
        throw lastError
      }

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
      this.screenshotHelper.clearExtraScreenshotQueue()

      return { success: true, data: parsedResponse }

    } catch (error: any) {
      console.error("Debug error:", error)

      // Keep view as "solutions" for debugging errors (user can retry with Ctrl+Enter)

      if (mainWindow) {
        let errorMessage = "Debugging failed"
        let errorTitle = "Debug Error"

        if (error.response?.status === 503) {
          errorTitle = "Service Unavailable (503)"
          errorMessage = "API service temporarily unavailable. Please try again in a moment."
        } else if (error.code === 'ERR_BAD_RESPONSE') {
          errorTitle = "Bad Response"
          errorMessage = "API returned an error. Please try again."
        } else if (error.message?.includes('timeout')) {
          errorTitle = "Timeout"
          errorMessage = "Request timed out. Please try again."
        } else if (error.message) {
          errorMessage = error.message
        }

        mainWindow.webContents.send("processing-status", {
          message: errorMessage,
          progress: 0,
          error: true
        })

        // Send error notification toast
        mainWindow.webContents.send("show-error-notification", {
          title: errorTitle,
          message: errorMessage
        })
      }

      return { success: false, error: error.message || "Debugging failed" }
    }
  }

  // API CALLS - Gemini and Groq only
  private async callGemini(systemPrompt: string, images: string[], signal: AbortSignal): Promise<string> {
    if (!this.geminiApiKey) throw new Error("Gemini not initialized")

    const config = configHelper.loadConfig()
    const messages: GeminiMessage[] = [{
      role: "user",
      parts: [
        { text: systemPrompt + "\n\nAnalyze these screenshots:" },
        ...images.map(img => ({
          inlineData: {
            mimeType: "image/png",
            data: img
          }
        }))
      ]
    }]

    const payload = {
      contents: messages,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 32000
      }
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel || "gemini-2.5-flash"}:generateContent?key=${this.geminiApiKey}`,
      payload,
      { 
        signal,
        headers: {
          'Content-Type': 'application/json'
        },
        transformRequest: [(data) => JSON.stringify(data)]
      }
    )

    const data = response.data as GeminiResponse
    
    // Validate response structure
    if (!data || !data.candidates || data.candidates.length === 0) {
      console.error("Invalid Gemini response structure:", JSON.stringify(data, null, 2))
      throw new Error("Gemini API returned invalid response structure. Please try again.")
    }
    
    if (!data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      console.error("Invalid Gemini response content:", JSON.stringify(data.candidates[0], null, 2))
      throw new Error("Gemini API returned empty response. Please try again.")
    }
    
    const text = data.candidates[0].content.parts[0].text
    if (!text) {
      console.error("Gemini response has no text:", JSON.stringify(data.candidates[0].content.parts[0], null, 2))
      throw new Error("Gemini API returned empty text. Please try again.")
    }
    
    return text
  }

  private async callGeminiWithHistory(prompt: string, images: string[], signal: AbortSignal): Promise<string> {
    if (!this.geminiApiKey) throw new Error("Gemini not initialized")

    const config = configHelper.loadConfig()

    // Gemini conversation format
    const messages: GeminiMessage[] = []

    // Add history
    if (this.lastResponse) {
      messages.push({
        role: "user",
        parts: [{ text: "Previous question (see screenshots)" }]
      })
      messages.push({
        role: "model",
        parts: [{ text: this.lastResponse }]
      })
    }

    // Add current debug request
    messages.push({
      role: "user",
      parts: [
        { text: prompt },
        ...images.map(img => ({
          inlineData: {
            mimeType: "image/png",
            data: img
          }
        }))
      ]
    })

    const payload = {
      contents: messages,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 32000
      }
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel || "gemini-2.5-flash"}:generateContent?key=${this.geminiApiKey}`,
      payload,
      { 
        signal,
        headers: {
          'Content-Type': 'application/json'
        },
        transformRequest: [(data) => JSON.stringify(data)]
      }
    )

    const data = response.data as GeminiResponse
    
    // Validate response structure
    if (!data || !data.candidates || data.candidates.length === 0) {
      console.error("Invalid Gemini response structure:", JSON.stringify(data, null, 2))
      throw new Error("Gemini API returned invalid response structure. Please try again.")
    }
    
    if (!data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      console.error("Invalid Gemini response content:", JSON.stringify(data.candidates[0], null, 2))
      throw new Error("Gemini API returned empty response. Please try again.")
    }
    
    const text = data.candidates[0].content.parts[0].text
    if (!text) {
      console.error("Gemini response has no text:", JSON.stringify(data.candidates[0].content.parts[0], null, 2))
      throw new Error("Gemini API returned empty text. Please try again.")
    }
    
    return text
  }

  // FAST API CALLS (kept for potential future use)
  private async callGeminiFast(prompt: string, signal: AbortSignal): Promise<string> {
    if (!this.geminiApiKey) throw new Error("Gemini not initialized")
    
    // Use a simpler, more reliable model for fast mode
    const model = "gemini-2.5-flash-lite"
    
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2, // Slightly higher for better reasoning
        maxOutputTokens: 100, // More tokens for complete answer
        candidateCount: 1
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`,
      payload,
      { 
        signal,
        headers: {
          'Content-Type': 'application/json'
        },
        transformRequest: [(data) => JSON.stringify(data)]
      }
    )

    const data = response.data as GeminiResponse
    return data.candidates[0].content.parts[0].text
  }

  // RESPONSE PARSING
  private parseResponse(response: string): any {
    // Detect question type and parse accordingly

    // MCQ Detection - look for "option X)" format (with or without letter)
    if (response.match(/option\s+\d+\)/i) || response.match(/FINAL ANSWER:/i)) {
      return this.parseMCQ(response)
    }

    // Web Dev Detection (HTML + CSS)
    if (response.includes('<html>') || response.includes('<!DOCTYPE html>')) {
      return this.parseWebDev(response)
    }

    // Python Detection
    if (response.includes('```python')) {
      return this.parsePython(response)
    }

    // Default: Text answer
    return this.parseText(response)
  }

  private parseMCQ(response: string): any {
    // Try to find "FINAL ANSWER:" first
    // Support multiple formats:
    // - "FINAL ANSWER: option 1) True" (NEW GROQ FORMAT - PRIORITY)
    // - "FINAL ANSWER: option 3) 6600"
    // - "FINAL ANSWER: option 1, 3, 4) Multiple answers"
    // - "FINAL ANSWER: A True" (legacy)
    // - "FINAL ANSWER: photosynthesis" (fill in the blank)
    
    // NEW FORMAT (PRIORITY): FINAL ANSWER: option X) value
    let finalAnswerMatch = response.match(/FINAL ANSWER:\s*option\s+([\d,\s]+)\)\s*(.+?)$/im)
    
    let answer = "Answer not found"
    
    if (finalAnswerMatch) {
      // New Groq format: "option 1) True" or "option 1, 3) Multiple"
      const optionNumbers = finalAnswerMatch[1].trim()
      const optionValue = finalAnswerMatch[2].trim()
      answer = `option ${optionNumbers}) ${optionValue}`
    } else {
      // Try legacy formats
      
      // Letter format: A, B, C, D
      finalAnswerMatch = response.match(/FINAL ANSWER:\s*([A-D](?:\s*,\s*[A-D])*)\s*(.*)$/im)
      
      if (finalAnswerMatch) {
        const firstCapture = finalAnswerMatch[1]
        const secondCapture = finalAnswerMatch[2]
        
        // Check if it's multiple choice format (A, B, C, D or combinations)
        if (firstCapture.match(/^[A-D](?:\s*,\s*[A-D])*$/i)) {
          const choices = firstCapture.toUpperCase()
          const value = secondCapture ? secondCapture.trim() : ""
          answer = value ? `${choices} ${value}` : choices
        }
      } else {
        // Fill in the blank or single word answer
        finalAnswerMatch = response.match(/FINAL ANSWER:\s*(.+?)$/im)
        
        if (finalAnswerMatch) {
          answer = finalAnswerMatch[1].trim()
        } else {
          // Fallback to finding any "option X)" pattern
          finalAnswerMatch = response.match(/option\s+([\d,\s]+)\)\s*(.*)$/im)
          
          if (finalAnswerMatch) {
            const optionNumbers = finalAnswerMatch[1].trim()
            const optionValue = finalAnswerMatch[2].trim()
            answer = `option ${optionNumbers}) ${optionValue}`
          }
        }
      }
    }
    
    const reasoningMatch = response.match(/```markdown\s*([\s\S]*?)```/)
    
    // Extract only the actual reasoning (after the prompt, before or including FINAL ANSWER)
    let actualResponse = response
    
    // Remove the system prompt if it appears in the response
    // Look for common prompt markers and remove everything before the actual answer
    const promptMarkers = [
      /1\. MULTIPLE CHOICE QUESTIONS[\s\S]*?FINAL ANSWER:/i,
      /RESPONSE FORMATS:[\s\S]*?(?=The question|Question:|FINAL ANSWER:)/i,
      /You are an expert[\s\S]*?(?=The question|Question:|FINAL ANSWER:)/i
    ]
    
    for (const marker of promptMarkers) {
      if (marker.test(actualResponse)) {
        // Extract everything after the prompt
        actualResponse = actualResponse.replace(marker, '')
        break
      }
    }
    
    // If we still have the prompt, try to find where the actual answer starts
    if (actualResponse.includes('MULTIPLE CHOICE QUESTIONS')) {
      // Find the last occurrence of a question-like pattern
      const questionStart = actualResponse.search(/(?:The question|Question:|Options?:|Which|What|How|Why|When|Where)/i)
      if (questionStart > 0) {
        actualResponse = actualResponse.substring(questionStart)
      }
    }
    
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : actualResponse.trim()
    
    // Format the response with highlighted final answer at the end
    let formattedCode = actualResponse.trim()
    if (!formattedCode.includes("FINAL ANSWER:")) {
      // If old format, add FINAL ANSWER section at the end
      formattedCode = formattedCode + `\n\n**FINAL ANSWER:** ${answer}`
    }

    return {
      question_type: "multiple_choice",
      answer: answer,
      reasoning: reasoning,
      code: formattedCode,
      thoughts: [reasoning],
      final_answer_highlight: answer // For UI to display prominently
    }
  }

  private parseWebDev(response: string): any {
    // Extract HTML (look for complete HTML document or just HTML tags)
    let htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*?<\/html>/i)
    if (!htmlMatch) {
      htmlMatch = response.match(/<html[\s\S]*?<\/html>/i)
    }
    const html = htmlMatch ? htmlMatch[0] : ""

    // Extract CSS - prioritize extracting from <style> tags since we told Gemini to put CSS there
    let css = ""

    // First, try to extract from <style> tags (this is where CSS should be)
    if (html) {
      const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
      const cssBlocks = []
      for (const match of styleMatches) {
        if (match[1] && match[1].trim()) {
          cssBlocks.push(match[1].trim())
        }
      }
      if (cssBlocks.length > 0) {
        css = cssBlocks.join('\n\n')
      }
    }

    // Fallback: Look for CSS after HTML (legacy format)
    if (!css && html) {
      const afterHTML = response.substring(response.indexOf('</html>') + 7)
      const afterHTMLTrimmed = afterHTML.trim()
      
      // Remove markdown code blocks if present
      const cssWithoutMarkdown = afterHTMLTrimmed
        .replace(/^```css\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
      
      if (cssWithoutMarkdown && !cssWithoutMarkdown.includes('<')) {
        css = cssWithoutMarkdown
      }
    }

    // Combine for display (backward compatibility)
    const code = html + (css ? "\n\n" + css : "")

    return {
      question_type: "web_dev",
      code: code,
      html: html,
      css: css,
      thoughts: ["Web development solution generated"],
      explanation: "HTML and CSS code generated"
    }
  }

  private parsePython(response: string): any {
    const conceptMatch = response.match(/Main concept:\s*(.+?)(?=\n|```)/i)
    const codeMatch = response.match(/```python\s*([\s\S]*?)```/)

    return {
      question_type: "python",
      code: codeMatch ? codeMatch[1].trim() : response,
      concept: conceptMatch ? conceptMatch[1].trim() : "Python solution",
      thoughts: [conceptMatch ? conceptMatch[1].trim() : "Python solution"],
      explanation: conceptMatch ? conceptMatch[1].trim() : "Python solution"
    }
  }

  private parseText(response: string): any {
    const textMatch = response.match(/```text\s*([\s\S]*?)```/)
    const text = textMatch ? textMatch[1].trim() : response

    return {
      question_type: "text",
      code: text,
      thoughts: [text],
      explanation: text
    }
  }

  private async getLanguage(): Promise<string> {
    return configHelper.getLanguage()
  }

  // GROQ API CALLS
  private async callGroq(systemPrompt: string, _images: string[], signal: AbortSignal): Promise<string> {
    if (!this.groqClient) throw new Error("Groq not initialized")

    const config = configHelper.loadConfig()
    
    // Note: Groq currently doesn't support vision models, so we'll use text-only mode
    // For image processing, we should use OCR first
    const extractedText = await ocrHelper.extractTextFromMultiple(
      this.deps.getScreenshotQueue()
    )
    
    // Enhanced prompt for Groq - split into system and user messages
    const systemMessage = `${systemPrompt}

CRITICAL FOR ACCURACY AND FORMAT:
- Calculate the correct answer yourself - don't just pick from options
- ALWAYS use format: "FINAL ANSWER: option {number}) {your answer}"
- For multiple answer MCQs, use: "option 1, 3, 4) Multiple answers"
- For fill in the blanks, provide the exact word/phrase needed
- For Q&A questions, give clear, concise answers (1-3 sentences)
- If you calculate 6600 but option says 6500, answer with YOUR calculation (6600)
- OCR may misread values - trust your math over the extracted text
- Prioritize CORRECTNESS over matching given options exactly
- Give the right answer even if it doesn't match any option perfectly

MANDATORY FORMAT EXAMPLES:
- "FINAL ANSWER: option 1) True"
- "FINAL ANSWER: option 3) 6600"
- "FINAL ANSWER: option 2) The correct statement"
- "FINAL ANSWER: option 1, 3) Multiple correct"`

    const userMessage = `Question from OCR:
${extractedText}`

    const response = await this.groqClient.chat.completions.create({
      model: config.groqModel || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      max_tokens: 8000, // Increased for complete responses
      temperature: 0.1 // Lower for more focused answers
    }, { signal })

    return response.choices[0].message.content || ""
  }

  private async callGroqWithHistory(prompt: string, _images: string[], signal: AbortSignal): Promise<string> {
    if (!this.groqClient) throw new Error("Groq not initialized")

    const config = configHelper.loadConfig()

    // Extract text from error screenshots
    const extractedText = await ocrHelper.extractTextFromMultiple(
      this.deps.getExtraScreenshotQueue()
    )

    // Build messages with history
    const messages: any[] = [
      { role: "system", content: "You are an expert debugging assistant." }
    ]

    // Add conversation history
    if (this.conversationHistory.length > 0) {
      messages.push({
        role: "assistant",
        content: this.lastResponse
      })
    }

    // Add current debug request
    messages.push({
      role: "user",
      content: `${prompt}\n\nExtracted text from error screenshots:\n\n${extractedText}`
    })

    const response = await this.groqClient.chat.completions.create({
      model: config.groqModel || "llama-3.3-70b-versatile",
      messages,
      max_tokens: 8000, // Increased for complete debugging responses
      temperature: 0.1 // Lower for more focused answers
    }, { signal })

    return response.choices[0].message.content || ""
  }

  // Fast Groq call (kept for potential future use)
  private async callGroqFast(prompt: string, signal: AbortSignal): Promise<string> {
    if (!this.groqClient) throw new Error("Groq not initialized")

    const config = configHelper.loadConfig()
    const response = await this.groqClient.chat.completions.create({
      model: config.groqModel || "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.1
    }, { signal })

    return response.choices[0].message.content || ""
  }
}
