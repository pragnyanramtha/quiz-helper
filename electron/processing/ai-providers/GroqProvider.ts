import { OpenAI } from "openai"
import { BrowserWindow } from "electron"
import { configHelper } from "../../ConfigHelper"
import { API } from "../../constants/app-constants"
import { AIProvider } from "./AIProvider.interface"

export class GroqProvider implements AIProvider {
  name = "Groq";
  private client: OpenAI | null = null;
  private isUsingFallback: boolean = false;
  private fallbackUntil: number = 0; // Timestamp when to switch back to configured model

  private getClient(): OpenAI {
    if (this.client) return this.client;

    const config = configHelper.loadConfig();
    if (!config.groqApiKey) {
      throw new Error("Groq API key not configured");
    }

    this.client = new OpenAI({
      apiKey: config.groqApiKey,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: API.TIMEOUT_MS,
      maxRetries: 0 // We handle retries manually in ProcessingHelper
    });

    console.log(`[Groq] Client initialized with ${API.TIMEOUT_MS}ms timeout`);

    return this.client;
  }

  /**
   * Get the appropriate model to use (configured model or fallback)
   */
  private getModelToUse(configModel: string): string {
    const now = Date.now();
    
    // Check if we should switch back to the configured model
    if (this.isUsingFallback && now >= this.fallbackUntil) {
      console.log('[Groq] Cooldown period ended, switching back to configured model');
      this.isUsingFallback = false;
      this.fallbackUntil = 0;
      // Notify frontend that fallback is over
      this.notifyFallbackStatus(false);
    }
    
    // If using fallback, return GPT-OSS text model
    if (this.isUsingFallback) {
      const remainingTime = Math.ceil((this.fallbackUntil - now) / 1000);
      console.log(`[Groq] Using GPT-OSS fallback model (${remainingTime}s remaining)`);
      return API.GROQ_MODELS.GPT_OSS_TEXT;
    }
    
    // Otherwise use configured model
    return configModel;
  }

  /**
   * Handle rate limit by switching to GPT-OSS fallback model.
   */
  private handleRateLimit(): void {
    if (!this.isUsingFallback) {
      this.isUsingFallback = true;
      this.fallbackUntil = Date.now() + API.FALLBACK_COOLDOWN_MS;
      
      const cooldownSeconds = API.FALLBACK_COOLDOWN_MS / 1000;
      console.log(`[Groq] ⚠️ Rate limit detected! Switching to GPT-OSS fallback for ${cooldownSeconds}s`);
      console.log(`[Groq] ℹ️ Groq uses sliding window rate limits - waiting ${cooldownSeconds}s before retrying primary model`);
      
      // Notify frontend about fallback status
      this.notifyFallbackStatus(true);
    }
  }
  
  /**
   * Notify frontend about fallback status change
   */
  private notifyFallbackStatus(isUsingFallback: boolean): void {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow && !mainWindow.isDestroyed()) {
        const payload = { 
          isUsingFallback,
          remainingSeconds: isUsingFallback ? Math.ceil((this.fallbackUntil - Date.now()) / 1000) : 0
        };
        console.log('[Groq] Sending fallback status to frontend:', payload);
        mainWindow.webContents.send('model-fallback-status', payload);
      } else {
        console.warn('[Groq] Cannot send fallback status - no main window available');
      }
    } catch (error) {
      console.error('[Groq] Error notifying fallback status:', error);
    }
  }

  /**
   * Check if currently using fallback model
   */
  public isUsingFallbackModel(): boolean {
    return this.isUsingFallback;
  }

  async generateContent(prompt: string, images: string[], signal: AbortSignal, systemPrompt?: string, extractedText?: string, modelOverride?: string): Promise<string> {
    const startTime = Date.now();
    const client = this.getClient();
    const config = configHelper.loadConfig();
    const configuredModel = modelOverride || config.groqModel || API.DEFAULT_GROQ_MODEL;
    const model = this.getModelToUse(configuredModel);

    console.log(`[Groq] Starting API call with model: ${model}`);

    // Use the provided system prompt directly (already optimized in ProcessingHelper)
    let systemMessage = systemPrompt || "You are an expert problem solver.";
    
    // Extra reinforcement for MCQ mode to prevent code blocks
    const mode = configHelper.getMode();
    if (mode === 'mcq') {
      systemMessage += `\n\n🚨 CRITICAL REMINDER: You are in MCQ MODE. DO NOT include any code blocks (no \`\`\`python, \`\`\`javascript, etc.). Only provide reasoning and final answer.`;
    }

    // All supported models here are text-only and require OCR text.
    if (!extractedText) {
      throw new Error('Text-only model requires OCR extracted text');
    }

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: `${prompt}\n\nExtracted text from image:\n${extractedText}` }
        ],
        max_tokens: 2000,
        temperature: 0.2
      }, { signal });

      const duration = Date.now() - startTime;
      console.log(`[Groq] API call completed in ${duration}ms (text-only OCR mode)`);

      return response.choices[0].message.content || "";
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (error.status === 429 || error.code === 'rate_limit_exceeded') {
        console.error(`[Groq] Rate limit hit after ${duration}ms on model: ${model}`);

        if (model !== API.GROQ_MODELS.GPT_OSS_TEXT) {
          this.handleRateLimit();
          console.log('[Groq] ⚠️ Primary model rate-limited. Falling back to GPT-OSS...');
          throw new Error('RATE_LIMIT_USE_OCR_FALLBACK');
        }

        throw new Error('Groq API rate limit exceeded on fallback model. Please wait a moment.');
      }

      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        console.error(`[Groq] Request timed out after ${duration}ms`);
        throw new Error('Groq API request timed out. The service may be slow right now.');
      }

      console.error(`[Groq] API error after ${duration}ms:`, error.message);
      throw error;
    }
  }

  async generateContentWithHistory(prompt: string, images: string[], history: any[], signal: AbortSignal, extractedText?: string, modelOverride?: string): Promise<string> {
    const startTime = Date.now();
    const client = this.getClient();
    const config = configHelper.loadConfig();
    const configuredModel = modelOverride || config.groqModel || API.DEFAULT_GROQ_MODEL;
    const model = this.getModelToUse(configuredModel);

    console.log(`[Groq] Starting debug API call with model: ${model}, history length: ${history.length}`);

    const messages: any[] = [
      { role: "system", content: "You are an expert debugging assistant." }
    ];

    // Add history
    for (const item of history) {
      messages.push({
        role: item.role === 'model' ? 'assistant' : item.role,
        content: item.content
      });
    }

    // All supported models here are text-only and require OCR text.
    if (!extractedText) {
      throw new Error('Text-only model requires OCR extracted text');
    }

    messages.push({
      role: "user",
      content: `${prompt}\n\nExtracted text from image:\n${extractedText}`
    });

    try {
      const response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: 2000,
        temperature: 0.2
      }, { signal });

      const duration = Date.now() - startTime;
      console.log(`[Groq] Debug API call completed in ${duration}ms`);

      return response.choices[0].message.content || "";
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Detect rate limiting - switch to fallback text model
      if (error.status === 429 || error.code === 'rate_limit_exceeded') {
        console.error(`[Groq] Rate limit hit after ${duration}ms on debug call`);
        
        // If we were using primary model, switch to GPT-OSS
        if (model !== API.GROQ_MODELS.GPT_OSS_TEXT) {
          this.handleRateLimit();
          console.log('[Groq] ⚠️ Primary model rate-limited in debug. Falling back to GPT-OSS...');
          
          // Throw special error to let ProcessingHelper handle OCR extraction
          throw new Error('RATE_LIMIT_USE_OCR_FALLBACK');
        } else {
          throw new Error('Groq API rate limit exceeded on fallback model. Please wait a moment.');
        }
      }
      
      console.error(`[Groq] Debug API error after ${duration}ms:`, error.message);
      throw error;
    }
  }
}
