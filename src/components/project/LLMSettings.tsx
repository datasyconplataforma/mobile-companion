import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Eye, EyeOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PROVIDERS = [
  { value: "lovable", label: "Lovable AI (padrão)", needsKey: false, needsUrl: false, defaultModel: "", placeholder: "" },
  { value: "gemini", label: "Google Gemini", needsKey: true, needsUrl: false, defaultModel: "gemini-2.5-flash", placeholder: "AIzaSy..." },
  { value: "openrouter", label: "OpenRouter", needsKey: true, needsUrl: false, defaultModel: "google/gemini-2.5-flash-preview-05-20", placeholder: "sk-or-..." },
  { value: "claude", label: "Claude (Anthropic)", needsKey: true, needsUrl: false, defaultModel: "claude-sonnet-4-20250514", placeholder: "sk-ant-..." },
  { value: "ollama", label: "Ollama (local + cloud)", needsKey: false, needsUrl: true, defaultModel: "llama3.2", placeholder: "" },
];

interface LLMSettingsProps {
  projectId: string;
}

const LLMSettings = ({ projectId }: LLMSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [provider, setProvider] = useState("lovable");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (open && projectId) loadSettings();
  }, [open, projectId]);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("project_llm_settings")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (data) {
      setProvider((data as any).provider || "lovable");
      setApiKey((data as any).api_key || "");
      setBaseUrl((data as any).base_url || "");
      setModel((data as any).model || "");
    } else {
      setProvider("lovable");
      setApiKey("");
      setBaseUrl("");
      setModel("");
    }
    setLoading(false);
  };

  const selectedProvider = PROVIDERS.find((p) => p.value === provider)!;

  const handleProviderChange = (value: string) => {
    setProvider(value);
    const p = PROVIDERS.find((pr) => pr.value === value)!;
    setModel(p.defaultModel);
    if (value === "ollama") setBaseUrl("");
    else setBaseUrl("");
    setApiKey("");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        project_id: projectId,
        user_id: user.id,
        provider,
        api_key: apiKey || null,
        base_url: baseUrl || null,
        model: model || null,
      };

      const { data: existing } = await supabase
        .from("project_llm_settings")
        .select("id")
        .eq("project_id", projectId)
        .maybeSingle();

      if (existing) {
        await supabase.from("project_llm_settings").update(payload).eq("id", (existing as any).id);
      } else {
        await supabase.from("project_llm_settings").insert(payload);
      }

      toast({ title: "Configuração salva! ✅" });
      setOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Configurar IA">
          <Settings size={16} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={18} /> Configurar IA
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Provedor</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        {p.label}
                        {p.value === "lovable" && <Badge variant="secondary" className="text-[10px] px-1 py-0">grátis</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {provider === "lovable" && (
                <p className="text-xs text-muted-foreground mt-1">Usa Lovable AI sem necessidade de API key.</p>
              )}
            </div>

            {selectedProvider.needsKey && (
              <div>
                <Label>API Key</Label>
                <div className="relative mt-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={selectedProvider.placeholder}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            {selectedProvider.needsUrl && (
              <div>
                <Label>URL Base</Label>
                <Input
                  className="mt-1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://seu-ollama.exemplo.com"
                />
                <p className="text-xs text-destructive/80 mt-1">
                  ⚠️ <code className="text-[10px] bg-secondary px-1 rounded">localhost</code> não funciona — o backend roda na nuvem. Use uma URL pública (ex: ngrok, Tailscale, ou servidor com IP público).
                </p>
              </div>
            )}

            <div>
              <Label>Modelo</Label>
              <Input
                className="mt-1"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={selectedProvider.defaultModel || "Padrão do provedor"}
              />
              {provider === "openrouter" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Veja modelos em openrouter.ai/models
                </p>
              )}
              {provider === "ollama" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Local: llama3.2, mistral, qwen2.5 · Cloud: gpt-oss:120b-cloud, deepseek-v3.1:671b-cloud, qwen3-coder:480b-cloud (requer <code className="text-[10px] bg-secondary px-1 rounded">ollama signin</code>)
                </p>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LLMSettings;
