// ProcessingHelper.ts
import fs from "node:fs"
import path from "node:path"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import * as axios from "axios"
import { app, BrowserWindow, dialog } from "electron"
import { OpenAI } from "openai"
import { configHelper } from "./ConfigHelper"
import Anthropic from '@anthropic-ai/sdk';

// Interface for Gemini API requests
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
    finishReason: string;
  }>;
}
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
}
export class ProcessingHelper {
  private deps: IProcessingHelperDeps
  private screenshotHelper: ScreenshotHelper
  private openaiClient: OpenAI | null = null
  private geminiApiKey: string | null = null
  private anthropicClient: Anthropic | null = null

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()

    // Initialize AI client based on config
    this.initializeAIClient();

    // Listen for config changes to re-initialize the AI client
    configHelper.on('config-updated', () => {
      this.initializeAIClient();
    });
  }

  /**
   * Initialize or reinitialize the AI client with current config
   */
  private initializeAIClient(): void {
    try {
      const config = configHelper.loadConfig();

      if (config.apiProvider === "openai") {
        if (config.apiKey) {
          this.openaiClient = new OpenAI({
            apiKey: config.apiKey,
            timeout: 60000, // 60 second timeout
            maxRetries: 2   // Retry up to 2 times
          });
          this.geminiApiKey = null;
          this.anthropicClient = null;
          console.log("OpenAI client initialized successfully");
        } else {
          this.openaiClient = null;
          this.geminiApiKey = null;
          this.anthropicClient = null;
          console.warn("No API key available, OpenAI client not initialized");
        }
      } else if (config.apiProvider === "gemini") {
        // Gemini client initialization
        this.openaiClient = null;
        this.anthropicClient = null;
        if (config.apiKey) {
          this.geminiApiKey = config.apiKey;
          console.log("Gemini API key set successfully");
        } else {
          this.openaiClient = null;
          this.geminiApiKey = null;
          this.anthropicClient = null;
          console.warn("No API key available, Gemini client not initialized");
        }
      } else if (config.apiProvider === "anthropic") {
        // Reset other clients
        this.openaiClient = null;
        this.geminiApiKey = null;
        if (config.apiKey) {
          this.anthropicClient = new Anthropic({
            apiKey: config.apiKey,
            timeout: 60000,
            maxRetries: 2
          });
          console.log("Anthropic client initialized successfully");
        } else {
          this.openaiClient = null;
          this.geminiApiKey = null;
          this.anthropicClient = null;
          console.warn("No API key available, Anthropic client not initialized");
        }
      }
    } catch (error) {
      console.error("Failed to initialize AI client:", error);
      this.openaiClient = null;
      this.geminiApiKey = null;
      this.anthropicClient = null;
    }
  }

  private async waitForInitialization(
    mainWindow: BrowserWindow
  ): Promise<void> {
    let attempts = 0
    const maxAttempts = 50 // 5 seconds total

    while (attempts < maxAttempts) {
      const isInitialized = await mainWindow.webContents.executeJavaScript(
        "window.__IS_INITIALIZED__"
      )
      if (isInitialized) return
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }
    throw new Error("App failed to initialize after 5 seconds")
  }

  private async getCredits(): Promise<number> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return 999 // Unlimited credits in this version

    try {
      await this.waitForInitialization(mainWindow)
      return 999 // Always return sufficient credits to work
    } catch (error) {
      console.error("Error getting credits:", error)
      return 999 // Unlimited credits as fallback
    }
  }

  private async getLanguage(): Promise<string> {
    try {
      // Get language from config
      const config = configHelper.loadConfig();
      if (config.language) {
        return config.language;
      }

      // Fallback to window variable if config doesn't have language
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        try {
          await this.waitForInitialization(mainWindow)
          const language = await mainWindow.webContents.executeJavaScript(
            "window.__LANGUAGE__"
          )

          if (
            typeof language === "string" &&
            language !== undefined &&
            language !== null
          ) {
            return language;
          }
        } catch (err) {
          console.warn("Could not get language from window", err);
        }
      }

      // Default fallback
      return "python";
    } catch (error) {
      console.error("Error getting language:", error)
      return "python"
    }
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    const config = configHelper.loadConfig();

    // First verify we have a valid AI client
    if (config.apiProvider === "openai" && !this.openaiClient) {
      this.initializeAIClient();

      if (!this.openaiClient) {
        console.error("OpenAI client not initialized");
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.API_KEY_INVALID
        );
        return;
      }
    } else if (config.apiProvider === "gemini" && !this.geminiApiKey) {
      this.initializeAIClient();

      if (!this.geminiApiKey) {
        console.error("Gemini API key not initialized");
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.API_KEY_INVALID
        );
        return;
      }
    } else if (config.apiProvider === "anthropic" && !this.anthropicClient) {
      // Add check for Anthropic client
      this.initializeAIClient();

      if (!this.anthropicClient) {
        console.error("Anthropic client not initialized");
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.API_KEY_INVALID
        );
        return;
      }
    }

    const view = this.deps.getView()
    console.log("Processing screenshots in view:", view)

    if (view === "queue") {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
      const screenshotQueue = this.screenshotHelper.getScreenshotQueue()
      console.log("Processing main queue screenshots:", screenshotQueue)

      // Check if the queue is empty
      if (!screenshotQueue || screenshotQueue.length === 0) {
        console.log("No screenshots found in queue");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }

      // Check that files actually exist
      const existingScreenshots = screenshotQueue.filter(path => fs.existsSync(path));
      if (existingScreenshots.length === 0) {
        console.log("Screenshot files don't exist on disk");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }

      try {
        // Initialize AbortController
        this.currentProcessingAbortController = new AbortController()
        const { signal } = this.currentProcessingAbortController

        const screenshots = await Promise.all(
          existingScreenshots.map(async (path) => {
            try {
              return {
                path,
                preview: await this.screenshotHelper.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              };
            } catch (err) {
              console.error(`Error reading screenshot ${path}:`, err);
              return null;
            }
          })
        )

        // Filter out any nulls from failed screenshots
        const validScreenshots = screenshots.filter(Boolean);

        if (validScreenshots.length === 0) {
          throw new Error("Failed to load screenshot data");
        }

        const result = await this.processScreenshotsHelper(validScreenshots, signal)

        if (!result.success) {
          console.log("Processing failed:", result.error)
          if (result.error?.includes("API Key") || result.error?.includes("OpenAI") || result.error?.includes("Gemini")) {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.API_KEY_INVALID
            )
          } else {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
              result.error
            )
          }
          // Reset view back to queue on error
          console.log("Resetting view to queue due to error")
          this.deps.setView("queue")
          return
        }

        // Only set view to solutions if processing succeeded
        console.log("Setting view to solutions after successful processing")
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          result.data
        )
        this.deps.setView("solutions")
      } catch (error: any) {
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
          error
        )
        console.error("Processing error:", error)
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || "Server error. Please try again."
          )
        }
        // Reset view back to queue on error
        console.log("Resetting view to queue due to error")
        this.deps.setView("queue")
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view == 'solutions'
      const extraScreenshotQueue =
        this.screenshotHelper.getExtraScreenshotQueue()
      console.log("Processing extra queue screenshots:", extraScreenshotQueue)

      // Check if the extra queue is empty
      if (!extraScreenshotQueue || extraScreenshotQueue.length === 0) {
        console.log("No extra screenshots found in queue");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);

        return;
      }

      // Check that files actually exist
      const existingExtraScreenshots = extraScreenshotQueue.filter(path => fs.existsSync(path));
      if (existingExtraScreenshots.length === 0) {
        console.log("Extra screenshot files don't exist on disk");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }

      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)

      // Initialize AbortController
      this.currentExtraProcessingAbortController = new AbortController()
      const { signal } = this.currentExtraProcessingAbortController

      try {
        // Get all screenshots (both main and extra) for processing
        const allPaths = [
          ...this.screenshotHelper.getScreenshotQueue(),
          ...existingExtraScreenshots
        ];

        const screenshots = await Promise.all(
          allPaths.map(async (path) => {
            try {
              if (!fs.existsSync(path)) {
                console.warn(`Screenshot file does not exist: ${path}`);
                return null;
              }

              return {
                path,
                preview: await this.screenshotHelper.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              };
            } catch (err) {
              console.error(`Error reading screenshot ${path}:`, err);
              return null;
            }
          })
        )

        // Filter out any nulls from failed screenshots
        const validScreenshots = screenshots.filter(Boolean);

        if (validScreenshots.length === 0) {
          throw new Error("Failed to load screenshot data for debugging");
        }

        console.log(
          "Combined screenshots for processing:",
          validScreenshots.map((s) => s.path)
        )

        const result = await this.processExtraScreenshotsHelper(
          validScreenshots,
          signal
        )

        if (result.success) {
          this.deps.setHasDebugged(true)
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS,
            result.data
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            result.error
          )
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            "Extra processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            error.message
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  private async processScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const config = configHelper.loadConfig();
      const language = await this.getLanguage();
      const mainWindow = this.deps.getMainWindow();

      // Step 1: Extract problem info using AI Vision API (OpenAI or Gemini)
      const imageDataList = screenshots.map(screenshot => screenshot.data);

      // Update the user on progress
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Analyzing question from screenshots...",
          progress: 20
        });
      }

      let problemInfo;

      if (config.apiProvider === "openai") {
        // Verify OpenAI client
        if (!this.openaiClient) {
          this.initializeAIClient(); // Try to reinitialize

          if (!this.openaiClient) {
            return {
              success: false,
              error: "OpenAI API key not configured or invalid. Please check your settings."
            };
          }
        }

        // Use OpenAI for processing
        const messages = [
          {
            role: "system" as const,
            content: "You are an expert analyzer for Python and web development questions (HTML, CSS, JavaScript). Analyze the screenshot(s) carefully. For design screenshots: describe the visual layout, colors, fonts, spacing, and styling you see. Identify the question type and return information in VALID JSON format with these fields: question_text (include design description if it's a design screenshot), question_type (either 'problem_solution', 'multiple_choice', or 'missing_code'), existing_code (if any), choices (if multiple choice), missing_parts (if missing code type), design_details (if it's a design recreation task). CRITICAL: Return ONLY valid JSON. Escape all special characters properly. Do not include any text before or after the JSON. Do not include code blocks or markdown."
          },
          {
            role: "user" as const,
            content: [
              {
                type: "text" as const,
                text: `Analyze this Python/web development question from the screenshots. Identify if it's: 1) Problem & Solution (needs code implementation), 2) Multiple Choice (select from options), or 3) Missing Code (fill in blanks). Return in JSON format. Language: ${language}.`
              },
              ...imageDataList.map(data => ({
                type: "image_url" as const,
                image_url: { url: `data:image/png;base64,${data}` }
              }))
            ]
          }
        ];

        // Send to OpenAI Vision API
        const extractionResponse = await this.openaiClient.chat.completions.create({
          model: config.extractionModel || "gpt-5",
          messages: messages,
          max_tokens: 32000,
          temperature: 0.2
        });

        // Parse the response
        try {
          const responseText = extractionResponse.choices[0].message.content;
          // Handle when OpenAI might wrap the JSON in markdown code blocks
          const jsonText = responseText.replace(/```json|```/g, '').trim();
          problemInfo = JSON.parse(jsonText);
        } catch (error) {
          console.error("Error parsing OpenAI response:", error);
          return {
            success: false,
            error: "Failed to parse question information. Please try again or use clearer screenshots."
          };
        }
      } else if (config.apiProvider === "gemini") {
        // Use Gemini API
        if (!this.geminiApiKey) {
          return {
            success: false,
            error: "Gemini API key not configured. Please check your settings."
          };
        }

        try {
          // Create Gemini message structure
          const geminiMessages: GeminiMessage[] = [
            {
              role: "user",
              parts: [
                {
                  text: `You are a Python and web development question analyzer. Analyze the screenshots and extract the question information. Identify the question type and return information in JSON format with these fields: question_text, question_type (either 'problem_solution', 'multiple_choice', or 'missing_code'), existing_code (if any), choices (if multiple choice), missing_parts (if missing code type). Just return the structured JSON without any other text. Language: ${language}.`
                },
                ...imageDataList.map(data => ({
                  inlineData: {
                    mimeType: "image/png",
                    data: data
                  }
                }))
              ]
            }
          ];

          // Make API request to Gemini
          const response = await axios.default.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.extractionModel || "gemini-2.5-flash-lite"}:generateContent?key=${this.geminiApiKey}`,
            {
              contents: geminiMessages,
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 32000
              }
            },
            { signal }
          );

          const responseData = response.data as GeminiResponse;

          if (!responseData.candidates || responseData.candidates.length === 0) {
            throw new Error("Empty response from Gemini API");
          }

          const responseText = responseData.candidates[0].content.parts[0].text;

          // Handle when Gemini might wrap the JSON in markdown code blocks
          let jsonText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

          // Try to extract JSON if it's embedded in other text
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }

          // Log the JSON for debugging
          console.log("Attempting to parse JSON:", jsonText.substring(0, 500) + "...");

          problemInfo = JSON.parse(jsonText);
        } catch (error: any) {
          console.error("Error using Gemini API for extraction:", error);
          console.error("Gemini API error details:", error.response?.data || error.message);

          // If JSON parsing failed, try to use a simpler extraction
          if (error.message && error.message.includes("JSON")) {
            console.log("JSON parsing failed, using fallback extraction");
            // Create a simple problem info for the user to continue
            problemInfo = {
              question_text: "Problem extracted from screenshots",
              question_type: "problem_solution",
              existing_code: "",
              choices: [],
              missing_parts: ""
            };
            // Continue processing instead of returning error
          } else {
            let errorMessage = "Failed to process with Gemini API.";
            if (error.response?.data?.error?.message) {
              errorMessage += ` Error: ${error.response.data.error.message}`;
            } else if (error.message) {
              errorMessage += ` Error: ${error.message}`;
            }

            return {
              success: false,
              error: errorMessage
            };
          }
        }
      } else if (config.apiProvider === "anthropic") {
        if (!this.anthropicClient) {
          return {
            success: false,
            error: "Anthropic API key not configured. Please check your settings."
          };
        }

        try {
          const messages = [
            {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
                  text: `Analyze this Python/web development question from the screenshots. Identify if it's: 1) Problem & Solution (needs code implementation), 2) Multiple Choice (select from options), or 3) Missing Code (fill in blanks). Return in JSON format with fields: question_text, question_type, existing_code, choices, missing_parts. Language: ${language}.`
                },
                ...imageDataList.map(data => ({
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: "image/png" as const,
                    data: data
                  }
                }))
              ]
            }
          ];

          const response = await this.anthropicClient.messages.create({
            model: config.extractionModel || "claude-sonnet-4-20250514",
            max_tokens: 32000,
            messages: messages,
            temperature: 0.2
          });

          const responseText = (response.content[0] as { type: 'text', text: string }).text;
          const jsonText = responseText.replace(/```json|```/g, '').trim();
          problemInfo = JSON.parse(jsonText);
        } catch (error: any) {
          console.error("Error using Anthropic API:", error);

          // Add specific handling for Claude's limitations
          if (error.status === 429) {
            return {
              success: false,
              error: "Claude API rate limit exceeded. Please wait a few minutes before trying again."
            };
          } else if (error.status === 413 || (error.message && error.message.includes("token"))) {
            return {
              success: false,
              error: "Your screenshots contain too much information for Claude to process. Switch to OpenAI or Gemini in settings which can handle larger inputs."
            };
          }

          return {
            success: false,
            error: "Failed to process with Anthropic API. Please check your API key or try again later."
          };
        }
      }

      // Update the user on progress
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Question analyzed successfully. Preparing to generate answer...",
          progress: 40
        });
      }

      // Store problem info in AppState
      this.deps.setProblemInfo(problemInfo);

      // Send first success event
      if (mainWindow) {
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
          problemInfo
        );

        // Generate solutions after successful extraction
        const solutionsResult = await this.generateSolutionsHelper(signal);
        if (solutionsResult.success) {
          // Clear any existing extra screenshots before transitioning to solutions view
          this.screenshotHelper.clearExtraScreenshotQueue();

          // Final progress update
          mainWindow.webContents.send("processing-status", {
            message: "Answer generated successfully",
            progress: 100
          });

          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
            solutionsResult.data
          );
          return { success: true, data: solutionsResult.data };
        } else {
          throw new Error(
            solutionsResult.error || "Failed to generate solutions"
          );
        }
      }

      return { success: false, error: "Failed to process screenshots" };
    } catch (error: any) {
      // If the request was cancelled, don't retry
      if (axios.isCancel(error)) {
        return {
          success: false,
          error: "Processing was canceled by the user."
        };
      }

      // Handle OpenAI API errors specifically
      if (error?.response?.status === 401) {
        return {
          success: false,
          error: "Invalid OpenAI API key. Please check your settings."
        };
      } else if (error?.response?.status === 429) {
        return {
          success: false,
          error: "OpenAI API rate limit exceeded or insufficient credits. Please try again later."
        };
      } else if (error?.response?.status === 500) {
        return {
          success: false,
          error: "OpenAI server error. Please try again later."
        };
      }

      console.error("API Error Details:", error);
      return {
        success: false,
        error: error.message || "Failed to process screenshots. Please try again."
      };
    }
  }

  private async generateSolutionsHelper(signal: AbortSignal) {
    try {
      const problemInfo = this.deps.getProblemInfo();
      const language = await this.getLanguage();
      const config = configHelper.loadConfig();
      const mainWindow = this.deps.getMainWindow();

      if (!problemInfo) {
        throw new Error("No problem info available");
      }

      // Update progress status
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Generating answer and code solution...",
          progress: 60
        });
      }

      // Create prompt based on question type
      let promptText = "";

      if (problemInfo.question_type === "multiple_choice") {
        promptText = `
Answer this multiple choice question:

QUESTION:
${problemInfo.question_text}

CHOICES:
${problemInfo.choices || "No choices provided"}

EXISTING CODE (if any):
${problemInfo.existing_code || "No existing code"}

IMPORTANT: Return your response as a valid JSON object with this exact structure:
{
  "answer": "Option number and letter, e.g., Option 2: B",
  "reasoning": "Brief explanation why this is correct",
  "code": "Show the correct answer in a code snippet"
}

Keep the reasoning short and focused. Language: ${language}
`;
      } else if (problemInfo.question_type === "missing_code") {
        promptText = `
Fill in the missing code parts:

QUESTION:
${problemInfo.question_text}

CODE WITH MISSING PARTS:
${problemInfo.existing_code || "No code provided"}

MISSING PARTS TO FILL:
${problemInfo.missing_parts || "Identify what's missing"}

IMPORTANT: Return your response as a valid JSON object with this exact structure:
{
  "missing_parts": "What should go in the blank spaces",
  "explanation": "Brief explanation of the solution",
  "code": "Complete code with all missing parts filled in"
}

Language: ${language}
`;
      } else {
        // Default to problem_solution type
        const isWebDev = language.toLowerCase().includes('html') || language.toLowerCase().includes('css') || language.toLowerCase().includes('javascript') || language.toLowerCase().includes('web');

        promptText = `
Solve this ${isWebDev ? 'web development' : 'programming'} problem:

${isWebDev ? 'NOTE: If the screenshots show a website design/layout, your task is to RECREATE that exact design in HTML/CSS. Analyze the images carefully for colors, fonts, spacing, layout, buttons, and all visual elements.\n' : ''}
QUESTION:
${problemInfo.question_text}

EXISTING CODE (if any):
${problemInfo.existing_code || "No existing code provided"}

${isWebDev ? `
CRITICAL HTML/CSS REQUIREMENTS - FOLLOW EXACTLY:
- ANALYZE THE SCREENSHOT(S) CAREFULLY: If the question includes design images, recreate the exact layout, colors, spacing, fonts, and styling you see
- CHECK THE <body> TAG: If there are animation instructions or additional requirements in the existing code's <body> tag, implement them
- Include ALL CSS inside <style> tags in the <head> section
- ABSOLUTELY NO EXTERNAL LINKS: No Bootstrap CDN, no Google Fonts, no external CSS/JS files
- NO <link> tags to external resources
- NO <script> tags to external libraries
- Write PURE HTML/CSS only - completely self-contained
- PREFER BOOTSTRAP APPROACH: Write Bootstrap-style CSS classes yourself (container, row, col, btn, card, etc.)
- Use STANDARD CSS CLASS NAMING: Follow industry conventions (BEM, Bootstrap naming, or common patterns)
  * Examples: .container, .row, .col, .btn, .btn-primary, .card, .card-body, .navbar, .hero-section
  * Use kebab-case for multi-word classes: .hero-section, .nav-item, .footer-links
  * Avoid random or unclear names like .box1, .div2, .thing
- If you need custom fonts, use web-safe fonts (Arial, Helvetica, Georgia, etc.)
- Write complete, self-contained HTML that works when copied directly into a .html file
- Match the design from the screenshot as closely as possible (colors, fonts, spacing, layout)
- Make sure all HTML tags are properly closed
- Include proper DOCTYPE, html, head, and body tags
- Use semantic HTML elements (header, nav, main, section, footer, etc.)
- Add responsive design with media queries if the design suggests it
- Test that the code is syntactically correct and renders properly
- The HTML must work OFFLINE with NO internet connection
` : ''}

IMPORTANT: Return your response as a valid JSON object with this exact structure:
{
  "explanation": "Brief explanation of the approach",
  "code": "${isWebDev ? 'Complete, working HTML with embedded CSS in <style> tags' : 'Clean, simple code solution without comments'}"
}

If there's existing code, continue from it by adding required lines or fixing bugs. Keep the code simple and clean without comments. Language: ${language}
`;
      }

      let responseContent;

      if (config.apiProvider === "openai") {
        // OpenAI processing
        if (!this.openaiClient) {
          return {
            success: false,
            error: "OpenAI API key not configured. Please check your settings."
          };
        }

        // Send to OpenAI API
        const solutionResponse = await this.openaiClient.chat.completions.create({
          model: config.solutionModel || "gpt-5",
          messages: [
            { role: "system", content: "You are an expert in Python and web development (HTML, CSS, JavaScript). For HTML/CSS questions: Write PURE HTML/CSS with NO external dependencies. NEVER use CDN links. ALL CSS must be embedded in <style> tags. PREFER BOOTSTRAP-STYLE CSS: Write Bootstrap classes yourself (container, row, col, btn, card, navbar, etc.). Use STANDARD CSS NAMING CONVENTIONS: Follow industry patterns like BEM or Bootstrap naming (kebab-case, semantic names). Check <body> tag for animation instructions. Use web-safe fonts only. The HTML must work OFFLINE. For design screenshots: CAREFULLY ANALYZE and recreate the EXACT design - match colors, fonts, spacing, layout precisely. Write complete, self-contained HTML. For other languages: provide clean, functional code." },
            { role: "user", content: promptText }
          ],
          max_tokens: 32000,
          temperature: 0.2
        });

        responseContent = solutionResponse.choices[0].message.content;
      } else if (config.apiProvider === "gemini") {
        // Gemini processing
        if (!this.geminiApiKey) {
          return {
            success: false,
            error: "Gemini API key not configured. Please check your settings."
          };
        }

        try {
          // Create Gemini message structure
          const geminiMessages = [
            {
              role: "user",
              parts: [
                {
                  text: `You are an expert in Python and web development (HTML, CSS, JavaScript). For HTML/CSS questions: Write PURE HTML/CSS with NO external dependencies. NEVER use CDN links. ALL CSS must be embedded in <style> tags. PREFER BOOTSTRAP-STYLE CSS: Write Bootstrap classes yourself (container, row, col, btn, card, navbar, etc.). Use STANDARD CSS NAMING CONVENTIONS: Follow industry patterns like BEM or Bootstrap naming (kebab-case, semantic names). Check <body> tag for animation instructions. Use web-safe fonts only. The HTML must work OFFLINE. For design screenshots: CAREFULLY ANALYZE and recreate the EXACT design - match colors, fonts, spacing, layout precisely. Write complete, self-contained HTML. For other languages: provide clean, functional code:\n\n${promptText}`
                }
              ]
            }
          ];

          // Make API request to Gemini
          const response = await axios.default.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.solutionModel || "gemini-2.5-flash-lite"}:generateContent?key=${this.geminiApiKey}`,
            {
              contents: geminiMessages,
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 32000
              }
            },
            { signal }
          );

          const responseData = response.data as GeminiResponse;

          if (!responseData.candidates || responseData.candidates.length === 0) {
            throw new Error("Empty response from Gemini API");
          }

          responseContent = responseData.candidates[0].content.parts[0].text;
        } catch (error: any) {
          console.error("Error using Gemini API for solution:", error);
          console.error("Gemini API error details:", error.response?.data || error.message);

          let errorMessage = "Failed to generate solution with Gemini API.";
          if (error.response?.data?.error?.message) {
            errorMessage += ` Error: ${error.response.data.error.message}`;
          } else if (error.message) {
            errorMessage += ` Error: ${error.message}`;
          }

          return {
            success: false,
            error: errorMessage
          };
        }
      } else if (config.apiProvider === "anthropic") {
        // Anthropic processing
        if (!this.anthropicClient) {
          return {
            success: false,
            error: "Anthropic API key not configured. Please check your settings."
          };
        }

        try {
          const messages = [
            {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
                  text: `You are an expert in Python and web development (HTML, CSS, JavaScript). For HTML/CSS questions: Write PURE HTML/CSS with NO external dependencies. NEVER use CDN links. ALL CSS must be embedded in <style> tags. PREFER BOOTSTRAP-STYLE CSS: Write Bootstrap classes yourself (container, row, col, btn, card, navbar, etc.). Use STANDARD CSS NAMING CONVENTIONS: Follow industry patterns like BEM or Bootstrap naming (kebab-case, semantic names). Check <body> tag for animation instructions. Use web-safe fonts only. The HTML must work OFFLINE. For design screenshots: CAREFULLY ANALYZE and recreate the EXACT design - match colors, fonts, spacing, layout precisely. Write complete, self-contained HTML. For other languages: provide clean, functional code:\n\n${promptText}`
                }
              ]
            }
          ];

          // Send to Anthropic API
          const response = await this.anthropicClient.messages.create({
            model: config.solutionModel || "claude-sonnet-4-20250514",
            max_tokens: 32000,
            messages: messages,
            temperature: 0.2
          });

          responseContent = (response.content[0] as { type: 'text', text: string }).text;
        } catch (error: any) {
          console.error("Error using Anthropic API for solution:", error);

          // Add specific handling for Claude's limitations
          if (error.status === 429) {
            return {
              success: false,
              error: "Claude API rate limit exceeded. Please wait a few minutes before trying again."
            };
          } else if (error.status === 413 || (error.message && error.message.includes("token"))) {
            return {
              success: false,
              error: "Your screenshots contain too much information for Claude to process. Switch to OpenAI or Gemini in settings which can handle larger inputs."
            };
          }

          return {
            success: false,
            error: "Failed to generate solution with Anthropic API. Please check your API key or try again later."
          };
        }
      }

      // Try to parse JSON response first
      let formattedResponse;
      let parsedJSON = null;

      try {
        // Try to extract JSON from markdown code blocks or direct JSON
        const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/) || responseContent.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : responseContent.trim();
        parsedJSON = JSON.parse(jsonText);
      } catch (error) {
        console.log("Failed to parse JSON response, falling back to text parsing");
      }

      if (parsedJSON) {
        // Use JSON response
        if (problemInfo.question_type === "multiple_choice") {
          formattedResponse = {
            code: parsedJSON.code || "",
            thoughts: [parsedJSON.answer || "Answer not found", parsedJSON.reasoning || "No reasoning provided"],
            answer: parsedJSON.answer || "Answer not found",
            reasoning: parsedJSON.reasoning || "No reasoning provided",
            question_type: "multiple_choice"
          };
        } else if (problemInfo.question_type === "missing_code") {
          formattedResponse = {
            code: parsedJSON.code || "",
            thoughts: [parsedJSON.missing_parts || "Missing parts not identified", parsedJSON.explanation || "No explanation provided"],
            missing_parts: parsedJSON.missing_parts || "Missing parts not identified",
            explanation: parsedJSON.explanation || "No explanation provided",
            question_type: "missing_code"
          };
        } else {
          formattedResponse = {
            code: parsedJSON.code || "",
            thoughts: [parsedJSON.explanation || "Solution provided"],
            explanation: parsedJSON.explanation || "Solution provided",
            question_type: "problem_solution"
          };
        }
      } else {
        // Fallback to text parsing
        const codeMatch = responseContent.match(/```(?:\w+)?\s*([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1].trim() : responseContent;

        if (problemInfo.question_type === "multiple_choice") {
          const answerMatch = responseContent.match(/(?:Answer:?\s*)(.*?)(?:\n|$)/i);
          const reasoningMatch = responseContent.match(/(?:Reasoning:?\s*)([\s\S]*?)(?:\n\s*(?:Code:|$))/i);

          const answer = answerMatch ? answerMatch[1].trim() : "Answer not found";
          const reasoning = reasoningMatch ? reasoningMatch[1].trim() : "No reasoning provided";

          formattedResponse = {
            code: code,
            thoughts: [answer, reasoning],
            answer: answer,
            reasoning: reasoning,
            question_type: "multiple_choice"
          };
        } else if (problemInfo.question_type === "missing_code") {
          const missingPartsMatch = responseContent.match(/(?:Missing Parts:?\s*)([\s\S]*?)(?:\n\s*(?:Explanation:|$))/i);
          const explanationMatch = responseContent.match(/(?:Explanation:?\s*)([\s\S]*?)(?:\n\s*(?:Code:|$))/i);

          const missingParts = missingPartsMatch ? missingPartsMatch[1].trim() : "Missing parts not identified";
          const explanation = explanationMatch ? explanationMatch[1].trim() : "No explanation provided";

          formattedResponse = {
            code: code,
            thoughts: [missingParts, explanation],
            missing_parts: missingParts,
            explanation: explanation,
            question_type: "missing_code"
          };
        } else {
          const explanationMatch = responseContent.match(/(?:Explanation:?\s*)([\s\S]*?)(?:\n\s*(?:Code:|$))/i);
          const explanation = explanationMatch ? explanationMatch[1].trim() : "Solution provided";

          formattedResponse = {
            code: code,
            thoughts: [explanation],
            explanation: explanation,
            question_type: "problem_solution"
          };
        }
      }

      return { success: true, data: formattedResponse };
    } catch (error: any) {
      if (axios.isCancel(error)) {
        return {
          success: false,
          error: "Processing was canceled by the user."
        };
      }

      if (error?.response?.status === 401) {
        return {
          success: false,
          error: "Invalid OpenAI API key. Please check your settings."
        };
      } else if (error?.response?.status === 429) {
        return {
          success: false,
          error: "OpenAI API rate limit exceeded or insufficient credits. Please try again later."
        };
      }

      console.error("Solution generation error:", error);
      return { success: false, error: error.message || "Failed to generate solution" };
    }
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const problemInfo = this.deps.getProblemInfo();
      const language = await this.getLanguage();
      const config = configHelper.loadConfig();
      const mainWindow = this.deps.getMainWindow();

      if (!problemInfo) {
        throw new Error("No problem info available");
      }

      // Update progress status
      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Analyzing screenshots for debugging...",
          progress: 30
        });
      }

      // Prepare the images for the API call
      const imageDataList = screenshots.map(screenshot => screenshot.data);

      let debugContent;

      if (config.apiProvider === "openai") {
        if (!this.openaiClient) {
          return {
            success: false,
            error: "OpenAI API key not configured. Please check your settings."
          };
        }

        // Get the previous solution if available
        const previousSolution = problemInfo.code || problemInfo.solution_code || "";

        const messages = [
          {
            role: "system" as const,
            content: `You are an expert in Python and web development (HTML, CSS, JavaScript) helping debug and improve solutions. For HTML: ALWAYS include CSS in <style> tags within the HTML, never as separate files. Ensure all HTML tags are properly closed and the code is syntactically correct. Analyze the screenshots showing errors and the PREVIOUS CODE to identify and fix issues.

Your response MUST follow this exact structure:
1. Reasoning: [REQUIRED - Explain what errors you see in the screenshots and what's wrong with the previous code]
2. What's Missing: [Identify what's missing, wrong, or needs to be fixed based on the error screenshots]
3. Code: [Provide the complete, corrected code solution with all errors fixed]

IMPORTANT: The Reasoning section is mandatory and must never be empty. Always provide your analysis of what you observe in the screenshots, even if it's just describing the code structure or identifying the programming language.`
          },
          {
            role: "user" as const,
            content: [
              {
                type: "text" as const,
                text: `I'm working on this ${problemInfo.question_type || 'programming'} question: "${problemInfo.question_text || problemInfo.problem_statement}" in ${language}.

${previousSolution ? `PREVIOUS CODE THAT WAS GENERATED:
\`\`\`
${previousSolution}
\`\`\`

The screenshots show ERRORS or ISSUES with this code. Please analyze the error screenshots and fix the code.
` : 'The screenshots show errors or issues. Please analyze them and provide the corrected code.'}

Please provide: 1. Reasoning (REQUIRED - explain what errors you see in the screenshots and what's wrong with the code), 2. What's missing/wrong, 3. Complete corrected code with all errors fixed. The reasoning section must never be empty.`
              },
              ...imageDataList.map(data => ({
                type: "image_url" as const,
                image_url: { url: `data:image/png;base64,${data}` }
              }))
            ]
          }
        ];

        if (mainWindow) {
          mainWindow.webContents.send("processing-status", {
            message: "Generating reasoning and identifying missing parts...",
            progress: 60
          });
        }

        const debugResponse = await this.openaiClient.chat.completions.create({
          model: config.debuggingModel || "gpt-5",
          messages: messages,
          max_tokens: 32000,
          temperature: 0.2
        });

        debugContent = debugResponse.choices[0].message.content;
      } else if (config.apiProvider === "gemini") {
        if (!this.geminiApiKey) {
          return {
            success: false,
            error: "Gemini API key not configured. Please check your settings."
          };
        }

        // Get the previous solution if available
        const previousSolution = problemInfo.code || problemInfo.solution_code || "";

        try {
          const debugPrompt = `
You are an expert in Python and web development (HTML, CSS, JavaScript) helping debug and improve solutions. For HTML: ALWAYS include CSS in <style> tags within the HTML, never as separate files. Ensure all HTML tags are properly closed and the code is syntactically correct. Analyze the screenshots showing errors and the PREVIOUS CODE to identify and fix issues.

I'm working on this ${problemInfo.question_type || 'programming'} question: "${problemInfo.question_text || problemInfo.problem_statement}" in ${language}.

${previousSolution ? `PREVIOUS CODE THAT WAS GENERATED:
\`\`\`
${previousSolution}
\`\`\`

The screenshots show ERRORS or ISSUES with this code. Please analyze the error screenshots and fix the code.
` : 'The screenshots show errors or issues. Please analyze them and provide the corrected code.'}

Your response MUST follow this exact structure:
1. Reasoning: [REQUIRED - Always explain what you see and understand about the problem, even if it's basic]
2. What's Missing: [Identify what's missing, wrong, or needs to be fixed]
3. Code: [Provide the complete, corrected code solution]

IMPORTANT: The Reasoning section is mandatory and must never be empty. Always provide your analysis of what you observe in the screenshots, even if it's just describing the code structure or identifying the programming language.
`;

          const geminiMessages = [
            {
              role: "user",
              parts: [
                { text: debugPrompt },
                ...imageDataList.map(data => ({
                  inlineData: {
                    mimeType: "image/png",
                    data: data
                  }
                }))
              ]
            }
          ];

          if (mainWindow) {
            mainWindow.webContents.send("processing-status", {
              message: "Generating reasoning and identifying missing parts with Gemini...",
              progress: 60
            });
          }

          const response = await axios.default.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.debuggingModel || "gemini-2.5-flash-lite"}:generateContent?key=${this.geminiApiKey}`,
            {
              contents: geminiMessages,
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 32000
              }
            },
            { signal }
          );

          const responseData = response.data as GeminiResponse;

          if (!responseData.candidates || responseData.candidates.length === 0) {
            throw new Error("Empty response from Gemini API");
          }

          debugContent = responseData.candidates[0].content.parts[0].text;
        } catch (error: any) {
          console.error("Error using Gemini API for debugging:", error);
          console.error("Gemini API error details:", error.response?.data || error.message);

          let errorMessage = "Failed to process debug request with Gemini API.";
          if (error.response?.data?.error?.message) {
            errorMessage += ` Error: ${error.response.data.error.message}`;
          } else if (error.message) {
            errorMessage += ` Error: ${error.message}`;
          }

          return {
            success: false,
            error: errorMessage
          };
        }
      } else if (config.apiProvider === "anthropic") {
        if (!this.anthropicClient) {
          return {
            success: false,
            error: "Anthropic API key not configured. Please check your settings."
          };
        }

        // Get the previous solution if available
        const previousSolution = problemInfo.code || problemInfo.solution_code || "";

        try {
          const debugPrompt = `
You are an expert in Python and web development (HTML, CSS, JavaScript) helping debug and improve solutions. For HTML: ALWAYS include CSS in <style> tags within the HTML, never as separate files. Ensure all HTML tags are properly closed and the code is syntactically correct. Analyze the screenshots showing errors and the PREVIOUS CODE to identify and fix issues.

I'm working on this ${problemInfo.question_type || 'programming'} question: "${problemInfo.question_text || problemInfo.problem_statement}" in ${language}.

${previousSolution ? `PREVIOUS CODE THAT WAS GENERATED:
\`\`\`
${previousSolution}
\`\`\`

The screenshots show ERRORS or ISSUES with this code. Please analyze the error screenshots and fix the code.
` : 'The screenshots show errors or issues. Please analyze them and provide the corrected code.'}

Your response MUST follow this exact structure:
1. Reasoning: [REQUIRED - Always explain what you see and understand about the problem, even if it's basic]
2. What's Missing: [Identify what's missing, wrong, or needs to be fixed]
3. Code: [Provide the complete, corrected code solution]

IMPORTANT: The Reasoning section is mandatory and must never be empty. Always provide your analysis of what you observe in the screenshots, even if it's just describing the code structure or identifying the programming language.
`;

          const messages = [
            {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
                  text: debugPrompt
                },
                ...imageDataList.map(data => ({
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: "image/png" as const,
                    data: data
                  }
                }))
              ]
            }
          ];

          if (mainWindow) {
            mainWindow.webContents.send("processing-status", {
              message: "Generating reasoning and identifying missing parts with Claude...",
              progress: 60
            });
          }

          const response = await this.anthropicClient.messages.create({
            model: config.debuggingModel || "claude-sonnet-4-20250514",
            max_tokens: 32000,
            messages: messages,
            temperature: 0.2
          });

          debugContent = (response.content[0] as { type: 'text', text: string }).text;
        } catch (error: any) {
          console.error("Error using Anthropic API for debugging:", error);

          // Add specific handling for Claude's limitations
          if (error.status === 429) {
            return {
              success: false,
              error: "Claude API rate limit exceeded. Please wait a few minutes before trying again."
            };
          } else if (error.status === 413 || (error.message && error.message.includes("token"))) {
            return {
              success: false,
              error: "Your screenshots contain too much information for Claude to process. Switch to OpenAI or Gemini in settings which can handle larger inputs."
            };
          }

          return {
            success: false,
            error: "Failed to process debug request with Anthropic API. Please check your API key or try again later."
          };
        }
      }


      if (mainWindow) {
        mainWindow.webContents.send("processing-status", {
          message: "Debug analysis complete",
          progress: 100
        });
      }

      // Parse the new format: 1. Reasoning, 2. What's Missing, 3. Code
      // Try multiple patterns to catch different formatting styles
      const reasoningMatch = debugContent.match(/(?:1\.\s*Reasoning:?\s*|Reasoning:?\s*|Analysis:?\s*|Understanding:?\s*)([\s\S]*?)(?=\n\s*(?:2\.|What's Missing:|Missing:|Issues:|$))/i);
      const missingMatch = debugContent.match(/(?:2\.\s*What's Missing:?\s*|What's Missing:?\s*|Missing:?\s*|Issues:?\s*|Problems:?\s*)([\s\S]*?)(?=\n\s*(?:3\.|Code:|Solution:|$))/i);
      const codeMatch = debugContent.match(/(?:3\.\s*Code:?\s*|Code:?\s*|Solution:?\s*)([\s\S]*?)(?:\n\s*$|$)/i);

      // Extract code from markdown blocks if present
      let extractedCode = "// Debug mode - see analysis below";
      if (codeMatch && codeMatch[1]) {
        const codeContent = codeMatch[1].trim();
        const markdownCodeMatch = codeContent.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)```/);
        extractedCode = markdownCodeMatch ? markdownCodeMatch[1].trim() : codeContent;
      }

      // Provide better fallbacks for reasoning and missing parts
      let reasoning = reasoningMatch ? reasoningMatch[1].trim() : "";
      let whatsMissing = missingMatch ? missingMatch[1].trim() : "";

      // If reasoning is empty or too short, provide a meaningful fallback
      if (!reasoning || reasoning.length < 10) {
        reasoning = `Based on the screenshots provided, I can see ${problemInfo.question_type || 'programming'} content that needs analysis. The code appears to be in ${language} and requires debugging assistance.`;
      }

      // If what's missing is empty, provide a fallback
      if (!whatsMissing || whatsMissing.length < 5) {
        whatsMissing = "Code improvements or corrections are needed based on the provided screenshots.";
      }

      const response = {
        code: extractedCode,
        thoughts: [reasoning, whatsMissing],
        reasoning: reasoning,
        whats_missing: whatsMissing,
        debug_analysis: debugContent,
        question_type: "debug"
      };

      return { success: true, data: response };
    } catch (error: any) {
      console.error("Debug processing error:", error);
      return { success: false, error: error.message || "Failed to process debug request" };
    }
  }

  public cancelOngoingRequests(): void {
    let wasCancelled = false

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
      wasCancelled = true
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
      wasCancelled = true
    }

    this.deps.setHasDebugged(false)

    this.deps.setProblemInfo(null)

    const mainWindow = this.deps.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
    }
  }
}
