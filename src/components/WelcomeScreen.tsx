import React, { useState } from 'react';
import { Button } from './ui/button';

interface WelcomeScreenProps {
  onOpenSettings: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenSettings }) => {
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'shortcuts'>('home');

  const tutorialSteps = [
    {
      title: "Welcome to CheatSheet AI! 🎉",
      content: "Your AI-powered assistant for coding problems, MCQs, and web development. This comprehensive tutorial will guide you through all the features in 8 easy steps.",
      icon: "🚀"
    },
    {
      title: "Step 1: Add Your API Key 🔑",
      content: "Click 'Open Settings' below to add your OpenAI, Gemini, or Claude API key. This is required to use the AI features. You can get API keys from their respective websites.",
      icon: "⚙️",
      action: "Open Settings"
    },
    {
      title: "Step 2: Quick Answer Mode ⚡",
      content: "Press Ctrl+D to instantly capture a screenshot and get an answer. This is the fastest way to solve problems! It automatically resets, captures, and processes in one action.",
      icon: "⌨️",
      highlight: "Ctrl+D"
    },
    {
      title: "Step 3: Manual Screenshot Mode 📸",
      content: "For more control, use Ctrl+H to take screenshots one by one. You can capture multiple screenshots (like question + code), then press Ctrl+Enter to process them all together.",
      icon: "📷",
      highlight: "Ctrl+H"
    },
    {
      title: "Step 4: Navigate & Control 🪟",
      content: "Use Ctrl+Arrow Keys to move the window around your screen. Press Ctrl+B or Alt+1 to hide/show the window. This helps you position CheatSheet AI exactly where you need it.",
      icon: "🎮",
      highlight: "Ctrl+Arrows"
    },
    {
      title: "Step 5: Copy Code Instantly 📋",
      content: "For web development questions, press Ctrl+Shift+C to copy HTML code and Ctrl+Shift+D to copy CSS. Then use Ctrl+Shift+V to type the clipboard content (bypasses paste restrictions).",
      icon: "💻",
      highlight: "Ctrl+Shift+C/D/V"
    },
    {
      title: "Step 6: Scroll Long Solutions 📜",
      content: "When viewing long code solutions, use Ctrl+Up/Down to scroll through the content. This is especially useful for reading multi-line code explanations and implementations.",
      icon: "🔍",
      highlight: "Ctrl+↑↓"
    },
    {
      title: "Step 7: Switch AI Models 🤖",
      content: "Press Ctrl+\\ or Alt+2 to cycle through different AI models (like GPT-4o, GPT-4o-mini, or Gemini variants). Each model has different strengths and speeds.",
      icon: "🔄",
      highlight: "Ctrl+\\"
    },
    {
      title: "Step 8: You're Ready! ✨",
      content: "Navigate to any question, press Ctrl+D, and watch the magic happen. Check the 'All Shortcuts' tab for a complete reference. Press Ctrl+R to reset anytime. Happy coding!",
      icon: "🎯"
    }
  ];

  const currentStep = tutorialSteps[tutorialStep];

  if (!showTutorial) {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="w-full max-w-4xl h-[600px] bg-gradient-to-br from-gray-900 to-black border-2 border-green-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-b border-green-500/30 flex-shrink-0">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    CheatSheet AI
                    <span className="text-sm font-normal px-3 py-1 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
                      Open Source
                    </span>
                  </h1>
                  <p className="text-green-400/70 text-sm">AI-Powered Problem Solver</p>
                </div>
              </div>
              <Button
                onClick={() => setShowTutorial(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                Show Tutorial
              </Button>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 px-6 pb-4">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'home'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                🏠 Home
              </button>
              <button
                onClick={() => setActiveTab('shortcuts')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'shortcuts'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                ⌨️ All Shortcuts
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'home' ? (
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Essential Shortcuts */}
                <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <span>Essential Shortcuts</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                    <span className="text-white/80 text-sm">Quick Answer</span>
                    <kbd className="px-3 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30 text-sm font-mono">Ctrl+D</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                    <span className="text-white/80 text-sm">Take Screenshot</span>
                    <kbd className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 text-sm font-mono">Ctrl+H</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                    <span className="text-white/80 text-sm">Process</span>
                    <kbd className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 text-sm font-mono">Ctrl+Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                    <span className="text-white/80 text-sm">Toggle Visibility</span>
                    <kbd className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 text-sm font-mono">Ctrl+B</kbd>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <span>Copy & Paste</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                    <span className="text-white/80 text-sm">Copy HTML/Code</span>
                    <kbd className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 text-sm font-mono">Ctrl+Shift+C</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                    <span className="text-white/80 text-sm">Copy CSS</span>
                    <kbd className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded border border-pink-500/30 text-sm font-mono">Ctrl+Shift+D</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                    <span className="text-white/80 text-sm">Type Clipboard</span>
                    <kbd className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30 text-sm font-mono">Ctrl+Shift+V</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Features & Setup */}
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border-2 border-yellow-500/40 rounded-xl p-5">
                <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>API Key Required</span>
                </h3>
                <p className="text-yellow-200/70 text-sm mb-4">
                  Add your OpenAI, Gemini, or Claude API key to start using CheatSheet AI.
                </p>
                <Button 
                  onClick={onOpenSettings}
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-3 shadow-lg"
                >
                  🔑 Open Settings & Add API Key
                </Button>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <span>Features</span>
                </h3>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Auto-detects MCQ, Python, Web Dev, and Text questions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Generates complete HTML/CSS from design screenshots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Conversational debugging with additional screenshots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Type clipboard to bypass paste restrictions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Cycle through multiple AI models instantly</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  <span>Quick Start</span>
                </h3>
                <ol className="space-y-2 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-semibold">1.</span>
                    <span>Add your API key in settings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-semibold">2.</span>
                    <span>Navigate to any question</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 font-semibold">3.</span>
                    <span>Press <kbd className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-mono">Ctrl+D</kbd> for instant answer</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
            ) : (
              /* Shortcuts Tab */
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Complete Keyboard Shortcuts</h2>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Essential Actions */}
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <span>Essential Actions</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Quick Answer</span>
                        <kbd className="px-3 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30 text-sm font-mono">Ctrl+D</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Take Screenshot</span>
                        <kbd className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 text-sm font-mono">Ctrl+H</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Process Screenshots</span>
                        <kbd className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 text-sm font-mono">Ctrl+Enter</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Reset/Clear</span>
                        <kbd className="px-3 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30 text-sm font-mono">Ctrl+R</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Delete Last Screenshot</span>
                        <kbd className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 text-sm font-mono">Ctrl+Backspace</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Window Control */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <span className="text-xl">🪟</span>
                      <span>Window Control</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Toggle Visibility</span>
                        <kbd className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 text-sm font-mono">Ctrl+B / Alt+1</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Move Left</span>
                        <kbd className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30 text-sm font-mono">Ctrl+←</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Move Right</span>
                        <kbd className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30 text-sm font-mono">Ctrl+→</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Move Up</span>
                        <kbd className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30 text-sm font-mono">Ctrl+↑</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Move Down</span>
                        <kbd className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30 text-sm font-mono">Ctrl+↓</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Quit App</span>
                        <kbd className="px-3 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30 text-sm font-mono">Ctrl+Q</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Copy & Paste */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <span className="text-xl">📋</span>
                      <span>Copy & Paste</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Copy HTML/Code</span>
                        <kbd className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 text-sm font-mono">Ctrl+Shift+C</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Copy CSS</span>
                        <kbd className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded border border-pink-500/30 text-sm font-mono">Ctrl+Shift+D</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Type Clipboard (Fast)</span>
                        <kbd className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30 text-sm font-mono">Ctrl+Shift+V</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Stop Typing</span>
                        <kbd className="px-3 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30 text-sm font-mono">Ctrl+Shift+X</kbd>
                      </div>
                    </div>
                  </div>

                  {/* View & Navigation */}
                  <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <span className="text-xl">🔍</span>
                      <span>View & Navigation</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Scroll Content</span>
                        <kbd className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 text-sm font-mono">Ctrl+↑↓</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Decrease Opacity</span>
                        <kbd className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 text-sm font-mono">Ctrl+[</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Increase Opacity</span>
                        <kbd className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 text-sm font-mono">Ctrl+]</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Zoom Out</span>
                        <kbd className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 text-sm font-mono">Ctrl+-</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Reset Zoom</span>
                        <kbd className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 text-sm font-mono">Ctrl+0</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Zoom In</span>
                        <kbd className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded border border-orange-500/30 text-sm font-mono">Ctrl+=</kbd>
                      </div>
                    </div>
                  </div>

                  {/* AI & Models */}
                  <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <span className="text-xl">🤖</span>
                      <span>AI & Models</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Cycle Models</span>
                        <kbd className="px-3 py-1 bg-violet-500/20 text-violet-400 rounded border border-violet-500/30 text-sm font-mono">Ctrl+\ / Alt+2</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Aliases */}
                  <div className="bg-gradient-to-br from-gray-500/10 to-slate-500/10 border border-gray-500/30 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <span className="text-xl">🔄</span>
                      <span>Alternative Shortcuts</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Take Screenshot</span>
                        <kbd className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded border border-gray-500/30 text-sm font-mono">Ctrl+M</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
                        <span className="text-white/80 text-sm">Toggle Visibility</span>
                        <kbd className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded border border-gray-500/30 text-sm font-mono">Ctrl+I</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-gray-900 to-black border-t border-white/10 p-4 text-center flex-shrink-0">
            <p className="text-white/50 text-xs">
              Press <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono">Ctrl+B</kbd> or <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono">Alt+1</kbd> to hide/show this window anytime
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="w-full max-w-4xl h-[600px] bg-gradient-to-br from-gray-900 to-black border-2 border-green-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Tutorial Progress */}
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-b border-green-500/30 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/70 text-sm">Tutorial</span>
            <span className="text-white/70 text-sm">Step {tutorialStep + 1} of {tutorialSteps.length}</span>
          </div>
          <div className="w-full bg-black/30 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((tutorialStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Tutorial Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-2xl">
            <div className="text-5xl mb-6">{currentStep.icon}</div>
            <h2 className="text-2xl font-bold text-white mb-4">{currentStep.title}</h2>
            <p className="text-white/70 text-base mb-6 leading-relaxed">{currentStep.content}</p>
            
            {currentStep.highlight && (
              <div className="mb-6">
                <kbd className="px-6 py-3 bg-green-500/20 text-green-400 rounded-xl border-2 border-green-500/40 text-xl font-mono shadow-lg">
                  {currentStep.highlight}
                </kbd>
              </div>
            )}

            {currentStep.action && (
              <Button
                onClick={onOpenSettings}
                className="mb-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 text-base shadow-lg"
              >
                {currentStep.action}
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gradient-to-r from-gray-900 to-black border-t border-white/10 p-4 flex items-center justify-between flex-shrink-0">
          <Button
            onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))}
            disabled={tutorialStep === 0}
            className="bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </Button>
          
          <button
            onClick={() => setShowTutorial(false)}
            className="text-white/50 hover:text-white/80 text-sm underline"
          >
            Skip Tutorial
          </button>

          {tutorialStep < tutorialSteps.length - 1 ? (
            <Button
              onClick={() => setTutorialStep(tutorialStep + 1)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
            >
              Next →
            </Button>
          ) : (
            <Button
              onClick={() => setShowTutorial(false)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
            >
              Get Started! 🚀
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
