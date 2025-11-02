// ProcessingHelper.ts - SIMPLIFIED VERSION
import fs from "node:fs"
import path from "node:path"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import * as axios from "axios"
import { BrowserWindow } from "electron"
import { OpenAI } from "openai"
import { configHelper } from "./ConfigHelper"
import Anthropic from '@anthropic-ai/sdk';

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
  private conversationHistory: Array<{role: string, content: any}> = []
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

    if (view === "queue") {
      // Initial question processing
      return await this.processInitialQuestion()
    } else if (view === "solutions") {
      // Debugging with conversation history
      return await this.processDebugging()
    }

    return { success: false, error: "Invalid view state" }
  }

  private async processInitialQuestion() {
    try {
      const mainWindow = this.deps.getMainWindow()
      const screenshots = this.deps.getScreenshotQueue()

      if (screenshots.length === 0) {
        return { success: false, error: "No screenshots to process" }
      }

      // Reset conversation for new question
      this.conversationHistory = []
      this.lastResponse = ""

      if (mainWindow) {
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
      const systemPrompt = `You are an expert in Math, Python, Web Development, and English. Analyze the screenshots and respond based on the question type you detect.

RESPONSE FORMATS:

1. MULTIPLE CHOICE QUESTION (MCQ):
Format:
option {number}/{letter}) {option text}

\`\`\`markdown
Brief reasoning explanation
Keep it concise
Around 5 lines
Explain why this is correct
\`\`\`

2. PYTHON QUESTION:
Format:
Main concept: [Brief explanation]

\`\`\`python
# Complete code solution
\`\`\`

3. WEB DEVELOPMENT QUESTION:
Format:
<html>
complete html code
</html>


body {
  css code
}
.class-name {
  more css
}

IMPORTANT: NO external links, NO CDN, use web-safe fonts only. Analyze design screenshots carefully and match colors, spacing, layout exactly.

4. ENGLISH/TEXT QUESTION:
Format:
\`\`\`text
Complete answer
\`\`\`

AUTO-DETECT the question type and respond accordingly. User's preferred language: ${language}`

      let responseText = ""

      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Generating solution...",
          progress: 60
        })
      }

      // Call appropriate API
      if (config.apiProvider === "openai") {
        responseText = await this.callOpenAI(systemPrompt, imageDataList, signal)
      } else if (config.apiProvider === "gemini") {
        responseText = await this.callGemini(systemPrompt, imageDataList, signal)
      } else if (config.apiProvider === "anthropic") {
        responseText = await this.callAnthropic(systemPrompt, imageDataList, signal)
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
        
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          parsedResponse
        )
      }

      this.deps.setView("solutions")
      return { success: true, data: parsedResponse }

    } catch (error: any) {
      console.error("Processing error:", error)
      return { success: false, error: error.message || "Processing failed" }
    }
  }

  private async processDebugging() {
    try {
      const mainWindow = this.deps.getMainWindow()
      const screenshots = this.deps.getExtraScreenshotQueue()

      if (screenshots.length === 0) {
        return { success: false, error: "No error screenshots provided" }
      }

      if (mainWindow) {
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

      // Call API with conversation history
      if (config.apiProvider === "openai") {
        responseText = await this.callOpenAIWithHistory(debugPrompt, imageDataList, signal)
      } else if (config.apiProvider === "gemini") {
        responseText = await this.callGeminiWithHistory(debugPrompt, imageDataList, signal)
      } else if (config.apiProvider === "anthropic") {
        responseText = await this.callAnthropicWithHistory(debugPrompt, imageDataList, signal)
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

      return { success: true, data: parsedResponse }

    } catch (error: any) {
      console.error("Debug error:", error)
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

    const response = await axios.default.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.solutionModel || "gemini-2.5-flash-lite"}:generateContent?key=${this.geminiApiKey}`,
      {
        contents: messages,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 32000
        }
      },
      { signal }
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

    const response = await axios.default.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.debuggingModel || "gemini-2.5-flash-lite"}:generateContent?key=${this.geminiApiKey}`,
      {
        contents: messages,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 32000
        }
      },
      { signal }
    )

    const data = response.data as GeminiResponse
    return data.candidates[0].content.parts[0].text
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
    
    // MCQ Detection
    if (response.match(/option\s+\d+\/[A-D]\)/i)) {
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
    const optionMatch = response.match(/option\s+(\d+)\/([A-D])\)\s*(.+?)(?=\n|$)/i)
    const reasoningMatch = response.match(/```markdown\s*([\s\S]*?)```/)
    
    return {
      question_type: "multiple_choice",
      answer: optionMatch ? `option ${optionMatch[1]}/${optionMatch[2]}) ${optionMatch[3]}` : "Answer not found",
      reasoning: reasoningMatch ? reasoningMatch[1].trim() : "No reasoning provided",
      code: response,
      thoughts: [reasoningMatch ? reasoningMatch[1].trim() : "No reasoning provided"]
    }
  }

  private parseWebDev(response: string): any {
    // Extract HTML
    const htmlMatch = response.match(/<html>[\s\S]*?<\/html>/i)
    const html = htmlMatch ? htmlMatch[0] : ""
    
    // Extract CSS (everything after HTML)
    const afterHTML = response.substring(response.indexOf('</html>') + 7)
    const css = afterHTML.trim()
    
    // Combine for display
    const code = html + "\n\n" + css
    
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
