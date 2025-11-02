# How to Debug Gemini API Error

## Steps to See Detailed Error

1. **Run the app in development mode:**
   ```bash
   npm run start
   ```

2. **Open DevTools:**
   - Press `F12` or `Ctrl+Shift+I`
   - Go to the "Console" tab

3. **Try processing screenshots:**
   - Take a screenshot with `Ctrl/Cmd + H`
   - Press `Ctrl/Cmd + Enter` to process

4. **Check the console for detailed errors:**
   Look for lines like:
   ```
   Error using Gemini API for solution: [error object]
   Gemini API error details: [detailed error message]
   ```

## What to Look For

The console will now show one of these errors:

### 1. Invalid API Key
```
Error: API key not valid. Please pass a valid API key.
```
**Fix**: Go to Settings → Enter correct Gemini API key

### 2. Rate Limit / Quota Exceeded
```
Error: Resource has been exhausted (e.g. check quota).
```
**Fix**: 
- Wait a few minutes
- Check your Gemini API quota at https://aistudio.google.com/
- Upgrade your plan if needed

### 3. Model Not Available
```
Error: models/gpt-5 is not found
```
**Fix**: The model name is wrong. Gemini models should be:
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`

### 4. Content Safety Block
```
Error: The response was blocked due to SAFETY
```
**Fix**: The content triggered safety filters, try different content

### 5. Request Too Large
```
Error: Request payload size exceeds the limit
```
**Fix**: Screenshot file is too large, try smaller images

### 6. Network Error
```
Error: Network Error
```
**Fix**: Check your internet connection

## Quick Fixes

### Switch to OpenAI Temporarily
1. Go to Settings
2. Select "OpenAI" as provider
3. Enter your OpenAI API key
4. Try again

### Verify Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key if needed
3. Copy the key
4. Paste in Settings → Gemini API Key
5. Save and try again

### Check Model Names
In Settings, make sure you're using valid Gemini models:
- ✅ `gemini-2.5-pro`
- ✅ `gemini-2.5-flash`
- ✅ `gemini-2.5-flash-lite`
- ❌ `gpt-5` (this is OpenAI, not Gemini!)
- ❌ `gemini-5` (doesn't exist)

## Still Having Issues?

1. **Copy the full error message** from the console
2. **Check which model** you have selected in Settings
3. **Verify your API key** is correct
4. **Try a different provider** (OpenAI or Anthropic)
5. **Share the detailed error** for more specific help

## Common Mistake

If you see an error about `gpt-5` or `gpt-5-mini` when using Gemini:
- This means the model names got mixed up
- Go to Settings
- Make sure "Gemini" is selected as provider
- The models should auto-update to Gemini models
- If not, manually select a Gemini model

## Testing

To test if Gemini is working:
1. Open Settings
2. Select "Gemini" as provider
3. Enter your Gemini API key
4. Select "gemini-2.5-flash-lite" for all three options
5. Save
6. Take a simple screenshot
7. Process it
8. Check console for any errors

The detailed error message will tell you exactly what's wrong!
