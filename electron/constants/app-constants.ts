export const WINDOW = {
  MIN_WIDTH: 750,
  MIN_HEIGHT: 550,
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
  HIDE_DELAY_WINDOWS: 100,
  HIDE_DELAY_OTHER: 50,
  MOVEMENT_STEP: 60,
  OPACITY_STEP: 0.1,
  MIN_OPACITY: 0.1,
  MAX_OPACITY: 1.0,
} as const;

export const SCREENSHOTS = {
  MAX_QUEUE_SIZE: 5,
  SUPPORTED_FORMATS: ['png', 'jpg'] as const,
  TEMP_FILENAME: 'screenshot_temp.png',
} as const;

export const API = {
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000, // 30 seconds - more reasonable timeout
  RETRY_DELAY_BASE: 1000,
  GROQ_MODELS: {
    KIMI_K2_TEXT: 'moonshotai/kimi-k2-instruct',
    GPT_OSS_TEXT: 'openai/gpt-oss-120b'
  },
  DEFAULT_GROQ_MODEL: 'moonshotai/kimi-k2-instruct',
  FALLBACK_COOLDOWN_MS: 30000, // 30 seconds - Groq uses sliding window rate limits
  DEFAULT_LANGUAGE: 'python',
} as const;

export const PATHS = {
  CONFIG_FILE: 'config.json',
} as const;
