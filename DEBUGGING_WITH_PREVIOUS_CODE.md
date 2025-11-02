# Debugging with Previous Code Feature

## Overview

The debugging feature now automatically includes the previously generated code when analyzing error screenshots. This allows the AI to understand what code was generated and fix the specific errors shown in the screenshots.

## How It Works

### 1. Generate Initial Solution
1. Take screenshot of the problem
2. Press `Ctrl/Cmd + Enter` to process
3. Get the generated code solution

### 2. Debug with Error Screenshots
1. **DON'T press `Ctrl/Cmd + R`** (this resets everything)
2. Take screenshots of the errors (console errors, visual bugs, etc.)
3. Press `Ctrl/Cmd + Enter` again
4. The AI will:
   - See the PREVIOUS CODE it generated
   - Analyze the ERROR SCREENSHOTS
   - Identify what's wrong
   - Return CORRECTED CODE with fixes

## What Changed

### Before (Old Behavior):
```
User: [Takes error screenshot]
AI: "I see an error but I don't know what code you're running"
Result: Generic suggestions without context
```

### After (New Behavior):
```
User: [Takes error screenshot]
AI: "I see the previous code I generated:
     [shows the code]
     And I see this error in the screenshot:
     [analyzes error]
     Here's the fixed code:
     [provides corrected code]"
Result: Specific fixes for the actual code
```

## Example Workflow

### Scenario: HTML/CSS Bug

**Step 1: Initial Generation**
```
1. Screenshot: Design mockup
2. Process: Ctrl+Enter
3. Result: HTML/CSS code generated
```

**Step 2: Testing & Finding Errors**
```
4. Copy code to browser
5. Notice: Button not centered, colors wrong
6. Screenshot: The broken layout
```

**Step 3: Debugging**
```
7. DON'T press Ctrl+R (keeps previous code in memory)
8. Take screenshot of the broken layout
9. Press Ctrl+Enter
10. AI sees:
    - Previous HTML/CSS code
    - Screenshot of broken layout
11. AI returns: Fixed HTML/CSS with corrections
```

### Scenario: Python Error

**Step 1: Initial Generation**
```
1. Screenshot: Python problem
2. Process: Ctrl+Enter
3. Result: Python code generated
```

**Step 2: Testing & Finding Errors**
```
4. Run the code
5. Get error: "NameError: name 'x' is not defined"
6. Screenshot: The error message
```

**Step 3: Debugging**
```
7. DON'T press Ctrl+R
8. Take screenshot of error
9. Press Ctrl+Enter
10. AI sees:
    - Previous Python code
    - Error screenshot
11. AI returns: Fixed code with variable defined
```

## What the AI Sees

When you debug, the AI receives:

```
PREVIOUS CODE THAT WAS GENERATED:
```python
def calculate(a, b):
    return a + c  # Bug: 'c' is not defined
```

The screenshots show ERRORS or ISSUES with this code.
Please analyze the error screenshots and fix the code.
```

Then the AI analyzes your error screenshots and provides:
1. **Reasoning**: "I see the error 'NameError: name c is not defined'. The variable should be 'b' not 'c'."
2. **What's Missing**: "The variable 'c' doesn't exist, should use 'b'"
3. **Code**: Fixed version with 'b' instead of 'c'

## Important Notes

### ✅ DO:
- Generate initial solution first
- Take screenshots of errors
- Keep the session active (don't press Ctrl+R)
- Press Ctrl+Enter to debug

### ❌ DON'T:
- Press Ctrl+R before debugging (this resets everything)
- Close the app between generation and debugging
- Expect debugging to work without initial solution

## Supported Error Types

The AI can debug:

### HTML/CSS Errors
- Layout issues
- Styling problems
- Broken responsive design
- Missing elements
- Color/font issues

### Python Errors
- Syntax errors
- Runtime errors
- Logic errors
- Import errors
- Type errors

### JavaScript Errors
- Console errors
- Function errors
- DOM manipulation issues
- Event handler problems

## Tips for Best Results

### 1. Clear Error Screenshots
✅ **Good**: Screenshot showing the error message clearly
✅ **Good**: Screenshot of broken layout with visible issues
❌ **Bad**: Blurry or partial screenshots

### 2. Multiple Error Screenshots
If you have multiple errors:
- Take screenshot of each error
- All will be analyzed together
- AI will fix all issues at once

### 3. Describe the Issue (Optional)
You can add text to help:
- "The button should be blue but it's red"
- "Getting TypeError on line 15"
- "Layout breaks on mobile"

### 4. Iterative Debugging
If first fix doesn't work:
1. Take screenshot of new error
2. Press Ctrl+Enter again
3. AI will see the updated code and new error
4. Get another fix

## Technical Details

### Code Storage
- Previous code is stored in `problemInfo.code`
- Persists until you press Ctrl+R
- Available to all AI providers (OpenAI, Gemini, Claude)

### AI Prompt Structure
```
System: You are an expert helping debug solutions...

User: 
I'm working on [question] in [language].

PREVIOUS CODE THAT WAS GENERATED:
[the code]

The screenshots show ERRORS with this code.
Analyze and fix.

[error screenshots attached]
```

### Response Format
```
1. Reasoning: [What's wrong with the code based on errors]
2. What's Missing: [Specific issues identified]
3. Code: [Complete corrected code]
```

## Troubleshooting

### "No previous code found"
**Cause**: You pressed Ctrl+R or restarted the app
**Fix**: Generate the initial solution again first

### "AI doesn't understand the error"
**Cause**: Error screenshot is unclear
**Fix**: Take clearer screenshot, zoom in on error message

### "Fixed code still has errors"
**Cause**: Complex issue or unclear error
**Fix**: 
1. Take screenshot of new error
2. Debug again (iterative process)
3. Try different AI provider

### "AI generates completely new code"
**Cause**: Previous code wasn't stored properly
**Fix**: 
1. Check you didn't press Ctrl+R
2. Ensure initial solution completed successfully
3. Try again

## Example: Complete Debugging Session

```
Session Start
├─ Screenshot: HTML design mockup
├─ Ctrl+Enter: Generate HTML/CSS
├─ Result: Code with button styling
│
├─ Test in browser
├─ Issue: Button not centered
├─ Screenshot: Broken layout
├─ Ctrl+Enter: Debug
├─ AI sees: Previous HTML/CSS + error screenshot
├─ Result: Fixed HTML/CSS with centered button
│
├─ Test again
├─ Issue: Wrong color
├─ Screenshot: Color issue
├─ Ctrl+Enter: Debug again
├─ AI sees: Updated code + new screenshot
└─ Result: Final fixed code with correct color
```

## Benefits

✅ **Context-Aware**: AI knows what code it generated
✅ **Specific Fixes**: Targets actual errors, not generic advice
✅ **Iterative**: Can debug multiple times
✅ **All Languages**: Works for HTML, CSS, Python, JavaScript, etc.
✅ **All Providers**: OpenAI, Gemini, and Claude all support this

## Summary

The debugging feature now:
1. Remembers the code it generated
2. Analyzes your error screenshots
3. Provides specific fixes for the actual code
4. Works iteratively for multiple debugging rounds

Just don't press Ctrl+R between generation and debugging!
