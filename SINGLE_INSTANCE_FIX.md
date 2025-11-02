# Single Instance Lock Fix

## Problem
Multiple instances of the app could run simultaneously, causing:
- Confusion with multiple windows
- Conflicting screenshot captures
- Duplicate processes
- Resource waste

## Solution Applied

### 1. Removed Duplicate Lock Code
There were two `requestSingleInstanceLock()` calls in the code, which was causing conflicts.

**Before:**
```typescript
// First lock (line 176)
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

// Duplicate lock (line 598) - REMOVED
if (!app.requestSingleInstanceLock()) {
  app.quit()
}
```

**After:**
```typescript
// Single lock only
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log("Another instance is already running. Quitting this instance.")
  app.quit()
}
```

### 2. Enhanced Second Instance Handling
When someone tries to start a second instance:

```typescript
app.on("second-instance", (event, commandLine) => {
  console.log("Second instance attempted to start. Focusing existing window.")
  if (state.mainWindow) {
    if (state.mainWindow.isMinimized()) {
      state.mainWindow.restore()
    }
    state.mainWindow.show()
    state.mainWindow.focus()
  }
})
```

### 3. Added Logging
- Logs when single instance lock is acquired
- Logs when second instance is attempted
- Logs when quitting duplicate instance

## How It Works

### First Instance (Allowed)
```
1. App starts
2. Requests single instance lock
3. Lock acquired ✅
4. App runs normally
5. Console: "Single instance lock acquired successfully"
```

### Second Instance (Blocked)
```
1. User tries to start app again
2. Requests single instance lock
3. Lock already taken ❌
4. Console: "Another instance is already running. Quitting this instance."
5. Second instance quits immediately
6. First instance window is focused
```

## What This Fixes

✅ **Only one instance can run** - Second instance automatically quits
✅ **Focuses existing window** - If you try to start again, it shows the existing window
✅ **No conflicts** - No duplicate processes or conflicting operations
✅ **Better UX** - Clear what's happening via console logs

## Testing

### Test 1: Try to Start Twice
1. Start the app: `npm run start`
2. Try to start again: `npm run start` (in another terminal)
3. Result: Second instance quits, first window is focused

### Test 2: Production Build
1. Build: `npm run build`
2. Run: `npm run run-prod`
3. Try to run again: `npm run run-prod`
4. Result: Second instance quits, first window is focused

### Test 3: Double-Click Executable
1. Package the app: `npm run package-win`
2. Go to `release/win-unpacked/`
3. Double-click `Interview Coder.exe`
4. Double-click again
5. Result: Only one instance runs, window is focused

## Console Output

### When First Instance Starts:
```
Single instance lock acquired successfully
```

### When Second Instance Attempts:
```
Another instance is already running. Quitting this instance.
```

### In First Instance When Second Attempts:
```
Second instance attempted to start. Focusing existing window.
```

## Platform Support

This works on all platforms:
- ✅ **Windows**: Single instance enforced
- ✅ **macOS**: Single instance enforced
- ✅ **Linux**: Single instance enforced

## Development Mode Note

In development mode with hot reload:
- File changes trigger rebuild
- This may create temporary second instance
- This is normal and expected
- The lock still prevents manual second starts

## Files Modified

- **electron/main.ts** - Removed duplicate lock, enhanced handling

## Benefits

1. **Prevents Confusion**: Only one app window
2. **Saves Resources**: No duplicate processes
3. **Better UX**: Focuses existing window instead of error
4. **Cleaner Code**: Removed duplicate lock code
5. **Clear Logging**: Know what's happening

## Technical Details

### Single Instance Lock
- Uses Electron's `app.requestSingleInstanceLock()`
- Creates a lock file in system temp directory
- Other instances detect the lock and quit
- Lock is released when app closes

### Window Focusing
When second instance is attempted:
1. Detects existing window
2. Restores if minimized
3. Shows if hidden
4. Brings to front
5. Gives focus

## Result

✅ Only one instance of the app can run at a time
✅ Attempting to start a second instance focuses the first
✅ Clean, predictable behavior
✅ No more duplicate instances!
