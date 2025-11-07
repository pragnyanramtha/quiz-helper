import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useToast } from "../../contexts/toast";

type ProcessingMode = "mcq" | "general";

type AIModel = {
  id: string;
  name: string;
  description: string;
};

const groqModels: AIModel[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile ⭐",
    description: "Best balance - fast and accurate (RECOMMENDED)"
  },
  {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct",
    name: "Llama 4 Maverick 17B",
    description: "Optimized for MCQs and instruction following"
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    description: "Most capable but slower token processing"
  }
];

const geminiModels: AIModel[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash ⭐",
    description: "Best balance - fast with vision support (RECOMMENDED)"
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Highest accuracy for complex problems"
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Ultra-fast for simple questions"
  }
];

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsDialog({ open: externalOpen, onOpenChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(externalOpen || false);
  const [groqApiKey, setGroqApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [mode, setMode] = useState<ProcessingMode>("mcq");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Sync with external open state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (onOpenChange && newOpen !== externalOpen) {
      onOpenChange(newOpen);
    }
  };

  // Load current config on dialog open
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      interface Config {
        groqApiKey?: string;
        geminiApiKey?: string;
        mode?: ProcessingMode;
        groqModel?: string;
        geminiModel?: string;
      }

      window.electronAPI
        .getConfig()
        .then((config: Config) => {
          setGroqApiKey(config.groqApiKey || "");
          setGeminiApiKey(config.geminiApiKey || "");
          setMode(config.mode || "mcq");
          setGroqModel(config.groqModel || "llama-3.3-70b-versatile");
          setGeminiModel(config.geminiModel || "gemini-2.5-flash");
        })
        .catch((error: unknown) => {
          console.error("Failed to load config:", error);
          showToast("Error", "Failed to load settings", "error");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, showToast]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await window.electronAPI.updateConfig({
        groqApiKey,
        geminiApiKey,
        mode,
        groqModel,
        geminiModel,
      });

      if (result) {
        showToast("Success", "Settings saved successfully", "success");
        handleOpenChange(false);

        // Force reload the app to apply changes
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("Error", "Failed to save settings", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Mask API key for display
  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return "";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  // Open external link handler
  const openExternalLink = (url: string) => {
    window.electronAPI.openLink(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-black border border-white/10 text-white settings-dialog"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(500px, 90vw)',
          height: 'auto',
          minHeight: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 9999,
          margin: 0,
          padding: '20px',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          animation: 'fadeIn 0.25s ease forwards',
          opacity: 0.98
        }}
      >
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription className="text-white/70">
            Configure your API keys and processing mode. Both Groq and Gemini keys can be stored.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Processing Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Processing Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-3 rounded-lg cursor-pointer transition-colors ${mode === "mcq"
                  ? "bg-green-500/20 border-2 border-green-500/50"
                  : "bg-black/30 border border-white/10 hover:bg-white/5"
                  }`}
                onClick={() => setMode("mcq")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-3 h-3 rounded-full ${mode === "mcq" ? "bg-green-500" : "bg-white/20"
                      }`}
                  />
                  <p className="font-semibold text-white text-sm">⚡ MCQ Mode</p>
                </div>
                <p className="text-xs text-white/60 ml-5">Ultra-fast with Groq</p>
                <p className="text-xs text-green-400 ml-5 mt-1">Uses: Groq API</p>
              </div>
              <div
                className={`p-3 rounded-lg cursor-pointer transition-colors ${mode === "general"
                  ? "bg-blue-500/20 border-2 border-blue-500/50"
                  : "bg-black/30 border border-white/10 hover:bg-white/5"
                  }`}
                onClick={() => setMode("general")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-3 h-3 rounded-full ${mode === "general" ? "bg-blue-500" : "bg-white/20"
                      }`}
                  />
                  <p className="font-semibold text-white text-sm">🎯 General Mode</p>
                </div>
                <p className="text-xs text-white/60 ml-5">All question types</p>
                <p className="text-xs text-blue-400 ml-5 mt-1">Uses: Gemini API</p>
              </div>
            </div>
          </div>

          {/* Groq API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2" htmlFor="groqApiKey">
              <span className="text-green-400">⚡</span> Groq API Key (for MCQ Mode)
            </label>
            <Input
              id="groqApiKey"
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="gsk_..."
              className="bg-black/50 border-white/10 text-white"
            />
            {groqApiKey && (
              <p className="text-xs text-white/50">
                Current: {maskApiKey(groqApiKey)}
              </p>
            )}
            <div className="mt-2 p-2 rounded-md bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-white/80 mb-1">Get Groq API Key:</p>
              <p className="text-xs text-white/60 mb-1">1. Sign up at <button
                onClick={() => openExternalLink('https://console.groq.com/signup')}
                className="text-green-400 hover:underline cursor-pointer">Groq Console</button>
              </p>
              <p className="text-xs text-white/60 mb-1">2. Go to <button
                onClick={() => openExternalLink('https://console.groq.com/keys')}
                className="text-green-400 hover:underline cursor-pointer">API Keys</button>
              </p>
              <p className="text-xs text-white/60">3. Create and paste your key here</p>
            </div>
          </div>

          {/* Groq Model Selection */}
          {groqApiKey && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Groq Model (MCQ Mode)</label>
              <div className="space-y-2">
                {groqModels.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${groqModel === m.id
                      ? "bg-green-500/20 border border-green-500/30"
                      : "bg-black/30 border border-white/5 hover:bg-white/5"
                      }`}
                    onClick={() => setGroqModel(m.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${groqModel === m.id ? "bg-green-500" : "bg-white/20"
                          }`}
                      />
                      <div>
                        <p className="font-medium text-white text-xs">{m.name}</p>
                        <p className="text-xs text-white/60">{m.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gemini API Key */}
          <div className="space-y-2 pt-4 border-t border-white/10">
            <label className="text-sm font-medium text-white flex items-center gap-2" htmlFor="geminiApiKey">
              <span className="text-blue-400">🎯</span> Gemini API Key (for General Mode)
            </label>
            <Input
              id="geminiApiKey"
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="bg-black/50 border-white/10 text-white"
            />
            {geminiApiKey && (
              <p className="text-xs text-white/50">
                Current: {maskApiKey(geminiApiKey)}
              </p>
            )}
            <div className="mt-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-white/80 mb-1">Get Gemini API Key:</p>
              <p className="text-xs text-white/60 mb-1">1. Sign up at <button
                onClick={() => openExternalLink('https://aistudio.google.com/')}
                className="text-blue-400 hover:underline cursor-pointer">Google AI Studio</button>
              </p>
              <p className="text-xs text-white/60 mb-1">2. Go to <button
                onClick={() => openExternalLink('https://aistudio.google.com/app/apikey')}
                className="text-blue-400 hover:underline cursor-pointer">API Keys</button>
              </p>
              <p className="text-xs text-white/60">3. Create and paste your key here</p>
            </div>
          </div>

          {/* Gemini Model Selection */}
          {geminiApiKey && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Gemini Model (General Mode)</label>
              <div className="space-y-2">
                {geminiModels.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${geminiModel === m.id
                      ? "bg-blue-500/20 border border-blue-500/30"
                      : "bg-black/30 border border-white/5 hover:bg-white/5"
                      }`}
                    onClick={() => setGeminiModel(m.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${geminiModel === m.id ? "bg-blue-500" : "bg-white/20"
                          }`}
                      />
                      <div>
                        <p className="font-medium text-white text-xs">{m.name}</p>
                        <p className="text-xs text-white/60">{m.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-4 p-3 rounded-md bg-white/5 border border-white/10">
            <p className="text-xs text-white/80 font-semibold mb-2">💡 How it works:</p>
            <ul className="space-y-1 text-xs text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span><strong>MCQ Mode:</strong> Uses Groq for ultra-fast MCQ solving (10x faster)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span><strong>General Mode:</strong> Uses Gemini for all question types with vision support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>Both keys are stored locally and can be used independently</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>Switch modes anytime based on your question type</span>
              </li>
            </ul>
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-white/10 hover:bg-white/5 text-white"
          >
            Cancel
          </Button>
          <Button
            className="px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
            onClick={handleSave}
            disabled={isLoading || (!groqApiKey && !geminiApiKey)}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
