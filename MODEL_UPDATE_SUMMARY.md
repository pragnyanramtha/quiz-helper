# Model Update Summary

## Overview
Updated the codebase to use the latest AI models:
- **OpenAI**: GPT-4o/4o-mini → GPT-5/5-mini
- **Anthropic Claude**: Claude 3.7 Sonnet, 3.5 Sonnet, 3 Opus → Claude Sonnet 4, 3.7 Sonnet, 3.5 Haiku

## Files Updated

### 1. README.md
- Updated feature descriptions to reference GPT-5 instead of GPT-4o
- Updated model cycling shortcuts documentation:
  - OpenAI: GPT-5 ↔ GPT-5-mini
  - Claude: Sonnet 4 → Sonnet 3.7 → Haiku 3.5 → Sonnet 4
- Updated comparison table and feature lists

### 2. src/components/Settings/SettingsDialog.tsx
**OpenAI Models:**
- `gpt-4o` → `gpt-5` (GPT-5)
- `gpt-4o-mini` → `gpt-5-mini` (GPT-5 Mini)

**Anthropic Models:**
- `claude-3-7-sonnet-20250219` → `claude-sonnet-4-20250514` (Claude Sonnet 4)
- `claude-3-5-sonnet-20241022` → `claude-3-7-sonnet-20250219` (Claude 3.7 Sonnet)
- `claude-3-opus-20240229` → `claude-3-5-haiku-20241022` (Claude 3.5 Haiku)

Updated all three model categories:
- Problem Extraction
- Solution Generation
- Debugging

### 3. electron/ConfigHelper.ts
- Updated default config to use `gpt-5` instead of `gpt-4o`
- Updated `sanitizeModelSelection()` to validate new model names
- Updated allowed models arrays for both OpenAI and Anthropic
- Updated provider switching logic to use new default models

### 4. electron/shortcuts.ts
- Updated model cycling arrays:
  - OpenAI: `["gpt-5", "gpt-5-mini"]`
  - Anthropic: `["claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-haiku-20241022"]`

### 5. electron/ProcessingHelper.ts
- Updated all default model fallbacks in API calls:
  - Extraction: `gpt-5` and `claude-sonnet-4-20250514`
  - Solution: `gpt-5` and `claude-sonnet-4-20250514`
  - Debugging: `gpt-5` and `claude-sonnet-4-20250514`

## Model Capabilities

### OpenAI GPT-5 Models
- **GPT-5**: Best overall performance for all tasks
- **GPT-5 Mini**: Faster, more cost-effective option

### Anthropic Claude Models
- **Claude Sonnet 4** (claude-sonnet-4-20250514): Latest and most capable model
- **Claude 3.7 Sonnet** (claude-3-7-sonnet-20250219): Balanced performance and speed
- **Claude 3.5 Haiku** (claude-3-5-haiku-20241022): Fast and efficient for quick tasks

## Breaking Changes
⚠️ **Important**: Users with existing configurations using old model names will be automatically migrated to the new models when they update their settings or when the config is loaded.

## Testing Recommendations
1. Test model selection in Settings dialog
2. Verify model cycling with Ctrl/Cmd + \ shortcut
3. Confirm API calls work with new model names
4. Test all three stages: extraction, solution, debugging
5. Verify config migration for existing users

## Notes
- All model IDs have been updated to match the latest API specifications
- The UI now displays more modern model names (e.g., "Claude Sonnet 4" instead of "Claude 3 Opus")
- Default provider changed from Gemini to OpenAI to showcase the latest GPT-5 models
