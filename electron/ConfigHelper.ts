// ConfigHelper.ts
import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { EventEmitter } from "events"

interface Config {
  groqApiKey: string;
  geminiApiKey: string;
  mode: "mcq" | "general";  // MCQ mode (Groq) or General mode (Gemini)
  groqModel: string;
  geminiModel: string;
  language: string;
  opacity: number;
}

export class ConfigHelper extends EventEmitter {
  private configPath: string;
  private defaultConfig: Config = {
    groqApiKey: "",
    geminiApiKey: "",
    mode: "mcq", // Default to MCQ mode (Groq)
    groqModel: "llama-3.3-70b-versatile",
    geminiModel: "gemini-2.5-flash",
    language: "python",
    opacity: 1.0
  };

  constructor() {
    super();
    // Use the app's user data directory to store the config
    try {
      this.configPath = path.join(app.getPath('userData'), 'config.json');
      console.log('Config path:', this.configPath);
    } catch (err) {
      console.warn('Could not access user data path, using fallback');
      this.configPath = path.join(process.cwd(), 'config.json');
    }
    
    // Ensure the initial config file exists
    this.ensureConfigExists();
  }

  /**
   * Ensure config file exists
   */
  private ensureConfigExists(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(this.defaultConfig);
      }
    } catch (err) {
      console.error("Error ensuring config exists:", err);
    }
  }

  /**
   * Validate and sanitize model selection to ensure only allowed models are used
   */
  private sanitizeGroqModel(model: string): string {
    const allowedModels = ['llama-3.3-70b-versatile', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'openai/gpt-oss-120b'];
    if (!allowedModels.includes(model)) {
      console.warn(`Invalid Groq model specified: ${model}. Using default model: llama-3.3-70b-versatile`);
      return 'llama-3.3-70b-versatile';
    }
    return model;
  }

  private sanitizeGeminiModel(model: string): string {
    const allowedModels = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    if (!allowedModels.includes(model)) {
      console.warn(`Invalid Gemini model specified: ${model}. Using default model: gemini-2.5-flash`);
      return 'gemini-2.5-flash';
    }
    return model;
  }

  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Ensure mode is valid
        if (config.mode !== "mcq" && config.mode !== "general") {
          config.mode = "mcq"; // Default to MCQ mode
        }
        
        // Sanitize model selections
        if (config.groqModel) {
          config.groqModel = this.sanitizeGroqModel(config.groqModel);
        }
        if (config.geminiModel) {
          config.geminiModel = this.sanitizeGeminiModel(config.geminiModel);
        }
        
        return {
          ...this.defaultConfig,
          ...config
        };
      }
      
      // If no config exists, create a default one
      this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    } catch (err) {
      console.error("Error loading config:", err);
      return this.defaultConfig;
    }
  }

  /**
   * Save configuration to disk
   */
  public saveConfig(config: Config): void {
    try {
      // Ensure the directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      // Write the config file
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error("Error saving config:", err);
    }
  }

  /**
   * Update specific configuration values
   */
  public updateConfig(updates: Partial<Config>): Config {
    try {
      const currentConfig = this.loadConfig();
      
      // Sanitize model selections in the updates
      if (updates.groqModel) {
        updates.groqModel = this.sanitizeGroqModel(updates.groqModel);
      }
      if (updates.geminiModel) {
        updates.geminiModel = this.sanitizeGeminiModel(updates.geminiModel);
      }
      
      const newConfig = { ...currentConfig, ...updates };
      this.saveConfig(newConfig);
      
      // Emit update event for API key or model changes
      if (updates.groqApiKey !== undefined || updates.geminiApiKey !== undefined || 
          updates.groqModel !== undefined || updates.geminiModel !== undefined || 
          updates.mode !== undefined || updates.language !== undefined) {
        this.emit('config-updated', newConfig);
      }
      
      return newConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Check if at least one API key is configured
   */
  public hasApiKey(): boolean {
    const config = this.loadConfig();
    const hasGroq = !!config.groqApiKey && config.groqApiKey.trim().length > 0;
    const hasGemini = !!config.geminiApiKey && config.geminiApiKey.trim().length > 0;
    return hasGroq || hasGemini;
  }

  /**
   * Check if the current mode has its required API key
   */
  public hasRequiredApiKey(): boolean {
    const config = this.loadConfig();
    if (config.mode === "mcq") {
      return !!config.groqApiKey && config.groqApiKey.trim().length > 0;
    } else {
      return !!config.geminiApiKey && config.geminiApiKey.trim().length > 0;
    }
  }
  
  /**
   * Validate Groq API key format
   */
  public isValidGroqApiKey(apiKey: string): boolean {
    return /^gsk_[a-zA-Z0-9]{32,}$/.test(apiKey.trim());
  }

  /**
   * Validate Gemini API key format
   */
  public isValidGeminiApiKey(apiKey: string): boolean {
    return apiKey.trim().length >= 20; // Gemini keys are typically longer
  }
  
  /**
   * Get the stored opacity value
   */
  public getOpacity(): number {
    const config = this.loadConfig();
    return config.opacity !== undefined ? config.opacity : 1.0;
  }

  /**
   * Set the window opacity value
   */
  public setOpacity(opacity: number): void {
    // Ensure opacity is between 0.1 and 1.0
    const validOpacity = Math.min(1.0, Math.max(0.1, opacity));
    this.updateConfig({ opacity: validOpacity });
  }  
  
  /**
   * Get the preferred programming language
   */
  public getLanguage(): string {
    const config = this.loadConfig();
    return config.language || "python";
  }

  /**
   * Set the preferred programming language
   */
  public setLanguage(language: string): void {
    this.updateConfig({ language });
  }
  
  /**
   * Get the processing mode (mcq or general)
   */
  public getMode(): "mcq" | "general" {
    const config = this.loadConfig();
    return config.mode || "mcq";
  }

  /**
   * Set the processing mode
   */
  public setMode(mode: "mcq" | "general"): void {
    this.updateConfig({ mode });
    console.log(`Processing mode set to: ${mode}`);
  }
  
  /**
   * Toggle between MCQ and General mode
   */
  public toggleMode(): "mcq" | "general" {
    const currentMode = this.getMode();
    const newMode = currentMode === "mcq" ? "general" : "mcq";
    this.setMode(newMode);
    return newMode;
  }
  

}

// Export a singleton instance
export const configHelper = new ConfigHelper();
