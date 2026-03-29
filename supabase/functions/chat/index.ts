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

function buildSystemPrompt(context: { prd?: string; tasks?: any[]; prompts?: any[]; documents?: any[] }): string {
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

  if (context.documents && context.documents.length > 0) {
    const docList = context.documents
      .map((d: any, i: number) => `### Documento ${i + 1}: ${d.name}\n${d.content}`)
      .join("\n\n");
    prompt += `\n\n---\n## DOCUMENTOS DE REFERÊNCIA ANEXADOS:\nOs documentos abaixo foram fornecidos pelo usuário como referência. Use essas informações para enriquecer o PRD, tarefas e prompts:\n\n${docList}`;
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

// Provider configurations
interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  transformBody: (body: any) => any;
}

function getProviderConfig(settings: any, lovableApiKey: string): ProviderConfig {
  const provider = settings?.provider || "lovable";
  const apiKey = settings?.api_key || "";
  const baseUrl = settings?.base_url || "";
  const model = settings?.model || "";

  switch (provider) {
    case "gemini":
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        transformBody: (body: any) => ({
          ...body,
          model: model || "gemini-2.5-flash",
        }),
      };

    case "openrouter":
      return {
        url: "https://openrouter.ai/api/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://codebuddy.app",
        },
        transformBody: (body: any) => ({
          ...body,
          model: model || "google/gemini-2.5-flash-preview-05-20",
        }),
      };

    case "claude":
      return {
        url: "https://api.anthropic.com/v1/messages",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        transformBody: (body: any) => {
          // Convert OpenAI format to Anthropic format
          const systemMsg = body.messages.find((m: any) => m.role === "system");
          const otherMsgs = body.messages.filter((m: any) => m.role !== "system");
          const transformed: any = {
            model: model || "claude-sonnet-4-20250514",
            max_tokens: 8192,
            messages: otherMsgs,
          };
          if (systemMsg) transformed.system = systemMsg.content;
          if (body.stream) transformed.stream = true;
          // Tool calling for Anthropic format
          if (body.tools) {
            transformed.tools = body.tools.map((t: any) => ({
              name: t.function.name,
              description: t.function.description,
              input_schema: t.function.parameters,
            }));
          }
          return transformed;
        },
      };

    case "ollama":
      return {
        url: `${baseUrl || "http://localhost:11434"}/v1/chat/completions`,
        headers: { "Content-Type": "application/json" },
        transformBody: (body: any) => ({
          ...body,
          model: model || "llama3.2",
        }),
      };

    default: // lovable
      return {
        url: "https://ai.gateway.lovable.dev/v1/chat/completions",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        transformBody: (body: any) => ({
          ...body,
          model: model || "google/gemini-3-flash-preview",
        }),
      };
  }
}

// Parse Claude streaming format to SSE format
function transformClaudeStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          if (json === "[DONE]") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
          try {
            const parsed = JSON.parse(json);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              const openaiChunk = {
                choices: [{ delta: { content: parsed.delta.text }, index: 0 }],
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
            }
            if (parsed.type === "message_stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
          } catch { /* skip */ }
        }
      }
    },
  });
}

// Parse Claude non-streaming response to extract tool calls in OpenAI format
function transformClaudeResponse(claudeResult: any): any {
  const content = claudeResult.content || [];
  let textContent = "";
  const toolCalls: any[] = [];

  for (const block of content) {
    if (block.type === "text") textContent += block.text;
    if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: { name: block.name, arguments: JSON.stringify(block.input) },
      });
    }
  }

  return {
    choices: [{
      message: {
        content: textContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      },
    }],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, projectContext, projectId, userId, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Load LLM settings for this project
    let llmSettings: any = null;
    if (projectId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sbAdmin = createClient(supabaseUrl, supabaseKey);
      const { data } = await sbAdmin
        .from("project_llm_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();
      llmSettings = data;
    }

    const providerConfig = getProviderConfig(llmSettings, LOVABLE_API_KEY);
    const systemPrompt = buildSystemPrompt(projectContext || {});
    const isClaude = llmSettings?.provider === "claude";
    const supportsTools = !llmSettings?.provider || llmSettings?.provider === "lovable" || llmSettings?.provider === "gemini" || llmSettings?.provider === "claude";

    // "generate" action: non-streaming with tool calling (or JSON fallback)
    if (action === "generate") {
      let baseBody: any;

      if (supportsTools) {
        const generateInstruction = `\n\nINSTRUÇÃO OBRIGATÓRIA: Você DEVE usar as ferramentas save_prd, save_tasks e save_prompts para salvar os documentos do projeto. Baseado em TODA a conversa acima e no contexto do projeto, gere:
1. O PRD completo em markdown (use save_prd)
2. Uma lista de tarefas de desenvolvimento (use save_tasks) 
3. Prompts prontos para usar na Lovable (use save_prompts)

IMPORTANTE: Mesmo que a conversa tenha poucos detalhes, use o que está disponível (incluindo o PRD existente se houver) para gerar os documentos. SEMPRE chame as 3 ferramentas.

REGRA CRÍTICA PARA TAREFAS: Se já existem tarefas no projeto (listadas acima em "TAREFAS DO PROJETO"), você DEVE manter os MESMOS títulos e a MESMA estrutura. Só altere os títulos se o escopo do projeto mudou drasticamente. Manter consistência nos nomes das tarefas é essencial para não confundir o usuário.`;
        baseBody = {
          messages: [
            { role: "system", content: systemPrompt + generateInstruction },
            ...messages,
            { role: "user", content: "Por favor, gere o PRD, as tarefas e os prompts do projeto agora. Use as ferramentas disponíveis para salvar tudo." },
          ],
          tools,
          tool_choice: "auto",
        };
      } else {
        // JSON fallback for providers without tool calling support
        const jsonPrompt = systemPrompt + `\n\nAGORA: Baseado na conversa, gere o PRD completo, a lista de tarefas e os prompts para a Lovable.

Responda EXCLUSIVAMENTE com um bloco JSON válido (sem markdown, sem texto antes/depois) neste formato exato:
{
  "prd_content": "conteúdo completo do PRD em markdown",
  "tasks": [{"title": "tarefa 1", "description": "descrição"}],
  "prompts": [{"title": "titulo", "prompt_text": "texto do prompt", "category": "setup|feature|ui|backend|general"}],
  "message": "mensagem opcional para o usuário"
}`;
        baseBody = {
          messages: [
            { role: "system", content: jsonPrompt },
            ...messages,
          ],
        };
      }

      const requestBody = providerConfig.transformBody(baseBody);

      const response = await fetch(providerConfig.url, {
        method: "POST",
        headers: providerConfig.headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI provider error:", response.status, t);
        return new Response(JSON.stringify({ error: `Erro do provedor (${response.status})` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawResult = await response.json();
      console.log("AI generate response:", JSON.stringify(rawResult).slice(0, 2000));
      
      // Process tool calls and save to database
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const saved: Record<string, boolean> = {};
      let contentText = "";

      if (supportsTools) {
        const result = isClaude ? transformClaudeResponse(rawResult) : rawResult;
        const toolCalls = result.choices?.[0]?.message?.tool_calls || [];
        contentText = result.choices?.[0]?.message?.content || "";
        console.log("Tool calls count:", toolCalls.length, "Content length:", contentText.length);

        for (const call of toolCalls) {
          try {
            const args = JSON.parse(call.function.arguments);
            if (call.function.name === "save_prd" && args.prd_content) {
              await supabase.from("projects").update({ prd_content: args.prd_content, status: "prd_ready" }).eq("id", projectId);
              saved.prd = true;
            }
            if (call.function.name === "save_tasks" && args.tasks) {
              // Fetch existing tasks to preserve their status
              const { data: existingTasks } = await supabase
                .from("project_tasks")
                .select("title, status")
                .eq("project_id", projectId);
              const statusMap = new Map((existingTasks || []).map((t: any) => [t.title.toLowerCase().trim(), t.status]));
              
              await supabase.from("project_tasks").delete().eq("project_id", projectId);
              const taskRows = args.tasks.map((t: any, i: number) => ({
                project_id: projectId, user_id: userId,
                title: t.title, description: t.description || null,
                sort_order: i, status: statusMap.get(t.title.toLowerCase().trim()) || "todo",
              }));
              await supabase.from("project_tasks").insert(taskRows);
              saved.tasks = true;
            }
            if (call.function.name === "save_prompts" && args.prompts) {
              await supabase.from("project_prompts").delete().eq("project_id", projectId);
              const promptRows = args.prompts.map((p: any, i: number) => ({
                project_id: projectId, user_id: userId,
                title: p.title, prompt_text: p.prompt_text,
                category: p.category || "general", sort_order: i,
              }));
              await supabase.from("project_prompts").insert(promptRows);
              saved.prompts = true;
            }
          } catch (e) {
            console.error("Tool call error:", e);
          }
        }
      } else {
        // Parse JSON from response content
        const rawContent = rawResult.choices?.[0]?.message?.content || "";
        try {
          // Extract JSON from response (handle markdown code blocks too)
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.prd_content) {
              await supabase.from("projects").update({ prd_content: parsed.prd_content, status: "prd_ready" }).eq("id", projectId);
              saved.prd = true;
            }
            if (parsed.tasks?.length) {
              const { data: existingTasks } = await supabase
                .from("project_tasks")
                .select("title, status")
                .eq("project_id", projectId);
              const statusMap = new Map((existingTasks || []).map((t: any) => [t.title.toLowerCase().trim(), t.status]));
              
              await supabase.from("project_tasks").delete().eq("project_id", projectId);
              const taskRows = parsed.tasks.map((t: any, i: number) => ({
                project_id: projectId, user_id: userId,
                title: t.title, description: t.description || null,
                sort_order: i, status: statusMap.get(t.title.toLowerCase().trim()) || "todo",
              }));
              await supabase.from("project_tasks").insert(taskRows);
              saved.tasks = true;
            }
            if (parsed.prompts?.length) {
              await supabase.from("project_prompts").delete().eq("project_id", projectId);
              const promptRows = parsed.prompts.map((p: any, i: number) => ({
                project_id: projectId, user_id: userId,
                title: p.title, prompt_text: p.prompt_text,
                category: p.category || "general", sort_order: i,
              }));
              await supabase.from("project_prompts").insert(promptRows);
              saved.prompts = true;
            }
            contentText = parsed.message || "";
          }
        } catch (e) {
          console.error("JSON parse error:", e);
          contentText = rawContent;
        }
      }

      return new Response(JSON.stringify({ saved, content: contentText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: streaming chat
    const baseBody: any = {
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    };

    const requestBody = providerConfig.transformBody(baseBody);

    const response = await fetch(providerConfig.url, {
      method: "POST",
      headers: providerConfig.headers,
      body: JSON.stringify(requestBody),
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
      console.error("AI provider error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no provedor de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Claude has a different streaming format - transform it
    const responseBody = isClaude && response.body
      ? transformClaudeStream(response.body)
      : response.body;

    return new Response(responseBody, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    // Friendly error for connection issues (e.g. Ollama localhost)
    if (msg.includes("Connection refused") || msg.includes("tcp connect error")) {
      return new Response(JSON.stringify({ error: "Não foi possível conectar ao provedor de IA. Se está usando Ollama, lembre que 'localhost' não funciona — use uma URL pública (ngrok, Tailscale, etc)." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
