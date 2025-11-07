// OCRHelper.ts - Ultra-fast text extraction from screenshots
import { createWorker, Worker } from 'tesseract.js';
import fs from 'fs';
import sharp from 'sharp';

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
      
      // BALANCED CONFIGURATION - Fast AND accurate
      await this.worker.setParameters({
        tessedit_pageseg_mode: 6 as any, // Assume uniform block of text (KEEP - good for MCQ)
        tessedit_ocr_engine_mode: 1 as any, // LSTM engine (CHANGED - better accuracy, still fast)
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789().,;:!?-/\'" ',
        
        // Speed optimizations that don't hurt accuracy
        classify_bln_numeric_mode: 1 as any, // KEEP - faster numeric classification
        
        // Disable dictionaries (KEEP - big speed gain, minimal accuracy loss for MCQ)
        load_system_dawg: 0 as any,
        load_freq_dawg: 0 as any,
        load_unambig_dawg: 0 as any,
        load_punc_dawg: 0 as any,
        load_number_dawg: 0 as any,
        load_bigram_dawg: 0 as any,
        
        // Disable language model penalties (KEEP - MCQ doesn't need spell check)
        language_model_penalty_non_dict_word: 0 as any,
        language_model_penalty_non_freq_dict_word: 0 as any,
      });
      
      this.isInitialized = true;
      console.log('✓ OCR worker initialized with ULTRA-FAST settings');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Preprocess image for faster OCR while maintaining accuracy
   */
  private async preprocessImage(imagePath: string): Promise<Buffer> {
    try {
      // Balanced preprocessing - speed + accuracy
      const processed = await sharp(imagePath)
        .resize(1600, 900, { // 900p - good balance (CHANGED from 720p)
          fit: 'inside',
          withoutEnlargement: true,
          kernel: 'lanczos3' // Better quality downscaling
        })
        .grayscale() // KEEP - faster processing, minimal accuracy loss
        .normalize() // KEEP - improves contrast for better recognition
        .sharpen({ // KEEP - enhances text edges
          sigma: 1.0,
          m1: 1.0,
          m2: 0.5
        })
        .png({ // Use PNG for better text quality
          compressionLevel: 0, // No compression (faster)
          quality: 100
        })
        .toBuffer();
      
      return processed;
    } catch (error) {
      console.error('Image preprocessing failed, using original:', error);
      return fs.readFileSync(imagePath);
    }
  }

  /**
   * Extract text from screenshot file - ULTRA FAST
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
      
      // Preprocess image for faster OCR
      const preprocessStart = Date.now();
      const imageBuffer = await this.preprocessImage(imagePath);
      console.log(`Image preprocessing: ${Date.now() - preprocessStart}ms`);
      
      // Perform OCR with minimal processing
      const ocrStart = Date.now();
      const { data: { text } } = await this.worker.recognize(imageBuffer, {
        rotateAuto: false, // Skip auto-rotation
        rotateRadians: 0
      });
      console.log(`OCR recognition: ${Date.now() - ocrStart}ms`);
      
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
   * Extract text from multiple screenshots - PARALLEL PROCESSING
   */
  public async extractTextFromMultiple(imagePaths: string[]): Promise<string> {
    // Process all images in parallel for maximum speed
    const textPromises = imagePaths.map(imagePath => this.extractText(imagePath));
    const texts = await Promise.all(textPromises);
    
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
