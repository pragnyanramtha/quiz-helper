# Gemini 400 Bad Request Error Fix

## Problem

Getting 400 Bad Request errors when calling Gemini API with error message showing escaped JSON:
```
data: \{"contents":...}
```

## Root Cause

The issue was with how axios was imported:

```typescript
// WRONG - Namespace import
import * as axios from "axios"

// This requires using axios.default.post()
await axios.default.post(url, data)
```

When using namespace imports (`import * as`), TypeScript/JavaScript can sometimes cause issues with how the data is serialized, potentially leading to double stringification or incorrect content-type handling.

## Solution

Changed to standard default import:

```typescript
// CORRECT - Default import
import axios from "axios"

// Now use axios.post() directly
await axios.post(url, data)
```

## Changes Made

### 1. Updated Import Statement
**File**: `electron/ProcessingHelper.ts`

**Before**:
```typescript
import * as axios from "axios"
```

**After**:
```typescript
import axios from "axios"
```

### 2. Updated All axios Calls

**Before**:
```typescript
const response = await axios.default.post(url, data, config)
```

**After**:
```typescript
const response = await axios.post(url, data, config)
```

Updated in 3 functions:
- `callGemini()` - Main Gemini API call with images
- `callGeminiWithHistory()` - Gemini API call with conversation history
- `callGeminiFast()` - Fast text-only Gemini API call

## Why This Fixes It

1. **Proper axios Instance**: Default import gives you the properly configured axios instance
2. **Correct Serialization**: axios automatically handles JSON stringification correctly
3. **Proper Headers**: Content-Type headers are set correctly by axios
4. **No Double Stringification**: Data is passed as JavaScript object, axios converts it once

## Testing

After this fix, Gemini API calls should work correctly:

1. **Regular Mode** (with screenshots):
   - Captures screenshots
   - Sends to Gemini with images
   - Receives proper response

2. **Fast Text Mode** (OCR):
   - Extracts text with OCR
   - Sends text-only prompt to Gemini
   - Gets quick response

3. **Debug Mode** (with history):
   - Maintains conversation context
   - Sends new screenshots with history
   - Receives debugging suggestions

## Build Status

✅ Build successful
✅ No TypeScript errors
✅ All axios calls updated
✅ Ready for testing

## Files Modified

- ✅ `electron/ProcessingHelper.ts` - Fixed axios import and all calls

## Version

Updated to: **1.0.3**

## Additional Notes

This is a common issue when working with axios in TypeScript:
- Always use `import axios from "axios"` (default import)
- Avoid `import * as axios from "axios"` (namespace import)
- Let axios handle JSON serialization automatically
- Pass JavaScript objects directly, not stringified JSON

## Prevention

For future development:
1. Use default imports for axios
2. Pass objects directly to axios.post()
3. Don't manually stringify data when using axios
4. Let axios set Content-Type headers automatically
