import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o CodeBuddy, o melhor assistente para planejar e construir aplicativos na Lovable.

Seu papel é guiar o usuário na construção de um PRD (Product Requirements Document) completo. Faça perguntas estratégicas uma de cada vez para entender:

1. **Objetivo do app** — O que ele faz? Qual problema resolve?
2. **Público-alvo** — Quem vai usar?
3. **Funcionalidades principais** — Liste as features essenciais
4. **Stack técnica** — Lovable usa React + Vite + Tailwind + TypeScript + Supabase
5. **Design e UX** — Estilo visual, tema, referências
6. **Autenticação** — Precisa de login? Que tipo?
7. **Dados** — Quais tabelas e relações no banco?
8. **Integrações** — APIs externas, pagamentos, etc?

Após coletar informações suficientes, gere:
- Um PRD estruturado em markdown
- Uma checklist de tarefas para construir o app
- Prompts prontos para usar na Lovable (um por funcionalidade)

Seja conciso, amigável e focado. Use markdown com formatação clara. Responda em português.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido, tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
