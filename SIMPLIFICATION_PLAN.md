# Simplification Plan

## Current Problem
- Too many API calls (extraction → solution → debugging)
- Complex JSON parsing
- Overcomplicated format detection
- Slow responses due to multiple calls

## New Simplified Approach

### Single API Call
```
User screenshots → AI Model → Direct answer
```

### Smart Prompt Format
```
Analyze the screenshots and respond based on question type:

1. MCQ (Math/Python/Web Dev):
   Format: answer {option number} {option value}
   Example: answer 2 B

2. English Question:
   Format: Full sentence in code block
   Example: ```The answer is that photosynthesis...```

3. Python Question:
   Format: Concept explanation + code
   Example:
   Main concept: Use list comprehension for filtering
   ```python
   [code here]
   ```

4. Web Dev Question:
   Format: HTML block + CSS block (separate)
   Example:
   ```html
   [HTML here]
   ```
   ```css
   [CSS here]
   ```
```

### Benefits
✅ **Faster**: Single API call instead of 2-3
✅ **Simpler**: No complex JSON parsing
✅ **Smarter**: AI detects question type automatically
✅ **Cleaner**: Separate HTML/CSS blocks
✅ **More reliable**: Less points of failure

## Implementation Steps

1. Remove extraction step
2. Simplify solution generation to single call
3. Update prompt to handle all question types
4. Parse response based on code blocks
5. Remove complex JSON handling

## Response Parsing

### MCQ Detection
```typescript
if (response.includes('answer ')) {
  // Extract: "answer 2 B"
  const match = response.match(/answer\s+(\d+)\s+([A-D])/);
}
```

### Code Block Detection
```typescript
// HTML: ```html ... ```
// CSS: ```css ... ```
// Python: ```python ... ```
// Text: ```text ... ```
```

### Simple, Fast, Reliable!
