// ConfigHelper.ts
import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { EventEmitter } from "events"
import { API, WINDOW, PATHS } from "./constants/app-constants"
import { SecureConfigHelper } from "./SecureConfigHelper"

interface Config {
  groqApiKey: string;
  groqModel: string;
  language: string;
  opacity: number;
  mode: 'mcq' | 'coding'; // MCQ mode or Coding mode
}

export class ConfigHelper extends EventEmitter {
  private configPath: string;
  private defaultConfig: Config = {
    groqApiKey: "",
    groqModel: API.DEFAULT_GROQ_MODEL,
    language: API.DEFAULT_LANGUAGE,
    opacity: WINDOW.MAX_OPACITY,
    mode: 'mcq' // Default to MCQ mode
  };

  constructor() {
    super();
    // Use the app's user data directory to store the config
    try {
      this.configPath = path.join(app.getPath('userData'), PATHS.CONFIG_FILE);
      console.log('Config path:', this.configPath);
    } catch (err) {
      console.warn('Could not access user data path, using fallback');
      this.configPath = path.join(process.cwd(), PATHS.CONFIG_FILE);
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





  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        
        // Handle empty file
        if (!configData || configData.trim() === '') {
          console.warn('Config file is empty, using defaults');
          this.saveConfig(this.defaultConfig);
          return { ...this.defaultConfig };
        }
        
        let config: any;
        try {
          config = JSON.parse(configData);
        } catch (parseError) {
          console.error('Error parsing config JSON:', parseError);
          // Backup corrupted file and create new one
          try {
            const backupPath = this.configPath + '.backup';
            fs.writeFileSync(backupPath, configData);
            console.log('Backed up corrupted config to:', backupPath);
          } catch (backupErr) {
            console.error('Error backing up config:', backupErr);
          }
          this.saveConfig(this.defaultConfig);
          return { ...this.defaultConfig };
        }
        
        // Validate and fix model name if invalid
        if (config.groqModel) {
          const validModels = [
            API.GROQ_MODELS.KIMI_K2_TEXT,
            API.GROQ_MODELS.GPT_OSS_TEXT
          ];
          
          // Check if the model is invalid (like nvidia/llama-3.1-nemotron-70b-instruct)
          if (!validModels.includes(config.groqModel)) {
            console.warn(`Invalid model detected: ${config.groqModel}, resetting to default`);
            config.groqModel = API.DEFAULT_GROQ_MODEL;
            // Save the corrected config
            this.saveConfig({ ...this.defaultConfig, ...config });
          }
        }

        // Decrypt keys
        if (config.groqApiKey) {
           config.groqApiKey = SecureConfigHelper.decrypt(config.groqApiKey);
        }
        
        return {
          ...this.defaultConfig,
          ...config
        };
      }
      
      // If no config exists, create a default one
      this.saveConfig(this.defaultConfig);
      return { ...this.defaultConfig };
    } catch (err) {
      console.error("Error loading config:", err);
      return { ...this.defaultConfig };
    }
  }

  /**
   * Save configuration to disk
   */
  public saveConfig(config: Config): void {
    try {
      // Validate config object
      if (!config || typeof config !== 'object') {
        console.error('Invalid config object provided to saveConfig');
        return;
      }
      
      // Create a copy to encrypt sensitive data before saving
      const configToSave = { ...config };

      if (configToSave.groqApiKey) {
        configToSave.groqApiKey = SecureConfigHelper.encrypt(configToSave.groqApiKey);
      }

      // Ensure the directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Write the config file atomically (write to temp, then rename)
      const tempPath = this.configPath + '.tmp';
      const configString = JSON.stringify(configToSave, null, 2);
      
      fs.writeFileSync(tempPath, configString, 'utf8');
      
      // Rename temp file to actual config file (atomic on most systems)
      fs.renameSync(tempPath, this.configPath);
    } catch (err) {
      console.error("Error saving config:", err);
      
      // Fallback: try direct write if atomic write fails
      try {
        // Encrypt for fallback save too
        const configToSave = { ...config };
        if (configToSave.groqApiKey) {
          configToSave.groqApiKey = SecureConfigHelper.encrypt(configToSave.groqApiKey);
        }
        fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2), 'utf8');
      } catch (fallbackErr) {
        console.error('Fallback config save also failed:', fallbackErr);
      }
    }
  }

  /**
   * Update specific configuration values
   */
  public updateConfig(updates: Partial<Config>): Config {
    try {
      if (!updates || typeof updates !== 'object') {
        console.error('Invalid updates provided to updateConfig');
        return this.loadConfig();
      }
      
      const currentConfig = this.loadConfig();
      
      const newConfig = { ...currentConfig, ...updates };
      this.saveConfig(newConfig);
      
      // Emit update event for API key or language changes
      if (updates.groqApiKey !== undefined || updates.language !== undefined) {
        try {
          this.emit('config-updated', newConfig);
        } catch (emitError) {
          console.error('Error emitting config-updated event:', emitError);
        }
      }
      
      return newConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      return this.loadConfig();
    }
  }

  /**
   * Check if at least one API key is configured
   */
  public hasApiKey(): boolean {
    const config = this.loadConfig();
    const hasGroq = !!config.groqApiKey && config.groqApiKey.trim().length > 0;
    return hasGroq;
  }

  /**
   * Check if the current mode has its required API key
   */
  public hasRequiredApiKey(): boolean {
    const config = this.loadConfig();
    return !!config.groqApiKey && config.groqApiKey.trim().length > 0;
  }
  
  /**
   * Validate Groq API key format
   */
  public isValidGroqApiKey(apiKey: string): boolean {
    return /^gsk_[a-zA-Z0-9]{32,}$/.test(apiKey.trim());
  }
  
  /**
   * Get the stored opacity value
   */
  public getOpacity(): number {
    try {
      const config = this.loadConfig();
      const opacity = config.opacity;
      // Ensure opacity is a valid number between 0.1 and 1.0
      if (typeof opacity === 'number' && !isNaN(opacity) && opacity >= WINDOW.MIN_OPACITY && opacity <= WINDOW.MAX_OPACITY) {
        return opacity;
      }
      return WINDOW.MAX_OPACITY;
    } catch (error) {
      console.error('Error getting opacity:', error);
      return WINDOW.MAX_OPACITY;
    }
  }

  /**
   * Set the window opacity value
   */
  public setOpacity(opacity: number): void {
    // Ensure opacity is between 0.1 and 1.0
    const validOpacity = Math.min(WINDOW.MAX_OPACITY, Math.max(WINDOW.MIN_OPACITY, opacity));
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
   * Get the current mode (MCQ or Coding)
   */
  public getMode(): 'mcq' | 'coding' {
    const config = this.loadConfig();
    return config.mode || 'coding';
  }

  /**
   * Set the mode (MCQ or Coding)
   */
  public setMode(mode: 'mcq' | 'coding'): void {
    this.updateConfig({ mode });
  }

}

// Export a singleton instance
export const configHelper = new ConfigHelper();
