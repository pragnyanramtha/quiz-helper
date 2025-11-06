// OCRHelper.ts - Fast text extraction from screenshots
import { createWorker, Worker } from 'tesseract.js';
import fs from 'fs';

export class OCRHelper {
  private worker: Worker | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeWorker();
  }

  private async initializeWorker(): Promise<void> {
    try {
      console.log('Initializing Tesseract OCR worker...');
      this.worker = await createWorker('eng', 1, {
        logger: () => {}, // Disable logging for speed
        errorHandler: () => {} // Disable error logging
      });
      
      // ULTRA-FAST CONFIGURATION - Optimized for speed over accuracy
      await this.worker.setParameters({
        tessedit_pageseg_mode: 6 as any, // Assume uniform block of text
        tessedit_ocr_engine_mode: 0 as any, // Legacy engine (faster than LSTM)
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789().,;:!?-/\'" ',
        classify_bln_numeric_mode: 1 as any, // Faster numeric classification
        textord_heavy_nr: 1 as any, // Faster text ordering
        language_model_penalty_non_dict_word: 0 as any, // Skip dictionary checks
        language_model_penalty_non_freq_dict_word: 0 as any, // Skip frequency checks
        load_system_dawg: 0 as any, // Don't load system dictionary
        load_freq_dawg: 0 as any, // Don't load frequency dictionary
        load_unambig_dawg: 0 as any, // Don't load unambiguous dictionary
        load_punc_dawg: 0 as any, // Don't load punctuation dictionary
        load_number_dawg: 0 as any, // Don't load number dictionary
        load_bigram_dawg: 0 as any, // Don't load bigram dictionary
      });
      
      this.isInitialized = true;
      console.log('✓ OCR worker initialized with ULTRA-FAST settings');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Extract text from screenshot file
   */
  public async extractText(imagePath: string): Promise<string> {
    if (!this.isInitialized || !this.worker) {
      console.log('OCR worker not initialized, initializing now...');
      await this.initializeWorker();
    }

    if (!this.worker) {
      throw new Error('OCR worker failed to initialize');
    }

    try {
      const startTime = Date.now();
      
      // Read image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Perform OCR with minimal processing
      const { data: { text } } = await this.worker.recognize(imageBuffer, {
        rotateAuto: false, // Skip auto-rotation (saves time)
        rotateRadians: 0
      });
      
      const duration = Date.now() - startTime;
      console.log(`✓ OCR completed in ${duration}ms`);
      console.log(`Extracted ${text.length} characters`);
      
      return text.trim();
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract text from multiple screenshots
   */
  public async extractTextFromMultiple(imagePaths: string[]): Promise<string> {
    const texts: string[] = [];
    
    for (const imagePath of imagePaths) {
      const text = await this.extractText(imagePath);
      texts.push(text);
    }
    
    return texts.join('\n\n---\n\n');
  }

  /**
   * Cleanup worker
   */
  public async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('OCR worker terminated');
    }
  }
}

// Export singleton instance
export const ocrHelper = new OCRHelper();
