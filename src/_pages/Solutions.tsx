// Solutions.tsx
import React, { useState, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

import ScreenshotQueue from "../components/Queue/ScreenshotQueue"

import { ProblemStatementData } from "../types/solutions"
import SolutionCommands from "../components/Solutions/SolutionCommands"
import Debug from "./Debug"
import { useToast } from "../contexts/toast"
import { COMMAND_KEY } from "../utils/platform"

export const ContentSection = ({
  title,
  content,
  isLoading
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
}) => (
  <div className="space-y-2">
    <h2 className="text-[13px] font-medium text-white tracking-wide">
      {title}
    </h2>
    {isLoading ? (
      <div className="mt-4 flex">
        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
          Extracting problem statement...
        </p>
      </div>
    ) : (
      <div className="text-[13px] leading-[1.4] text-gray-100 max-w-[600px]">
        {content}
      </div>
    )}
  </div>
)
const SolutionSection = ({
  title,
  content,
  isLoading,
  currentLanguage
}: {
  title: string
  content: React.ReactNode
  isLoading: boolean
  currentLanguage: string
}) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    if (typeof content === "string") {
      try {
        // Method 1: Try navigator.clipboard (modern API)
        await navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (clipboardErr) {
        console.warn("navigator.clipboard failed, trying fallback:", clipboardErr)
        
        // Method 2: Fallback to document.execCommand (legacy but more reliable)
        const textArea = document.createElement('textarea')
        textArea.value = content
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          const successful = document.execCommand('copy')
          document.body.removeChild(textArea)
          
          if (successful) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          } else {
            console.error("All clipboard methods failed")
          }
        } catch (execErr) {
          document.body.removeChild(textArea)
          console.error("Failed to copy:", execErr)
        }
      }
    }
  }

  return (
    <div className="space-y-2 relative">
      <h2 className="text-[13px] font-medium text-white tracking-wide">
        {title}
      </h2>
      {isLoading ? (
        <div className="space-y-1.5">
          <div className="mt-4 flex">
            <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
              Loading solutions...
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full relative">
          <button
            onClick={copyToClipboard}
            className="absolute top-2 right-2 text-xs text-white bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <SyntaxHighlighter
            showLineNumbers
            language={currentLanguage == "golang" ? "go" : currentLanguage}
            style={dracula}
            customStyle={{
              maxWidth: "100%",
              margin: 0,
              padding: "1rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              backgroundColor: "rgba(22, 27, 34, 0.5)"
            }}
            wrapLongLines={true}
          >
            {content as string}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}

// ComplexitySection removed - app does not calculate complexity

export interface SolutionsProps {
  setView: (view: "queue" | "solutions" | "debug") => void
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
}
const Solutions: React.FC<SolutionsProps> = ({
  setView,
  credits,
  currentLanguage,
  setLanguage
}) => {
  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  const [debugProcessing, setDebugProcessing] = useState(false)
  const [problemStatementData, setProblemStatementData] =
    useState<ProblemStatementData | null>(null)
  const [solutionData, setSolutionData] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [htmlData, setHtmlData] = useState<string | null>(null)
  const [cssData, setCssData] = useState<string | null>(null)
  const [questionType, setQuestionType] = useState<string | null>(null)
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null)

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)

  const [isResetting, setIsResetting] = useState(false)

  interface Screenshot {
    id: string
    path: string
    preview: string
    timestamp: number
  }

  const [extraScreenshots, setExtraScreenshots] = useState<Screenshot[]>([])

  useEffect(() => {
    const fetchScreenshots = async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        console.log("Raw screenshot data:", existing)
        const screenshots = (Array.isArray(existing) ? existing : []).map(
          (p) => ({
            id: p.path,
            path: p.path,
            preview: p.preview,
            timestamp: Date.now()
          })
        )
        console.log("Processed screenshots:", screenshots)
        setExtraScreenshots(screenshots)
      } catch (error) {
        console.error("Error loading extra screenshots:", error)
        setExtraScreenshots([])
      }
    }

    fetchScreenshots()
  }, [solutionData])

  const { showToast } = useToast()

  useEffect(() => {
    // Height update logic
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    // Initialize resize observer
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(async () => {
        try {
          const existing = await window.electronAPI.getScreenshots()
          const screenshots = (Array.isArray(existing) ? existing : []).map(
            (p) => ({
              id: p.path,
              path: p.path,
              preview: p.preview,
              timestamp: Date.now()
            })
          )
          setExtraScreenshots(screenshots)
        } catch (error) {
          console.error("Error loading extra screenshots:", error)
        }
      }),
      window.electronAPI.onResetView(() => {
        // Set resetting state first
        setIsResetting(true)

        // Remove queries
        queryClient.removeQueries({
          queryKey: ["solution"]
        })
        queryClient.removeQueries({
          queryKey: ["new_solution"]
        })

        // Reset screenshots
        setExtraScreenshots([])

        // After a small delay, clear the resetting state
        setTimeout(() => {
          setIsResetting(false)
        }, 0)
      }),
      window.electronAPI.onSolutionStart(() => {
        // Every time processing starts, reset relevant states
        setSolutionData(null)
        setThoughtsData(null)
      }),
      window.electronAPI.onProblemExtracted((data: ProblemStatementData) => {
        queryClient.setQueryData(["problem_statement"], data)
      }),
      //if there was an error processing the initial solution
      window.electronAPI.onSolutionError((error: string) => {
        showToast("Processing Failed", error, "error")
        // Reset solutions in the cache to previous states
        const solution = queryClient.getQueryData(["solution"]) as {
          code: string
          thoughts: string[]
        } | null
        if (!solution) {
          setView("queue")
        }
        setSolutionData(solution?.code || null)
        setThoughtsData(solution?.thoughts || null)
        console.error("Processing error:", error)
      }),
      //when the initial solution is generated, we'll set the solution data to that
      window.electronAPI.onSolutionSuccess((data: any) => {
        if (!data) {
          console.warn("Received empty or invalid solution data")
          return
        }
        console.log({ data })
        const solutionData = {
          code: data.code,
          thoughts: data.thoughts,
          html: data.html,
          css: data.css,
          question_type: data.question_type,
          final_answer_highlight: data.final_answer_highlight
        }

        queryClient.setQueryData(["solution"], solutionData)
        setSolutionData(solutionData.code || null)
        setThoughtsData(solutionData.thoughts || null)
        setHtmlData(solutionData.html || null)
        setCssData(solutionData.css || null)
        setQuestionType(solutionData.question_type || null)
        setFinalAnswer(solutionData.final_answer_highlight || null)

        // Fetch latest screenshots when solution is successful
        const fetchScreenshots = async () => {
          try {
            const existing = await window.electronAPI.getScreenshots()
            const screenshots =
              existing.previews?.map((p: any) => ({
                id: p.path,
                path: p.path,
                preview: p.preview,
                timestamp: Date.now()
              })) || []
            setExtraScreenshots(screenshots)
          } catch (error) {
            console.error("Error loading extra screenshots:", error)
            setExtraScreenshots([])
          }
        }
        fetchScreenshots()
      }),

      //########################################################
      //DEBUG EVENTS
      //########################################################
      window.electronAPI.onDebugStart(() => {
        //we'll set the debug processing state to true and use that to render a little loader
        setDebugProcessing(true)
      }),
      //the first time debugging works, we'll set the view to debug and populate the cache with the data
      window.electronAPI.onDebugSuccess((data: any) => {
        queryClient.setQueryData(["new_solution"], data)
        setDebugProcessing(false)
      }),
      //when there was an error in the initial debugging, we'll show a toast and stop the little generating pulsing thing.
      window.electronAPI.onDebugError(() => {
        showToast(
          "Processing Failed",
          "There was an error debugging your code.",
          "error"
        )
        setDebugProcessing(false)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no extra screenshots to process.",
          "neutral"
        )
      }),
      // Removed out of credits handler - unlimited credits in this version
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  useEffect(() => {
    setProblemStatementData(
      queryClient.getQueryData(["problem_statement"]) || null
    )
    setSolutionData(queryClient.getQueryData(["solution"]) || null)

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === "problem_statement") {
        setProblemStatementData(
          queryClient.getQueryData(["problem_statement"]) || null
        )
      }
      if (event?.query.queryKey[0] === "solution") {
        const solution = queryClient.getQueryData(["solution"]) as {
          code: string
          thoughts: string[]
        } | null

        setSolutionData(solution?.code ?? null)
        setThoughtsData(solution?.thoughts ?? null)
      }
    })
    return () => unsubscribe()
  }, [queryClient])

  // Listen for copy HTML event from global shortcut (Ctrl+Shift+C)
  useEffect(() => {
    const cleanup = window.electronAPI.onCopyHtmlToClipboard(async () => {
      try {
        let dataToCopy = ""
        let message = "Code copied to clipboard"
        
        // For web dev questions, prefer the separate HTML field
        if (questionType === "web_dev" && htmlData) {
          dataToCopy = htmlData
          message = "HTML copied to clipboard"
        } 
        // Fallback to full solution data
        else if (solutionData) {
          dataToCopy = solutionData
        }
        
        if (dataToCopy) {
          // Try multiple clipboard methods for better reliability
          try {
            // Method 1: Try navigator.clipboard (modern API)
            await navigator.clipboard.writeText(dataToCopy)
            showToast("Copied!", message, "success")
          } catch (clipboardErr) {
            console.warn("navigator.clipboard failed, trying fallback:", clipboardErr)
            
            // Method 2: Fallback to document.execCommand (legacy but more reliable)
            const textArea = document.createElement('textarea')
            textArea.value = dataToCopy
            textArea.style.position = 'fixed'
            textArea.style.left = '-999999px'
            textArea.style.top = '-999999px'
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            
            try {
              const successful = document.execCommand('copy')
              document.body.removeChild(textArea)
              
              if (successful) {
                showToast("Copied!", message, "success")
              } else {
                throw new Error("execCommand failed")
              }
            } catch (execErr) {
              document.body.removeChild(textArea)
              console.error("All clipboard methods failed:", execErr)
              showToast("Error", "Failed to copy to clipboard. Please try again.", "error")
            }
          }
        } else {
          showToast("No Code", "No code available to copy", "neutral")
        }
      } catch (err) {
        console.error("Failed to copy:", err)
        showToast("Error", "Failed to copy to clipboard", "error")
      }
    })

    return () => {
      cleanup()
    }
  }, [solutionData, htmlData, questionType, showToast])

  // Listen for copy CSS event from global shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const cleanup = window.electronAPI.onCopyCssToClipboard(async () => {
      try {
        let cssContent = ""
        
        // First, try to use the separate CSS data if available
        if (cssData) {
          cssContent = cssData
        } 
        // Fallback: Extract CSS from <style> tags in the solution
        else if (solutionData) {
          const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
          const matches = []
          let match
          
          while ((match = styleRegex.exec(solutionData)) !== null) {
            if (match[1] && match[1].trim()) {
              matches.push(match[1].trim())
            }
          }
          
          if (matches.length > 0) {
            cssContent = matches.join('\n\n')
          }
        }
        
        // Remove markdown code blocks if present (```css or ```)
        if (cssContent) {
          cssContent = cssContent
            .replace(/^```css\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim()
        }
        
        if (cssContent) {
          // Try multiple clipboard methods for better reliability
          try {
            // Method 1: Try navigator.clipboard (modern API)
            await navigator.clipboard.writeText(cssContent)
            showToast("Copied!", "CSS copied to clipboard", "success")
          } catch (clipboardErr) {
            console.warn("navigator.clipboard failed, trying fallback:", clipboardErr)
            
            // Method 2: Fallback to document.execCommand (legacy but more reliable)
            const textArea = document.createElement('textarea')
            textArea.value = cssContent
            textArea.style.position = 'fixed'
            textArea.style.left = '-999999px'
            textArea.style.top = '-999999px'
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()
            
            try {
              const successful = document.execCommand('copy')
              document.body.removeChild(textArea)
              
              if (successful) {
                showToast("Copied!", "CSS copied to clipboard", "success")
              } else {
                throw new Error("execCommand failed")
              }
            } catch (execErr) {
              document.body.removeChild(textArea)
              console.error("All clipboard methods failed:", execErr)
              showToast("Error", "Failed to copy CSS to clipboard. Please try again.", "error")
            }
          }
        } else {
          showToast("No CSS", "No CSS found in the solution", "neutral")
        }
      } catch (err) {
        console.error("Failed to copy CSS:", err)
        showToast("Error", "Failed to copy CSS to clipboard", "error")
      }
    })

    return () => {
      cleanup()
    }
  }, [solutionData, cssData, showToast])

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        // Fetch and update screenshots after successful deletion
        const existing = await window.electronAPI.getScreenshots()
        const screenshots = (Array.isArray(existing) ? existing : []).map(
          (p) => ({
            id: p.path,
            path: p.path,
            preview: p.preview,
            timestamp: Date.now()
          })
        )
        setExtraScreenshots(screenshots)
      } else {
        console.error("Failed to delete extra screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot", "error")
      }
    } catch (error) {
      console.error("Error deleting extra screenshot:", error)
      showToast("Error", "Failed to delete the screenshot", "error")
    }
  }

  return (
    <>
      {!isResetting && queryClient.getQueryData(["new_solution"]) ? (
        <Debug
          isProcessing={debugProcessing}
          setIsProcessing={setDebugProcessing}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
        />
      ) : (
        <div ref={contentRef} className="relative">
          <div className="space-y-3 px-4 py-3">
          {/* Conditionally render the screenshot queue if solutionData is available */}
          {solutionData && (
            <div className="bg-transparent w-fit">
              <div className="pb-3">
                <div className="space-y-3 w-fit">
                  <ScreenshotQueue
                    isLoading={debugProcessing}
                    screenshots={extraScreenshots}
                    onDeleteScreenshot={handleDeleteExtraScreenshot}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navbar of commands with the SolutionsHelper */}
          <SolutionCommands
            onTooltipVisibilityChange={handleTooltipVisibilityChange}
            isProcessing={!problemStatementData || !solutionData}
            extraScreenshots={extraScreenshots}
            credits={credits}
            currentLanguage={currentLanguage}
            setLanguage={setLanguage}
          />

          {/* Main Content - Modified width constraints */}
          <div className="w-full text-sm text-black bg-black/60 rounded-md">
            <div className="rounded-lg overflow-hidden">
              <div className="px-4 py-3 space-y-4 max-w-full">
                {!solutionData && (
                  <>
                    <ContentSection
                      title="Problem Statement"
                      content={problemStatementData?.problem_statement}
                      isLoading={!problemStatementData}
                    />
                    {problemStatementData && (
                      <div className="mt-4 flex">
                        <p className="text-xs bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-pulse">
                          Generating solutions...
                        </p>
                      </div>
                    )}
                  </>
                )}

                {solutionData && (
                  <>
                    <ContentSection
                      title={`My Thoughts (${COMMAND_KEY} + Arrow keys to scroll)`}
                      content={
                        thoughtsData && (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              {thoughtsData.map((thought, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
                                  <div>{thought}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      isLoading={!thoughtsData}
                    />

                    {/* MCQ Final Answer Highlight */}
                    {questionType === "multiple_choice" && finalAnswer && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-lg">
                        <h2 className="text-[13px] font-medium text-white tracking-wide mb-2">
                          ✓ FINAL ANSWER
                        </h2>
                        <p className="text-lg font-bold text-green-400">
                          {finalAnswer}
                        </p>
                      </div>
                    )}

                    <SolutionSection
                      title="Solution"
                      content={solutionData}
                      isLoading={!solutionData}
                      currentLanguage={currentLanguage}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  )
}

export default Solutions
