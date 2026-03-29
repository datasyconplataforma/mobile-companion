import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Eye, EyeOff, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const OPENROUTER_MODELS = [
  { id: "google/gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash", tag: "rápido" },
  { id: "google/gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro", tag: "potente" },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", tag: "popular" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", tag: "popular" },
  { id: "openai/gpt-4o", label: "GPT-4o", tag: "multimodal" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", tag: "barato" },
  { id: "openai/o3-mini", label: "o3-mini", tag: "raciocínio" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", tag: "open" },
  { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout", tag: "open" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", tag: "open" },
  { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3", tag: "barato" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", tag: "raciocínio" },
  { id: "qwen/qwen3-235b-a22b", label: "Qwen3 235B", tag: "potente" },
  { id: "qwen/qwen3-30b-a3b", label: "Qwen3 30B", tag: "barato" },
  { id: "mistralai/mistral-large-2411", label: "Mistral Large", tag: "potente" },
  { id: "mistralai/mistral-small-3.1-24b-instruct", label: "Mistral Small 3.1", tag: "barato" },
  { id: "microsoft/phi-4", label: "Phi-4", tag: "compacto" },
  { id: "google/gemma-3-27b-it", label: "Gemma 3 27B", tag: "open" },
  { id: "cohere/command-r-plus", label: "Command R+", tag: "RAG" },
  { id: "perplexity/sonar-pro", label: "Sonar Pro", tag: "busca" },
];

const TAG_COLORS: Record<string, string> = {
  "rápido": "bg-emerald-500/20 text-emerald-400",
  "potente": "bg-violet-500/20 text-violet-400",
  "popular": "bg-amber-500/20 text-amber-400",
  "multimodal": "bg-blue-500/20 text-blue-400",
  "barato": "bg-green-500/20 text-green-400",
  "raciocínio": "bg-pink-500/20 text-pink-400",
  "open": "bg-cyan-500/20 text-cyan-400",
  "compacto": "bg-orange-500/20 text-orange-400",
  "RAG": "bg-indigo-500/20 text-indigo-400",
  "busca": "bg-teal-500/20 text-teal-400",
};

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
  const [modelSearch, setModelSearch] = useState("");

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
    setModelSearch("");
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

  const filteredModels = OPENROUTER_MODELS.filter(
    (m) =>
      m.label.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.tag.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const selectedModelLabel = OPENROUTER_MODELS.find((m) => m.id === model)?.label;

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
          <DialogDescription>Escolha o provedor e modelo de IA para este projeto.</DialogDescription>
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

            {/* Model selector */}
            <div>
              <Label>Modelo</Label>
              {provider === "openrouter" ? (
                <div className="mt-1 space-y-2">
                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Buscar modelo..."
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  {/* Selected indicator */}
                  {model && selectedModelLabel && (
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-primary/10 border border-primary/20">
                      <span className="text-xs text-primary font-medium truncate">{selectedModelLabel}</span>
                      <code className="text-[10px] text-muted-foreground ml-auto shrink-0">{model.split("/").pop()}</code>
                    </div>
                  )}

                  {/* Model list */}
                  <ScrollArea className="h-48 rounded-md border border-border">
                    <div className="p-1">
                      {filteredModels.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { setModel(m.id); setModelSearch(""); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                            model === m.id
                              ? "bg-primary/15 text-primary"
                              : "hover:bg-secondary text-foreground"
                          }`}
                        >
                          <span className="font-medium truncate flex-1">{m.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${TAG_COLORS[m.tag] || "bg-secondary text-muted-foreground"}`}>
                            {m.tag}
                          </span>
                        </button>
                      ))}
                      {filteredModels.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum modelo encontrado</p>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Custom model input */}
                  <div>
                    <Input
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Ou digite o ID do modelo manualmente"
                      className="h-8 text-xs font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mais modelos em <span className="text-primary">openrouter.ai/models</span>
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    className="mt-1"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={selectedProvider.defaultModel || "Padrão do provedor"}
                  />
                  {provider === "ollama" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Local: llama3.2, mistral, qwen2.5 · Cloud: gpt-oss:120b-cloud, deepseek-v3.1:671b-cloud, qwen3-coder:480b-cloud (requer <code className="text-[10px] bg-secondary px-1 rounded">ollama signin</code>)
                    </p>
                  )}
                </>
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
