// ProcessingHelper.ts - SIMPLIFIED VERSION
import fs from "node:fs"
import path from "node:path"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import axios from "axios"
import { BrowserWindow } from "electron"
import { OpenAI } from "openai"
import { configHelper } from "./ConfigHelper"
import Anthropic from '@anthropic-ai/sdk';
import { ocrHelper } from "./OCRHelper";

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
  private openaiClient: OpenAI | null = null
  private geminiApiKey: string | null = null
  private anthropicClient: Anthropic | null = null

  // Conversation history for debugging
  private conversationHistory: Array<{ role: string, content: any }> = []
  private lastResponse: string = ""

  // AbortControllers
  private currentAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()
    this.initializeAIClient()

    configHelper.on('config-updated', () => {
      this.initializeAIClient()
    })
  }

  private initializeAIClient(): void {
    const config = configHelper.loadConfig()

    if (config.apiProvider === "openai" && config.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: config.apiKey,
        timeout: 120000,
        maxRetries: 2
      })
      this.geminiApiKey = null
      this.anthropicClient = null
      console.log("OpenAI client initialized")
    } else if (config.apiProvider === "gemini" && config.apiKey) {
      this.geminiApiKey = config.apiKey
      this.openaiClient = null
      this.anthropicClient = null
      console.log("Gemini API key set")
    } else if (config.apiProvider === "anthropic" && config.apiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: config.apiKey,
        timeout: 120000,
        maxRetries: 2
      })
      this.openaiClient = null
      this.geminiApiKey = null
      console.log("Anthropic client initialized")
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
    const mainWindow = this.deps.getMainWindow()
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

      // Check processing mode
      const mode = configHelper.getMode()
      console.log(`Processing mode: ${mode}`)

      if (mode === "text") {
        // Fast text mode - use OCR
        return await this.processTextMode(screenshots, mainWindow)
      }

      // Image mode - original processing
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

      const config = configHelper.loadConfig()
      const language = await this.getLanguage()

      // SIMPLIFIED PROMPT - Single call
      const systemPrompt = `You are an expert in Math, Python, Web Development, and English. Analyze the screenshots CAREFULLY and respond based on the question type you detect.

CRITICAL: Read ALL text in the screenshots including:
- Main question/problem statement
- Helping instructions or hints
- Test cases or requirements (especially for web development)
- Example inputs/outputs
- Any constraints or specifications

RESPONSE FORMATS:

1. MULTIPLE CHOICE QUESTION (MCQ):
Format:
\`\`\`markdown
Brief reasoning explanation
Keep it concise
Around 5 lines
Explain why this is correct
\`\`\`

FINAL ANSWER: {A/B/C/D} {option value}

Example: "FINAL ANSWER: B True" or "FINAL ANSWER: C 4:3"

IMPORTANT: Always include the "FINAL ANSWER:" line at the END so users can quickly see the answer without reading the reasoning first.

2. PYTHON QUESTION:
Format:
Main concept: [Brief explanation]

\`\`\`python
# Complete code solution
\`\`\`

3. WEB DEVELOPMENT QUESTION:
CRITICAL INSTRUCTIONS:
- Read ALL text in screenshots carefully, including helping instructions and test case requirements
- If test cases mention specific HTML elements, Bootstrap classes, or CSS properties - YOU MUST include them ALL
- Common test requirements: container, row, col-md-*, text-center, d-md-*, d-none, specific HTML tags
- Match the design exactly: colors, spacing, layout, fonts
- NO external links, NO CDN links - use web-safe fonts only
- Include ALL required Bootstrap classes even if they seem redundant

Format:
<html>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solution</title>
    <style>
        /* Include Bootstrap-like styles inline if Bootstrap classes are required */
    </style>
</head>
<body>
    <!-- Complete HTML with ALL required elements and classes from test cases -->
</body>
</html>


/* Additional CSS if needed */
body {
  css code
}
.class-name {
  more css
}

4. ENGLISH/TEXT QUESTION:
Format:
\`\`\`text
Complete answer
\`\`\`

AUTO-DETECT the question type and respond accordingly. User's preferred language: ${language}

IMPORTANT REMINDERS:
- For web development: If test cases list required elements/classes (like "container", "row", "col-md-", "text-center", "d-md-", "d-none"), include ALL of them in your solution
- Read helping instructions carefully - they often contain crucial hints
- Match designs pixel-perfect when screenshots show visual layouts
- Test cases are requirements, not suggestions - satisfy every single one`

      let responseText = ""

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Generating solution...",
          progress: 60
        })
      }

      // Call appropriate API with retry logic
      const maxRetries = 3
      let lastError: any = null

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (config.apiProvider === "openai") {
            responseText = await this.callOpenAI(systemPrompt, imageDataList, signal)
          } else if (config.apiProvider === "gemini") {
            responseText = await this.callGemini(systemPrompt, imageDataList, signal)
          } else if (config.apiProvider === "anthropic") {
            responseText = await this.callAnthropic(systemPrompt, imageDataList, signal)
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

  private async processTextMode(screenshots: string[], mainWindow: BrowserWindow | null) {
    console.log("⚡ FAST TEXT MODE - Starting OCR extraction...")
    const startTime = Date.now()

    try {
      if (mainWindow) {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
        mainWindow.webContents.send("processing-status", {
          message: "Extracting text...",
          progress: 20
        })
      }

      // Extract text from screenshots using OCR
      const extractedText = await ocrHelper.extractTextFromMultiple(screenshots)
      console.log(`✓ OCR completed in ${Date.now() - startTime}ms`)
      console.log(`Extracted text length: ${extractedText.length} characters`)

      if (!extractedText || extractedText.length < 10) {
        throw new Error("Could not extract sufficient text from screenshots")
      }

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Getting answer...",
          progress: 50
        })
      }

      // Create abort controller
      this.currentAbortController = new AbortController()
      const signal = this.currentAbortController.signal

      const config = configHelper.loadConfig()

      // Clean extracted text - remove special characters that might break API
      const cleanedText = extractedText
        .replace(/[^\x20-\x7E\n]/g, ' ') // Remove non-ASCII characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[<>{}[\]]/g, '') // Remove brackets that might break JSON
        .trim()

      console.log(`Cleaned text: ${cleanedText.substring(0, 200)}...`)

      // Extract just the question and options - ignore noise
      const questionMatch = cleanedText.match(/(.+?\?)\s*([\s\S]+)/)
      const relevantText = questionMatch ? `${questionMatch[1]}\n${questionMatch[2]}` : cleanedText

      // ULTRA-FAST PROMPT - No reasoning, just answer
      const fastPrompt = `Answer this multiple choice question, Ignore text that's realted to the question, Respond with ONLY: FINAL ANSWER: {A/B/C/D}) {value}

Example: "FINAL ANSWER: B) True" or "FINAL ANSWER: C) 4:3"

${relevantText.substring(0, 500)}`

      let responseText = ""

      // Call API - single fast call
      if (config.apiProvider === "openai") {
        responseText = await this.callOpenAIFast(fastPrompt, signal)
      } else if (config.apiProvider === "gemini") {
        responseText = await this.callGeminiFast(fastPrompt, signal)
      } else if (config.apiProvider === "anthropic") {
        responseText = await this.callAnthropicFast(fastPrompt, signal)
      }

      const totalTime = Date.now() - startTime
      console.log(`⚡ TOTAL TEXT MODE TIME: ${totalTime}ms`)

      // Parse response
      const parsedResponse = this.parseMCQ(responseText)

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Complete!",
          progress: 100
        })

        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          parsedResponse
        )
      }

      // Clear the main queue
      this.screenshotHelper.clearMainScreenshotQueue()
      this.deps.setView("solutions")
      
      return { success: true, data: parsedResponse }

    } catch (error: any) {
      console.error("Text mode processing error:", error)
      
      // Log detailed error information
      if (error.response) {
        console.error("API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        })
      }
      
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Text mode failed, try image mode",
          progress: 0,
          error: true
        })
        mainWindow.webContents.send("reset-view")
      }

      return { success: false, error: error.message || "Text mode processing failed" }
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
          if (config.apiProvider === "openai") {
            responseText = await this.callOpenAIWithHistory(debugPrompt, imageDataList, signal)
          } else if (config.apiProvider === "gemini") {
            responseText = await this.callGeminiWithHistory(debugPrompt, imageDataList, signal)
          } else if (config.apiProvider === "anthropic") {
            responseText = await this.callAnthropicWithHistory(debugPrompt, imageDataList, signal)
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

  // API CALLS
  private async callOpenAI(systemPrompt: string, images: string[], signal: AbortSignal): Promise<string> {
    if (!this.openaiClient) throw new Error("OpenAI not initialized")

    const config = configHelper.loadConfig()
    const response = await this.openaiClient.chat.completions.create({
      model: config.solutionModel || "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze these screenshots and provide the solution:" },
            ...images.map(img => ({
              type: "image_url" as const,
              image_url: { url: `data:image/png;base64,${img}` }
            }))
          ]
        }
      ],
      max_tokens: 32000,
      temperature: 0.2
    }, { signal })

    return response.choices[0].message.content || ""
  }

  private async callOpenAIWithHistory(prompt: string, images: string[], signal: AbortSignal): Promise<string> {
    if (!this.openaiClient) throw new Error("OpenAI not initialized")

    const config = configHelper.loadConfig()

    // Build messages with history
    const messages: any[] = [
      { role: "system", content: "You are an expert debugging assistant." }
    ]

    // Add conversation history (simplified)
    if (this.conversationHistory.length > 0) {
      messages.push({
        role: "assistant",
        content: this.lastResponse
      })
    }

    // Add current debug request
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        ...images.map(img => ({
          type: "image_url" as const,
          image_url: { url: `data:image/png;base64,${img}` }
        }))
      ]
    })

    const response = await this.openaiClient.chat.completions.create({
      model: config.debuggingModel || "gpt-5",
      messages,
      max_tokens: 32000,
      temperature: 0.2
    }, { signal })

    return response.choices[0].message.content || ""
  }

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
      `https://generativelanguage.googleapis.com/v1beta/models/${config.solutionModel || "gemini-2.5-flash-lite"}:generateContent?key=${this.geminiApiKey}`,
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
      `https://generativelanguage.googleapis.com/v1beta/models/${config.debuggingModel || "gemini-2.5-flash-lite"}:generateContent?key=${this.geminiApiKey}`,
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

  // FAST API CALLS FOR TEXT MODE (No images, minimal tokens)
  private async callOpenAIFast(prompt: string, signal: AbortSignal): Promise<string> {
    if (!this.openaiClient) throw new Error("OpenAI not initialized")

    const config = configHelper.loadConfig()
    const response = await this.openaiClient.chat.completions.create({
      model: config.solutionModel || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100, // Minimal tokens for fast response
      temperature: 0.1 // Low temperature for accuracy
    }, { signal })

    return response.choices[0].message.content || ""
  }

  private async callGeminiFast(prompt: string, signal: AbortSignal): Promise<string> {
    if (!this.geminiApiKey) throw new Error("Gemini not initialized")

    const config = configHelper.loadConfig()
    
    // Use a simpler, more reliable model for fast text mode
    const model = "gemini-2.5-flash-lite"
    
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 50,
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

  private async callAnthropicFast(prompt: string, signal: AbortSignal): Promise<string> {
    if (!this.anthropicClient) throw new Error("Anthropic not initialized")

    const config = configHelper.loadConfig()
    const response = await this.anthropicClient.messages.create({
      model: config.solutionModel || "claude-3-5-haiku-20241022",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: [{ type: "text", text: prompt }]
      }],
      temperature: 0.1
    })

    return (response.content[0] as { type: 'text', text: string }).text
  }

  private async callAnthropic(systemPrompt: string, images: string[], signal: AbortSignal): Promise<string> {
    if (!this.anthropicClient) throw new Error("Anthropic not initialized")

    const config = configHelper.loadConfig()
    const response = await this.anthropicClient.messages.create({
      model: config.solutionModel || "claude-sonnet-4-20250514",
      max_tokens: 32000,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: systemPrompt + "\n\nAnalyze these screenshots:" },
          ...images.map(img => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: "image/png" as const,
              data: img
            }
          }))
        ]
      }],
      temperature: 0.2
    })

    return (response.content[0] as { type: 'text', text: string }).text
  }

  private async callAnthropicWithHistory(prompt: string, images: string[], signal: AbortSignal): Promise<string> {
    if (!this.anthropicClient) throw new Error("Anthropic not initialized")

    const config = configHelper.loadConfig()

    // Build messages with history
    const messages: any[] = []

    if (this.lastResponse) {
      messages.push({
        role: "user",
        content: [{ type: "text", text: "Previous question (see screenshots)" }]
      })
      messages.push({
        role: "assistant",
        content: [{ type: "text", text: this.lastResponse }]
      })
    }

    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        ...images.map(img => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: "image/png" as const,
            data: img
          }
        }))
      ]
    })

    const response = await this.anthropicClient.messages.create({
      model: config.debuggingModel || "claude-sonnet-4-20250514",
      max_tokens: 32000,
      messages,
      temperature: 0.2
    })

    return (response.content[0] as { type: 'text', text: string }).text
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
    // Try to find "FINAL ANSWER:" first (new format)
    // Support multiple formats:
    // - "FINAL ANSWER: A True"
    // - "FINAL ANSWER: B 4:3"
    // - "FINAL ANSWER: C Some text"
    // - "FINAL ANSWER: option 4) text" (legacy)
    // - "FINAL ANSWER: option 4" (legacy)
    
    // New format: FINAL ANSWER: {A/B/C/D} {value}
    let finalAnswerMatch = response.match(/FINAL ANSWER:\s*([A-D])\s+(.+?)$/im)
    
    // Legacy format: FINAL ANSWER: option X
    if (!finalAnswerMatch) {
      finalAnswerMatch = response.match(/FINAL ANSWER:\s*(?:option\s+)?([a-z0-9]+)(?:\/([a-z]))?\)?\s*(.*)$/im)
    }
    
    // Fallback to finding any "option X" pattern
    if (!finalAnswerMatch) {
      finalAnswerMatch = response.match(/option\s+([a-z0-9]+)(?:\/([a-z]))?\)?\s*(.*)$/im)
    }
    
    const reasoningMatch = response.match(/```markdown\s*([\s\S]*?)```/)
    
    let answer = "Answer not found"
    if (finalAnswerMatch) {
      const firstCapture = finalAnswerMatch[1]
      const secondCapture = finalAnswerMatch[2]
      const thirdCapture = finalAnswerMatch[3]
      
      // Check if it's new format (single letter A-D)
      if (firstCapture.match(/^[A-D]$/i) && secondCapture) {
        // New format: "A True" or "B 4:3"
        answer = `${firstCapture.toUpperCase()} ${secondCapture.trim()}`
      } else {
        // Legacy format
        const optionNum = firstCapture
        const optionLetter = secondCapture
        const optionText = thirdCapture ? thirdCapture.trim() : ""
        
        if (optionLetter) {
          answer = `option ${optionNum}/${optionLetter}${optionText ? `) ${optionText}` : ""}`
        } else {
          answer = `option ${optionNum}${optionText ? `) ${optionText}` : ""}`
        }
      }
    }  
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : "No reasoning provided"
    
    // Format the response with highlighted final answer at the end
    let formattedCode = response
    if (finalAnswerMatch && !response.includes("FINAL ANSWER:")) {
      // If old format, add FINAL ANSWER section at the end
      formattedCode = response + `\n\n**FINAL ANSWER:** ${answer}`
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

    // Extract CSS - look for CSS after HTML or in style blocks
    let css = ""

    // First try to get CSS after the HTML
    if (html) {
      const afterHTML = response.substring(response.indexOf('</html>') + 7)
      css = afterHTML.trim()
    }

    // If no CSS found after HTML, try to extract from style tags
    if (!css) {
      const styleMatch = response.match(/<style[\s\S]*?>([\s\S]*?)<\/style>/i)
      if (styleMatch) {
        css = styleMatch[1].trim()
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
}
