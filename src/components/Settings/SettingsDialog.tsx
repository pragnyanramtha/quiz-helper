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





interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsDialog({ open: externalOpen, onOpenChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(externalOpen || false);
  const [groqApiKey, setGroqApiKey] = useState("");
  const [groqModel, setGroqModel] = useState("moonshotai/kimi-k2-instruct");
  const [mode, setMode] = useState<'mcq' | 'coding'>('coding');
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
        groqModel?: string;
        mode?: 'mcq' | 'coding';
      }

      window.electronAPI
        .getConfig()
        .then((config: Config) => {
          setGroqApiKey(config.groqApiKey || "");
          setGroqModel(config.groqModel || "moonshotai/kimi-k2-instruct");
          setMode(config.mode || 'coding');
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
        groqModel,
        mode,
      });

      if (result) {
        showToast("Success", "Settings saved successfully", "success");
        handleOpenChange(false);

        // Force reload the app to apply changes
        setTimeout(() => {
          window.location.reload();
        }, 500);
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
          width: 'min(480px, 90vw)',
          height: 'auto',
          minHeight: '420px',
          maxHeight: '520px',
          overflowY: 'auto',
          zIndex: 9999,
          margin: 0,
          padding: '24px',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          animation: 'fadeIn 0.25s ease forwards',
          opacity: 0.98
        }}
      >
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription className="text-white/70">
            Configure your Groq API key. Switch modes using the button in the main toolbar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">

          {/* Mode Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2">
              <span className="text-blue-400">🎯</span> Processing Mode
            </label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">
                    {mode === 'mcq' ? '📝 MCQ Mode' : '💻 Coding Mode'}
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  {mode === 'mcq' 
                    ? 'Optimized for multiple choice - clean, concise answers'
                    : 'Optimized for coding - detailed explanations + minimal code'}
                </p>
              </div>
              <button
                onClick={() => setMode(mode === 'mcq' ? 'coding' : 'mcq')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  mode === 'coding' ? 'bg-blue-500' : 'bg-green-500'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    mode === 'coding' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-white/50 px-1">
              💡 Tip: Use <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">/</kbd> to toggle quickly
            </p>
          </div>

          {/* Groq API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white flex items-center gap-2" htmlFor="groqApiKey">
              <span className="text-green-400">⚡</span> Groq API Key (Required)
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





          {/* Model Selection */}
          {groqApiKey && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Select Model</label>
              <div className="space-y-2">
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${groqModel === "moonshotai/kimi-k2-instruct"
                    ? "bg-green-500/20 border-2 border-green-500/50"
                    : "bg-black/30 border border-white/10 hover:bg-white/5"
                    }`}
                  onClick={() => setGroqModel("moonshotai/kimi-k2-instruct")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-3 h-3 rounded-full ${groqModel === "moonshotai/kimi-k2-instruct" ? "bg-green-500" : "bg-white/20"}`}
                    />
                    <p className="font-semibold text-white text-sm">🌙 Kimi K2 Instruct ⭐</p>
                  </div>
                  <p className="text-xs text-white/60 ml-5">Text-only model using high-precision OCR</p>
                  <p className="text-xs text-green-400 ml-5 mt-1">Best for: Complex reasoning and coding explanations (RECOMMENDED)</p>
                </div>
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${groqModel === "openai/gpt-oss-120b"
                    ? "bg-blue-500/20 border-2 border-blue-500/50"
                    : "bg-black/30 border border-white/10 hover:bg-white/5"
                    }`}
                  onClick={() => setGroqModel("openai/gpt-oss-120b")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-3 h-3 rounded-full ${groqModel === "openai/gpt-oss-120b" ? "bg-blue-500" : "bg-white/20"}`}
                    />
                    <p className="font-semibold text-white text-sm">⚡ GPT-OSS Text</p>
                  </div>
                  <p className="text-xs text-white/60 ml-5">Text-only model using high-precision OCR</p>
                  <p className="text-xs text-blue-400 ml-5 mt-1">Best for: Fast answers and short tasks</p>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-4 p-3 rounded-md bg-white/5 border border-white/10">
            <p className="text-xs text-white/80 font-semibold mb-2">💡 How it works:</p>
            <ul className="space-y-1 text-xs text-white/60">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span><strong>Kimi K2 Instruct:</strong> Text-only model with high-precision OCR input</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span><strong>GPT-OSS Text:</strong> Ultra-fast text-only model with high-precision OCR input</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>API keys are stored locally and encrypted</span>
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
            disabled={isLoading || !groqApiKey}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
