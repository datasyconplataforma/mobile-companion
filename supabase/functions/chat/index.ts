import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Você é o CodeBuddy, o melhor assistente para planejar e construir aplicativos na Lovable.

Seu papel é guiar o usuário na construção de um PRD (Product Requirements Document) completo. Faça perguntas estratégicas uma de cada vez para entender:

1. **Objetivo do app** — O que ele faz? Qual problema resolve?
2. **Público-alvo** — Quem vai usar?
3. **Funcionalidades principais** — Liste as features essenciais
4. **Stack técnica** — Lovable usa React + Vite + Tailwind + TypeScript + Supabase
5. **Design e UX** — Estilo visual, tema, referências
6. **Autenticação** — Precisa de login? Que tipo?
7. **Dados** — Quais tabelas e relações no banco?
8. **Integrações** — APIs externas, pagamentos, etc?

Após coletar informações suficientes (quando o usuário tiver respondido pelo menos 3-4 perguntas), avise que ele pode pedir para você "gerar o PRD", "criar as tarefas" ou "gerar os prompts" e tudo será salvo automaticamente nas abas do projeto.

Exemplos de frases que o usuário pode dizer:
- "Gere o PRD"
- "Crie as tarefas"  
- "Monte os prompts"
- "Gere tudo" (PRD + tarefas + prompts)

Seja conciso, amigável e focado. Use markdown com formatação clara. Responda em português.

IMPORTANTE: Você tem acesso ao contexto completo do projeto abaixo. Use essas informações para dar respostas mais precisas e evitar perguntas repetidas.`;

function buildSystemPrompt(context: { prd?: string; tasks?: any[]; prompts?: any[] }): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (context.prd && context.prd.trim()) {
    prompt += `\n\n---\n## PRD ATUAL DO PROJETO:\n${context.prd}`;
  }

  if (context.tasks && context.tasks.length > 0) {
    const taskList = context.tasks
      .map((t: any, i: number) => `${i + 1}. [${t.completed ? "✅" : "⬜"}] ${t.title}`)
      .join("\n");
    prompt += `\n\n---\n## TAREFAS DO PROJETO:\n${taskList}`;
  }

  if (context.prompts && context.prompts.length > 0) {
    const promptList = context.prompts
      .map((p: any, i: number) => `### Prompt ${i + 1}: ${p.title}\n${p.content}`)
      .join("\n\n");
    prompt += `\n\n---\n## PROMPTS LOVABLE DO PROJETO:\n${promptList}`;
  }

  return prompt;
}

const tools = [
  {
    type: "function",
    function: {
      name: "save_prd",
      description: "Salva ou atualiza o PRD do projeto. Chamar quando o usuário pedir para gerar ou atualizar o PRD.",
      parameters: {
        type: "object",
        properties: {
          prd_content: { type: "string", description: "Conteúdo completo do PRD em markdown" },
        },
        required: ["prd_content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_tasks",
      description: "Salva uma lista de tarefas do projeto. Chamar quando o usuário pedir para gerar tarefas ou checklist.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
              },
              required: ["title"],
              additionalProperties: false,
            },
          },
        },
        required: ["tasks"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_prompts",
      description: "Salva prompts prontos para usar na Lovable. Chamar quando o usuário pedir para gerar prompts.",
      parameters: {
        type: "object",
        properties: {
          prompts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                prompt_text: { type: "string" },
                category: { type: "string", enum: ["setup", "feature", "ui", "backend", "general"] },
              },
              required: ["title", "prompt_text", "category"],
              additionalProperties: false,
            },
          },
        },
        required: ["prompts"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, projectContext, projectId, userId, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt(projectContext || {});

    // "generate" action: non-streaming with tool calling to save PRD/tasks/prompts
    if (action === "generate") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt + "\n\nAGORA: Baseado na conversa, gere o PRD completo, a lista de tarefas e os prompts para a Lovable. Use as ferramentas save_prd, save_tasks e save_prompts para salvar tudo." },
            ...messages,
          ],
          tools,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "Erro ao gerar" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await response.json();
      const toolCalls = result.choices?.[0]?.message?.tool_calls || [];
      const contentText = result.choices?.[0]?.message?.content || "";

      // Process tool calls and save to database
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const saved: Record<string, boolean> = {};

      for (const call of toolCalls) {
        try {
          const args = JSON.parse(call.function.arguments);

          if (call.function.name === "save_prd" && args.prd_content) {
            await supabase.from("projects").update({ prd_content: args.prd_content, status: "prd_ready" }).eq("id", projectId);
            saved.prd = true;
          }

          if (call.function.name === "save_tasks" && args.tasks) {
            // Clear existing tasks first
            await supabase.from("project_tasks").delete().eq("project_id", projectId);
            const taskRows = args.tasks.map((t: any, i: number) => ({
              project_id: projectId,
              user_id: userId,
              title: t.title,
              description: t.description || null,
              sort_order: i,
              status: "todo",
            }));
            await supabase.from("project_tasks").insert(taskRows);
            saved.tasks = true;
          }

          if (call.function.name === "save_prompts" && args.prompts) {
            await supabase.from("project_prompts").delete().eq("project_id", projectId);
            const promptRows = args.prompts.map((p: any, i: number) => ({
              project_id: projectId,
              user_id: userId,
              title: p.title,
              prompt_text: p.prompt_text,
              category: p.category || "general",
              sort_order: i,
            }));
            await supabase.from("project_prompts").insert(promptRows);
            saved.prompts = true;
          }
        } catch (e) {
          console.error("Tool call error:", e);
        }
      }

      return new Response(JSON.stringify({ saved, content: contentText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: streaming chat
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
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
