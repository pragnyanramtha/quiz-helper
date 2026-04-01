export interface AIProvider {
  name: string;
  generateContent(
    prompt: string,
    images: string[],
    signal: AbortSignal,
    systemPrompt?: string,
    extractedText?: string,
    modelOverride?: string
  ): Promise<string>;
  generateContentWithHistory?(
    prompt: string,
    images: string[],
    history: any[],
    signal: AbortSignal,
    extractedText?: string,
    modelOverride?: string
  ): Promise<string>;
}
