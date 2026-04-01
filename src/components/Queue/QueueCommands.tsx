import React, { useState, useEffect, useRef } from "react"
import { createRoot } from "react-dom/client"

import { useToast } from "../../contexts/toast"
import { LanguageSelector } from "../shared/LanguageSelector"
import { COMMAND_KEY } from "../../utils/platform"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  screenshotCount?: number
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshotCount = 0,
  credits,
  currentLanguage,
  setLanguage,
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [showAllShortcuts, setShowAllShortcuts] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { showToast } = useToast()
  const [currentMode, setCurrentMode] = useState<'mcq' | 'coding'>('coding')
  const [currentModel, setCurrentModel] = useState<string>('kimi')
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false)
  const [shouldBlink, setShouldBlink] = useState<boolean>(false)
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)



  // Load current mode and model on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await window.electronAPI.getConfig()
        setCurrentMode(config.mode || 'coding')
        // Determine model name from config
        const modelName = config.groqModel || config.solutionModel || config.model || ''
        if (modelName.includes('kimi-k2')) {
          setCurrentModel('kimi')
        } else if (modelName.includes('gpt') || modelName.includes('120b')) {
          setCurrentModel('gpt-oss')
        } else {
          setCurrentModel('kimi')
        }
        
        // Check current fallback status
        try {
          const fallbackStatus = await window.electronAPI.getFallbackStatus()
          setIsUsingFallback(fallbackStatus.isUsingFallback)
          console.log('[UI] Initial fallback status:', fallbackStatus.isUsingFallback)
        } catch (fallbackError) {
          console.warn('[UI] Could not get initial fallback status:', fallbackError)
          // Default to false if we can't get the status
          setIsUsingFallback(false)
        }
      } catch (error) {
        console.error("Failed to load config:", error)
      }
    }
    loadConfig()
  }, [])

  // Listen for mode changes from keyboard shortcut (Ctrl+/)
  useEffect(() => {
    const cleanup = window.electronAPI.onModeChanged((data: { mode: string; icon: string; description: string }) => {
      setCurrentMode(data.mode as 'mcq' | 'coding')
    })
    return () => cleanup()
  }, [])

  // Listen for model changes from keyboard shortcut (Ctrl+\)
  useEffect(() => {
    const cleanup = window.electronAPI.onModelChanged((data: { model: string; provider: string }) => {
      if (data.model.includes('kimi-k2')) {
        setCurrentModel('kimi')
      } else if (data.model.includes('gpt') || data.model.includes('120b')) {
        setCurrentModel('gpt-oss')
      }
    })
    return () => cleanup()
  }, [])

  // Listen for fallback status changes (rate limiting)
  useEffect(() => {
    const cleanup = window.electronAPI.onModelFallbackStatus((data: { isUsingFallback: boolean; remainingSeconds: number }) => {
      setIsUsingFallback(data.isUsingFallback)
      
      if (data.isUsingFallback) {
        console.log(`[UI] Fallback active: ${data.remainingSeconds}s remaining`)
        
        // Start blinking animation
        setShouldBlink(true)
        
        // Clear any existing timer
        if (blinkTimerRef.current) {
          clearTimeout(blinkTimerRef.current)
        }
        
        // Stop blinking after 30 seconds (same as cooldown)
        blinkTimerRef.current = setTimeout(() => {
          setShouldBlink(false)
          console.log('[UI] Blink animation stopped after 30s')
        }, 30000)
      } else {
        console.log('[UI] Fallback ended, back to normal model')
        setShouldBlink(false)
        
        // Restore model indicator from current config.
        window.electronAPI.getConfig()
          .then((cfg) => {
            const modelName = cfg.groqModel || cfg.solutionModel || cfg.model || ''
            if (modelName.includes('kimi-k2')) {
              setCurrentModel('kimi')
            } else if (modelName.includes('gpt') || modelName.includes('120b')) {
              setCurrentModel('gpt-oss')
            }
          })
          .catch(() => {
            setCurrentModel('kimi')
          })
        
        // Clear timer if fallback ends early
        if (blinkTimerRef.current) {
          clearTimeout(blinkTimerRef.current)
          blinkTimerRef.current = null
        }
      }
    })
    
    return () => {
      cleanup()
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current)
      }
    }
  }, [])

  // Toggle mode function
  const toggleMode = async () => {
    const newMode = currentMode === 'mcq' ? 'coding' : 'mcq'
    setCurrentMode(newMode)
    
    try {
      await window.electronAPI.updateConfig({ mode: newMode })
      const modeInfo = newMode === 'mcq' 
        ? { icon: '📝', description: 'MCQ Mode - Optimized for multiple choice questions' }
        : { icon: '💻', description: 'Coding Mode - Optimized for programming and web dev' }
      showToast(`${modeInfo.icon} Mode Changed`, modeInfo.description, 'success')
    } catch (error) {
      console.error("Failed to update mode:", error)
      showToast('Error', 'Failed to change mode', 'error')
    }
  }

  // Toggle model function
  const toggleModel = async () => {
    const newModel = currentModel === 'kimi' ? 'gpt-oss' : 'kimi'
    setCurrentModel(newModel)
    
    try {
      const modelName = newModel === 'kimi' 
        ? 'moonshotai/kimi-k2-instruct'
        : 'openai/gpt-oss-120b'
      
      await window.electronAPI.updateConfig({ 
        groqModel: modelName,
        solutionModel: modelName 
      })
      
      const modelInfo = newModel === 'kimi'
        ? { name: 'Kimi K2 Instruct', color: 'green' }
        : { name: 'GPT OSS 120B', color: 'red' }
      
      showToast('Model Changed', `Switched to ${modelInfo.name}`, 'success')
    } catch (error) {
      console.error("Failed to update model:", error)
      showToast('Error', 'Failed to change model', 'error')
    }
  }

  // Extract the repeated language selection logic into a separate function
  const extractLanguagesAndUpdate = (direction?: 'next' | 'prev') => {
    const hiddenRenderContainer = document.createElement('div');
    hiddenRenderContainer.style.position = 'absolute';
    hiddenRenderContainer.style.left = '-9999px';
    document.body.appendChild(hiddenRenderContainer);
    
    const root = createRoot(hiddenRenderContainer);
    root.render(
      <LanguageSelector 
        currentLanguage={currentLanguage} 
        setLanguage={() => {}}
      />
    );
    
    // Use requestAnimationFrame for immediate DOM update
    requestAnimationFrame(() => {
      const selectElement = hiddenRenderContainer.querySelector('select');
      if (selectElement) {
        const options = Array.from(selectElement.options);
        const values = options.map(opt => opt.value);
        
        const currentIndex = values.indexOf(currentLanguage);
        let newIndex = currentIndex;
        
        if (direction === 'prev') {
          newIndex = (currentIndex - 1 + values.length) % values.length;
        } else {
          newIndex = (currentIndex + 1) % values.length;
        }
        
        if (newIndex !== currentIndex) {
          setLanguage(values[newIndex]);
          window.electronAPI.updateConfig({ language: values[newIndex] });
        }
      }
      
      root.unmount();
      document.body.removeChild(hiddenRenderContainer);
    });
  };

  useEffect(() => {
    // Immediate update - no delay needed
    let tooltipHeight = 0
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible, showAllShortcuts, onTooltipVisibilityChange])

  const handleSignOut = async () => {
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear API key in config
      await window.electronAPI.updateConfig({
        apiKey: '',
        groqApiKey: ''
      });
      
      showToast('Success', 'Logged out successfully', 'success');
      
      // Force hard reload to reset all state
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 500);
    } catch (err) {
      console.error("Error logging out:", err);
      showToast('Error', 'Failed to log out', 'error');
    }
  }

  const handleMouseEnter = () => {
    // Clear any pending hide timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    // Minimal delay before hiding to prevent accidental closes
    hoverTimeoutRef.current = setTimeout(() => {
      setIsTooltipVisible(false)
      setShowAllShortcuts(false)
    }, 50)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])





  return (
    <div>
      <div className="pt-2 w-fit">
        <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-1.5 px-3 flex items-center justify-center gap-3">
          {/* Left side indicators - stacked vertically */}
          <div className="flex flex-col gap-1.5 pr-2.5 border-r border-white/20">
            {/* Mode Switcher Button - Top */}
            <div
              className="flex items-center justify-center cursor-pointer rounded hover:bg-white/10 transition-colors w-5 h-5"
              onClick={toggleMode}
              title={`Switch to ${currentMode === 'mcq' ? 'Coding' : 'MCQ'} Mode (${COMMAND_KEY}+/)`}
            >
              <span className="text-[14px]">{currentMode === 'mcq' ? '📝' : '💻'}</span>
            </div>

            {/* Model Indicator - Bottom - Clickable */}
            <div 
              className="flex items-center justify-center w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={toggleModel}
              title={
                isUsingFallback 
                  ? 'Rate Limited - Using GPT-OSS Fallback' 
                  : `Current Model: ${currentModel === 'kimi' ? 'Kimi K2 Instruct' : 'GPT OSS 120B'} (Click to switch, ${COMMAND_KEY}+\\)`
              }
            >
              <div className={`w-2.5 h-2.5 rounded-full ${
                isUsingFallback 
                  ? `bg-red-500 shadow-lg shadow-red-500/50 ${shouldBlink ? 'animate-pulse' : ''}` 
                  : currentModel === 'kimi' 
                    ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                    : 'bg-orange-500 shadow-lg shadow-orange-500/50'
              }`}></div>
            </div>
          </div>

          {/* Quick Solve (MCQ + Kimi + Not Rate Limited) or Take Screenshot (other modes) */}
          {currentMode === 'mcq' && currentModel === 'kimi' && !isUsingFallback ? (
            <div
              className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-yellow-500/20 transition-colors bg-yellow-500/10 border border-yellow-500/30"
              style={{ width: '165px' }}
              onClick={async () => {
                try {
                  // Quick solve: Reset → Screenshot → Process
                  await window.electronAPI.triggerReset()
                  await new Promise(resolve => setTimeout(resolve, 100))
                  await window.electronAPI.triggerScreenshot()
                  await new Promise(resolve => setTimeout(resolve, 200))
                  await window.electronAPI.triggerProcessScreenshots()
                } catch (error) {
                  showToast("Error", "Quick solve failed", "error")
                }
              }}
            >
              <span className="text-[11px] leading-none text-yellow-400 font-medium whitespace-nowrap">Quick Solve</span>
              <div className="flex gap-1 ml-auto">
                <button className="bg-yellow-500/20 rounded-md px-1.5 py-1 text-[11px] leading-none text-yellow-400">
                  {COMMAND_KEY}
                </button>
                <button className="bg-yellow-500/20 rounded-md px-1.5 py-1 text-[11px] leading-none text-yellow-400">
                  D
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
              style={{ width: '165px' }}
              onClick={async () => {
                try {
                  const result = await window.electronAPI.triggerScreenshot()
                  if (!result.success) {
                    console.error("Failed to take screenshot:", result.error)
                    showToast("Error", "Failed to take screenshot", "error")
                  }
                } catch (error) {
                  console.error("Error taking screenshot:", error)
                  showToast("Error", "Failed to take screenshot", "error")
                }
              }}
            >
              <span className="text-[11px] leading-none text-white/90 font-medium whitespace-nowrap">Take Screenshot</span>
              <div className="flex gap-1 ml-auto">
                <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                  {COMMAND_KEY}
                </button>
                <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                  H
                </button>
              </div>
            </div>
          )}

          {/* Show screenshot count if any */}
          {screenshotCount > 0 && (
            <div className="text-[10px] text-white/50">
              {screenshotCount}/5
            </div>
          )}

          {/* Solve Command - show when screenshots exist */}
          {screenshotCount > 0 && (
            <div
              className={`flex flex-col cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                credits <= 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={async () => {
                try {
                  const result = await window.electronAPI.triggerProcessScreenshots()
                  if (!result.success) {
                    showToast("Error", "Failed to process screenshots", "error")
                  }
                } catch (error) {
                  showToast("Error", "Failed to process screenshots", "error")
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] leading-none">Solve</span>
                <div className="flex gap-1 ml-2">
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    {COMMAND_KEY}
                  </button>
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    ↵
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="mx-2 h-4 w-px bg-white/20" />

          {/* Settings with Tooltip */}
          <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Gear icon */}
            <div className="w-4 h-4 flex items-center justify-center cursor-pointer text-white/70 hover:text-white/90 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>

            {/* Tooltip Content */}
            {isTooltipVisible && (
              <div
                ref={tooltipRef}
                className="fixed"
                style={{ 
                  zIndex: 100,
                  left:'0px',
                  top: '60px'
                }}
              >
                <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg w-[360px]">
                  <div className="space-y-4">
                    {!showAllShortcuts ? (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Quick Actions</h3>
                        </div>
                        <div className="space-y-3">
                          {/* Toggle Window */}
                          <div className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="truncate">Toggle Window</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  Alt
                                </span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  1
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-white/50 mt-1">Also: {COMMAND_KEY}+B, {COMMAND_KEY}+I</p>
                          </div>

                          {/* Quick Solve */}
                          <div className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors bg-yellow-500/5 border border-yellow-500/20">
                            <div className="flex items-center justify-between">
                              <span className="truncate text-yellow-400">⚡ Quick Solve</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <span className="bg-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] leading-none text-yellow-400">
                                  {COMMAND_KEY}
                                </span>
                                <span className="bg-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] leading-none text-yellow-400">
                                  D
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-white/50 mt-1">Reset → Screenshot → Solve in one click</p>
                          </div>

                          {/* Screenshot */}
                          <div className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="truncate">Take Screenshot</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  {COMMAND_KEY}
                                </span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  H
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-white/50 mt-1">Also: {COMMAND_KEY}+M</p>
                          </div>

                          {/* Solve */}
                          <div className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="truncate">Solve</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  {COMMAND_KEY}
                                </span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  ↵
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Reset */}
                          <div className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="truncate">Reset</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  {COMMAND_KEY}
                                </span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                                  R
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">All Keyboard Shortcuts</h3>
                          <button
                            onClick={() => setShowAllShortcuts(false)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                          >
                            ← Back
                          </button>
                        </div>
                        
                        {/* Screenshot & Processing */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] text-white/50 uppercase tracking-wider">Screenshot & Processing</h4>
                          <ShortcutRow label="Take Screenshot" keys={[COMMAND_KEY, "H"]} alias={`${COMMAND_KEY}+M`} />
                          <ShortcutRow label="Process/Solve" keys={[COMMAND_KEY, "↵"]} />
                          <ShortcutRow label="Quick Solve" keys={[COMMAND_KEY, "D"]} />
                          <ShortcutRow label="Reset" keys={[COMMAND_KEY, "R"]} />
                          <ShortcutRow label="Delete Last Screenshot" keys={[COMMAND_KEY, "⌫"]} />
                        </div>

                        {/* Window Controls */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] text-white/50 uppercase tracking-wider">Window Controls</h4>
                          <ShortcutRow label="Toggle Visibility" keys={["Alt", "1"]} alias={`${COMMAND_KEY}+B, ${COMMAND_KEY}+I`} />
                          <ShortcutRow label="Center Window" keys={[COMMAND_KEY, "N"]} />
                          <ShortcutRow label="Move Left" keys={[COMMAND_KEY, "←"]} />
                          <ShortcutRow label="Move Right" keys={[COMMAND_KEY, "→"]} />
                          <ShortcutRow label="Move Up" keys={[COMMAND_KEY, "↑"]} />
                          <ShortcutRow label="Move Down" keys={[COMMAND_KEY, "↓"]} />
                          <ShortcutRow label="Decrease Opacity" keys={[COMMAND_KEY, "["]} />
                          <ShortcutRow label="Increase Opacity" keys={[COMMAND_KEY, "]"]} />
                        </div>

                        {/* Zoom */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] text-white/50 uppercase tracking-wider">Zoom</h4>
                          <ShortcutRow label="Zoom In" keys={[COMMAND_KEY, "="]} />
                          <ShortcutRow label="Zoom Out" keys={[COMMAND_KEY, "-"]} />
                          <ShortcutRow label="Reset Zoom" keys={[COMMAND_KEY, "0"]} />
                        </div>

                        {/* Mode & Model */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] text-white/50 uppercase tracking-wider">Mode</h4>
                          <ShortcutRow label="Toggle Mode (MCQ/Coding)" keys={[COMMAND_KEY, "/"]} />
                        </div>

                        {/* Copy */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] text-white/50 uppercase tracking-wider">Copy</h4>
                          <ShortcutRow label="Copy Answer/Code" keys={[COMMAND_KEY, "⇧", "C"]} />
                          <ShortcutRow label="Copy CSS" keys={[COMMAND_KEY, "⇧", "D"]} />
                        </div>

                        {/* Typing */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] text-white/50 uppercase tracking-wider">Clipboard Typing</h4>
                          <ShortcutRow label="Type Clipboard" keys={[COMMAND_KEY, "⇧", "V"]} />
                          <ShortcutRow label="Stop Typing" keys={[COMMAND_KEY, "⇧", "X"]} alias="Esc, F1-F12" />
                          <ShortcutRow label="Pause/Resume" keys={["Alt", "⌫"]} />
                          <ShortcutRow label="Faster Typing" keys={["Alt", "="]} />
                          <ShortcutRow label="Slower Typing" keys={["Alt", "-"]} />
                        </div>

                        {/* App */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] text-white/50 uppercase tracking-wider">App</h4>
                          <ShortcutRow label="Quit" keys={[COMMAND_KEY, "Q"]} />
                        </div>
                      </>
                    )}

                    {/* Settings Section */}
                    <div className="pt-3 mt-3 border-t border-white/10 space-y-3">
                      {/* View All Shortcuts Button */}
                      {!showAllShortcuts && (
                        <div className="px-2">
                          <button
                            onClick={() => setShowAllShortcuts(true)}
                            className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 px-3 py-2 rounded text-[11px] flex items-center justify-center gap-2 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                              <rect x="2" y="4" width="20" height="16" rx="2"/>
                              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12"/>
                            </svg>
                            View All Shortcuts
                          </button>
                        </div>
                      )}

                      {/* Mode Info */}
                      <div className="px-2">
                        <div className="flex items-center justify-between px-2 py-1">
                          <span className="text-[11px] text-white/70">Current Mode</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/90">
                              {currentMode === 'mcq' ? '📝 MCQ' : '💻 Coding'}
                            </span>
                          </div>
                        </div>
                        <p className="text-[9px] text-white/50 px-2 mt-1">
                          {currentMode === 'mcq' 
                            ? 'Optimized for multiple choice questions with clean, concise answers'
                            : 'Optimized for programming, web dev, and detailed explanations'}
                        </p>
                      </div>

                      {/* Language */}
                      <div className="px-2">
                        <div 
                          className="flex items-center justify-between cursor-pointer hover:bg-white/10 rounded px-2 py-1 transition-colors"
                          onClick={() => extractLanguagesAndUpdate('next')}
                        >
                          <span className="text-[11px] text-white/70">Language</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/90">{currentLanguage}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-white/40">
                              <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* API Settings */}
                      <div className="px-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/70">API Settings</span>
                          <button
                            className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-[10px]"
                            onClick={() => window.electronAPI.openSettingsPortal()}
                          >
                            Settings
                          </button>
                        </div>
                      </div>

                      {/* Log Out */}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 text-[11px] text-red-400 hover:text-red-300 transition-colors w-full px-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for shortcut rows
const ShortcutRow: React.FC<{
  label: string
  keys: string[]
  alias?: string
  highlight?: boolean
}> = ({ label, keys, alias, highlight }) => (
  <div className={`flex items-center justify-between py-1 px-2 rounded ${highlight ? 'bg-yellow-500/10' : ''}`}>
    <span className={`text-[11px] ${highlight ? 'text-yellow-400' : 'text-white/80'}`}>{label}</span>
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {keys.map((key, i) => (
          <span key={i} className={`px-1.5 py-0.5 rounded text-[9px] ${highlight ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/70'}`}>
            {key}
          </span>
        ))}
      </div>
      {alias && <span className="text-[9px] text-white/40">({alias})</span>}
    </div>
  </div>
)

export default QueueCommands