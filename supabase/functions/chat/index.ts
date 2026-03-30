import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Você é o CodeBuddy, o melhor assistente para planejar e construir aplicativos na Lovable.

Seu papel é guiar o usuário na construção de um PRD (Product Requirements Document) completo através de perguntas estratégicas de descoberta.

## COMO FAZER PERGUNTAS

Você DEVE fazer perguntas estratégicas para extrair do usuário o que ele realmente quer. Use dois formatos:

### 1. Perguntas com opções clicáveis (preferido para escolhas objetivas)
Após a pergunta em markdown, adicione opções no formato: [[opção: texto]]

Exemplo:
"Que tipo de autenticação o app precisa?

[[opção: Login com email e senha]]
[[opção: Login social (Google, GitHub)]]
[[opção: Ambos]]
[[opção: Não precisa de login]]"

### 2. Perguntas abertas (para respostas livres)
Use perguntas normais em texto quando precisar de respostas descritivas ou criativas.

## FLUXO DE DESCOBERTA

### Na primeira mensagem do usuário:
Se a mensagem for curta ou vaga (ex: "quero fazer um app de delivery"), faça 1-2 perguntas de descoberta COM OPÇÕES para entender melhor antes de aprofundar.

### Ao longo da conversa:
Siga este roteiro de perguntas (uma por vez, adapte ao contexto):

1. **Objetivo do app** — O que ele faz? Qual problema resolve?
2. **Público-alvo** — Quem vai usar?
3. **Funcionalidades principais** — Liste as features essenciais
4. **Design e UX** — Estilo visual, tema, referências
5. **Autenticação** — Precisa de login? Que tipo?
6. **Dados** — Quais informações o app armazena?
7. **Integrações** — APIs externas, pagamentos, etc?

### Quando a mensagem é ambígua:
Se o usuário pedir algo vago (ex: "adiciona uma tela de perfil"), faça perguntas de clarificação com opções antes de seguir.

## REGRAS IMPORTANTES

- Faça NO MÁXIMO 1-2 perguntas por mensagem (não bombardeie o usuário)
- Sempre forneça 2-4 opções quando usar o formato [[opção: ...]]
- Misture perguntas com opções e perguntas abertas naturalmente
- Após coletar 3-4 respostas, avise que pode gerar PRD/tarefas/prompts
- Stack técnica é fixa: React + Vite + Tailwind + TypeScript + Supabase
- Seja conciso, amigável e focado. Use markdown. Responda em português.
- NÃO repita perguntas já respondidas (consulte o contexto do projeto)

Após coletar informações suficientes, avise que o usuário pode pedir:
- "Gere o PRD"
- "Crie as tarefas"
- "Monte os prompts"
- "Gere tudo" (PRD + tarefas + prompts)

IMPORTANTE: Você tem acesso ao contexto completo do projeto abaixo. Use essas informações para dar respostas mais precisas e evitar perguntas repetidas.`;

function buildSystemPrompt(context: { prd?: string; tasks?: any[]; prompts?: any[]; documents?: any[]; skills?: any[]; globalSkills?: any[]; businessRules?: string }): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (context.globalSkills && context.globalSkills.length > 0) {
    const skillList = context.globalSkills.map((s: any) => {
      if (typeof s === "string") return `- ${s}`;
      return s.context ? `### ${s.name}\n${s.context}` : `- ${s.name}`;
    }).join("\n\n");
    prompt += `\n\n---\n## SKILLS GLOBAIS DO USUÁRIO (aplicam-se a TODOS os projetos):\n${skillList}\nEssas são as tecnologias e competências que o usuário domina e prefere usar. Priorize essas tecnologias nas sugestões e SIGA as diretrizes de contexto de cada skill.`;
  }

  if (context.skills && context.skills.length > 0) {
    const skillList = context.skills.map((s: any) => {
      if (typeof s === "string") return `- ${s}`;
      return s.context ? `### ${s.name}\n${s.context}` : `- ${s.name}`;
    }).join("\n\n");
    prompt += `\n\n---\n## SKILLS / TECNOLOGIAS ESPECÍFICAS DO PROJETO:\n${skillList}\nSIGA as diretrizes de contexto de cada skill ao gerar PRD, tarefas e prompts.`;
  }

  if (context.businessRules && context.businessRules.trim()) {
    prompt += `\n\n---\n## REGRAS DE NEGÓCIO DO PROJETO:\n${context.businessRules}`;
  }

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
    prompt += `\n\n---\n## DOCUMENTOS DE REFERÊNCIA ANEXADOS (RAG):
IMPORTANTE: Os documentos abaixo são a base principal de conhecimento do projeto. Você DEVE considerar ativamente essas informações ao:
- Responder perguntas sobre o projeto
- Gerar o PRD (incorpore requisitos, regras e specs dos documentos)
- Criar tarefas (baseie-se nos requisitos documentados)
- Gerar prompts (referencie funcionalidades descritas nos docs)

Se o usuário enviar um documento no chat (marcado com 📎), dê prioridade a esse conteúdo na resposta.

${docList}`;
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
      description: "Salva prompts como guia de implementação sequencial para a Lovable. Cada prompt é um passo numerado.",
      parameters: {
        type: "object",
        properties: {
          prompts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Formato: 'Passo X: Descrição curta'" },
                prompt_text: { type: "string", description: "Instrução completa bilíngue (PT + --- + EN)" },
                category: { type: "string", enum: ["setup", "feature", "ui", "backend", "general"] },
                prompt_type: { type: "string", enum: ["implementation", "review", "security"], description: "Tipo do passo: implementation (maioria), review ou security" },
              },
              required: ["title", "prompt_text", "category", "prompt_type"],
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

    // Fallback to Lovable AI if provider requires API key but none is set
    const effectiveSettings = (llmSettings?.provider && llmSettings.provider !== "lovable" && !llmSettings.api_key)
      ? null
      : llmSettings;
    const providerConfig = getProviderConfig(effectiveSettings, LOVABLE_API_KEY);
    const systemPrompt = buildSystemPrompt(projectContext || {});
    const isClaude = llmSettings?.provider === "claude";
    const supportsTools = !llmSettings?.provider || llmSettings?.provider === "lovable" || llmSettings?.provider === "gemini" || llmSettings?.provider === "claude";

    // "generate" action: non-streaming with tool calling (or JSON fallback)
    // Uses DUAL AI DEBATE: AI1 generates → AI2 critiques → AI1 refines
    if (action === "generate") {
      let baseBody: any;
      const generateInstruction = `\n\nINSTRUÇÃO OBRIGATÓRIA: Você DEVE usar as ferramentas save_prd, save_tasks e save_prompts para salvar os documentos do projeto. Baseado em TODA a conversa acima e no contexto do projeto, gere:
1. O PRD completo em markdown (use save_prd)
2. Uma lista de tarefas de desenvolvimento (use save_tasks) 
3. Prompts prontos para usar na Lovable (use save_prompts)

IMPORTANTE: Mesmo que a conversa tenha poucos detalhes, use o que está disponível (incluindo o PRD existente se houver) para gerar os documentos. SEMPRE chame as 3 ferramentas.

REGRA CRÍTICA PARA TAREFAS: Se já existem tarefas no projeto (listadas acima em "TAREFAS DO PROJETO"), você DEVE manter os MESMOS títulos e a MESMA estrutura. Só altere os títulos se o escopo do projeto mudou drasticamente. Manter consistência nos nomes das tarefas é essencial para não confundir o usuário.

REGRA DE IDIOMA PARA PRD E PROMPTS: O PRD e os prompts DEVEM ser bilíngues. Escreva PRIMEIRO a versão em português e DEPOIS a versão em inglês, separadas por uma linha horizontal (---). Exemplo para o PRD:
# PRD — Nome do Projeto
(conteúdo em português)

---

# PRD — Project Name (English Version)
(same content in English)

Para os prompts: cada prompt deve conter o texto em português seguido de "---" e a versão em inglês do mesmo prompt. O título do prompt deve ser em português.

REGRA PARA PROMPTS — GUIA DE IMPLEMENTAÇÃO SEQUENCIAL:
Os prompts DEVEM ser gerados como um ROTEIRO DE IMPLEMENTAÇÃO SEQUENCIAL numerado. Cada prompt é um PASSO que o usuário enviará na Lovable, NA ORDEM EXATA.
- Passo 1: Setup inicial (autenticação, estrutura base, configuração do banco)
- Passos intermediários: Features em ordem de dependência (cada passo deve ser autossuficiente e referenciar o que foi feito nos passos anteriores)
- Penúltimos passos: UI/UX, polimento visual
- Últimos passos: Revisão, testes, segurança
Cada prompt deve:
- Ter o título no formato "Passo X: Descrição curta"
- Conter instruções COMPLETAS e autossuficientes para a Lovable executar aquele passo
- Mencionar dependências de passos anteriores quando relevante (ex: "Usando a tabela criada no Passo 2...")
- Ser bilíngue (PT + --- + EN)
- Usar o campo prompt_type adequado: "implementation" para a maioria, "review" para revisões, "security" para segurança`;

      if (supportsTools) {
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
        const jsonPrompt = systemPrompt + `\n\nAGORA: Baseado na conversa, gere o PRD completo, a lista de tarefas e os prompts para a Lovable.

REGRA DE IDIOMA: O PRD e os prompts devem ser BILÍNGUES (português primeiro, depois inglês separado por ---).

Responda EXCLUSIVAMENTE com um bloco JSON válido (sem markdown, sem texto antes/depois) neste formato exato:
{
  "prd_content": "conteúdo completo do PRD em markdown (bilíngue: PT + EN separados por ---)",
  "tasks": [{"title": "tarefa 1", "description": "descrição"}],
  "prompts": [{"title": "titulo", "prompt_text": "texto do prompt em PT\\n---\\ntexto em EN", "category": "setup|feature|ui|backend|general"}],
  "message": "mensagem opcional para o usuário"
}`;
        baseBody = {
          messages: [
            { role: "system", content: jsonPrompt },
            ...messages,
          ],
        };
      }

      const debateStartTime = Date.now();
      // === STEP 1: AI1 generates initial version ===
      const requestBody1 = providerConfig.transformBody(baseBody);
      const response1 = await fetch(providerConfig.url, {
        method: "POST",
        headers: providerConfig.headers,
        body: JSON.stringify(requestBody1),
      });

      if (!response1.ok) {
        const t = await response1.text();
        console.error("AI1 error:", response1.status, t);
        return new Response(JSON.stringify({ error: `Erro do provedor (${response1.status})` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawResult1 = await response1.json();
      console.log("AI1 initial generation done");

      // Extract AI1's output for review
      let ai1Content = "";
      let ai1ToolCalls: any[] = [];
      if (supportsTools) {
        const result1 = isClaude ? transformClaudeResponse(rawResult1) : rawResult1;
        ai1ToolCalls = result1.choices?.[0]?.message?.tool_calls || [];
        ai1Content = result1.choices?.[0]?.message?.content || "";
        // Serialize tool call args for review
        const toolSummary = ai1ToolCalls.map((tc: any) => {
          try {
            const args = JSON.parse(tc.function.arguments);
            if (tc.function.name === "save_prd") return `PRD:\n${(args.prd_content || "").slice(0, 3000)}...`;
            if (tc.function.name === "save_tasks") return `TASKS:\n${JSON.stringify(args.tasks?.slice(0, 10), null, 1)}`;
            if (tc.function.name === "save_prompts") return `PROMPTS:\n${JSON.stringify(args.prompts?.slice(0, 5), null, 1)}`;
          } catch { return ""; }
          return "";
        }).join("\n\n");
        ai1Content = toolSummary + "\n\n" + ai1Content;
      } else {
        ai1Content = rawResult1.choices?.[0]?.message?.content || "";
      }

      // === STEP 2: AI2 critiques ===
      // Use same provider as main if reviewer_mode is "same", otherwise Lovable AI
      const reviewerConfig = (effectiveSettings?.reviewer_mode === "same")
        ? providerConfig
        : getProviderConfig(null, LOVABLE_API_KEY);
      const reviewPrompt = `Você é um REVISOR TÉCNICO SÊNIOR. Analise o PRD, tarefas e prompts gerados abaixo e forneça críticas construtivas.

Avalie:
1. **Completude do PRD**: Faltam seções? Requisitos ambíguos? User stories claras?
2. **Qualidade das tarefas**: São granulares o suficiente? Ordem lógica? Faltam tarefas?
3. **Prompts**: São claros e acionáveis? Cobrem todos os aspectos do projeto?
4. **Consistência**: PRD, tarefas e prompts estão alinhados entre si?
5. **Regras de negócio**: Foram respeitadas no PRD e refletidas nas tarefas?

CONTEXTO DO PROJETO:
${systemPrompt.slice(0, 4000)}

CONTEÚDO GERADO PELA IA1:
${ai1Content.slice(0, 8000)}

Responda com uma lista objetiva de melhorias necessárias. Seja direto e específico.`;

      const reviewBody = reviewerConfig.transformBody({
        messages: [
          { role: "system", content: "Você é um revisor técnico sênior. Seja objetivo e construtivo." },
          { role: "user", content: reviewPrompt },
        ],
      });

      let reviewFeedback = "";
      try {
        const response2 = await fetch(reviewerConfig.url, {
          method: "POST",
          headers: reviewerConfig.headers,
          body: JSON.stringify(reviewBody),
        });
        if (response2.ok) {
          const reviewResult = await response2.json();
          reviewFeedback = reviewResult.choices?.[0]?.message?.content || "";
          console.log("AI2 review done, feedback length:", reviewFeedback.length);
        }
      } catch (e) {
        console.error("AI2 review error:", e);
      }

      // === STEP 3: AI1 refines based on feedback (if we got feedback) ===
      let finalResult = rawResult1;
      if (reviewFeedback && supportsTools) {
        const refineBody: any = {
          messages: [
            { role: "system", content: systemPrompt + generateInstruction },
            ...messages,
            { role: "user", content: "Por favor, gere o PRD, as tarefas e os prompts do projeto agora." },
            { role: "assistant", content: ai1Content.slice(0, 4000) },
            { role: "user", content: `Um REVISOR TÉCNICO SÊNIOR analisou seu trabalho e encontrou os seguintes pontos de melhoria:\n\n${reviewFeedback}\n\nPor favor, REFINE e MELHORE o PRD, tarefas e prompts com base nesse feedback. Use as ferramentas para salvar a versão melhorada. SEMPRE chame as 3 ferramentas (save_prd, save_tasks, save_prompts).` },
          ],
          tools,
          tool_choice: "auto",
        };

        const requestBody3 = providerConfig.transformBody(refineBody);
        try {
          const response3 = await fetch(providerConfig.url, {
            method: "POST",
            headers: providerConfig.headers,
            body: JSON.stringify(requestBody3),
          });
          if (response3.ok) {
            finalResult = await response3.json();
            console.log("AI1 refinement done");
          }
        } catch (e) {
          console.error("AI1 refinement error:", e);
          // Fall back to initial result
        }
      }

      // Process final result and save to database
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const saved: Record<string, boolean> = {};
      let contentText = "";

      if (supportsTools) {
        const result = isClaude ? transformClaudeResponse(finalResult) : finalResult;
        const toolCalls = result.choices?.[0]?.message?.tool_calls || [];
        contentText = result.choices?.[0]?.message?.content || "";
        if (reviewFeedback) {
          contentText += "\n\n---\n🔍 **Revisão por IA:** O conteúdo foi refinado automaticamente com base em uma revisão técnica independente.";
        }
        console.log("Tool calls count:", toolCalls.length, "Content length:", contentText.length);

        for (const call of toolCalls) {
          try {
            const args = JSON.parse(call.function.arguments);
            if (call.function.name === "save_prd" && args.prd_content) {
              await supabase.from("projects").update({ prd_content: args.prd_content, status: "prd_ready" }).eq("id", projectId);
              saved.prd = true;
            }
            if (call.function.name === "save_tasks" && args.tasks) {
              const { data: existingTasks } = await supabase
                .from("project_tasks").select("title, status").eq("project_id", projectId);
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
                prompt_type: p.prompt_type || "implementation",
              }));
              await supabase.from("project_prompts").insert(promptRows);
              saved.prompts = true;
            }
          } catch (e) {
            console.error("Tool call error:", e);
          }
        }
      } else {
        const rawContent = finalResult.choices?.[0]?.message?.content || "";
        try {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.prd_content) {
              await supabase.from("projects").update({ prd_content: parsed.prd_content, status: "prd_ready" }).eq("id", projectId);
              saved.prd = true;
            }
            if (parsed.tasks?.length) {
              const { data: existingTasks } = await supabase
                .from("project_tasks").select("title, status").eq("project_id", projectId);
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

      const debateDuration = Date.now() - debateStartTime;
      const debate = {
        happened: !!reviewFeedback,
        reviewerMode: effectiveSettings?.reviewer_mode || "lovable",
        reviewerProvider: (effectiveSettings?.reviewer_mode === "same")
          ? (effectiveSettings?.provider || "lovable")
          : "lovable",
        mainProvider: effectiveSettings?.provider || "lovable",
        mainModel: effectiveSettings?.model || null,
        feedbackPreview: reviewFeedback ? reviewFeedback.slice(0, 500) : null,
        steps: [
          { step: 1, label: "IA Principal gerou versão inicial", done: true },
          { step: 2, label: "IA Revisora analisou e criticou", done: !!reviewFeedback },
          { step: 3, label: "IA Principal refinou com base no feedback", done: !!reviewFeedback && supportsTools },
        ],
      };

      // Save debate record to database
      try {
        await supabase.from("project_debates").insert({
          project_id: projectId,
          user_id: userId,
          main_provider: debate.mainProvider,
          main_model: debate.mainModel,
          reviewer_provider: debate.reviewerProvider,
          reviewer_mode: debate.reviewerMode,
          initial_output: ai1Content.slice(0, 50000),
          review_feedback: reviewFeedback ? reviewFeedback.slice(0, 50000) : null,
          final_output: contentText ? contentText.slice(0, 50000) : null,
          debate_happened: debate.happened,
          duration_ms: debateDuration,
        });
        console.log("Debate record saved");
      } catch (e) {
        console.error("Failed to save debate record:", e);
      }

      return new Response(JSON.stringify({ saved, content: contentText, debate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === AUDIT ACTION: Dual AI consistency analysis ===
    if (action === "audit") {
      const auditStartTime = Date.now();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const auditContext = projectContext?.auditContext || "";

      // STEP 1: AI1 generates the full audit
      const auditPrompt = `Você é um AUDITOR SÊNIOR DE PROJETOS DE SOFTWARE com mais de 15 anos de experiência. Realize uma análise COMPLETA E EXAUSTIVA do projeto abaixo.

## CHECKLIST DE VERIFICAÇÃO (confirme cada item):
- [ ] PRD foi analisado em profundidade
- [ ] Skills/tecnologias foram verificadas contra o PRD e prompts
- [ ] Regras de negócio foram comparadas com tarefas e PRD
- [ ] TODAS as tarefas foram revisadas individualmente (status, descrição, granularidade)
- [ ] TODOS os prompts foram analisados (tipo, conteúdo, cobertura)
- [ ] TODOS os documentos anexados foram lidos e cruzados
- [ ] Histórico de chat foi considerado para contexto
- [ ] Consistência cruzada entre TODOS os elementos foi verificada

## IDENTIFIQUE COM RIGOR:

1. **🔴 Contradições** — Informações que se contradizem entre PRD, regras, docs, tasks ou prompts. Compare CADA elemento com TODOS os demais.
2. **🟡 Inconsistências** — Skills listadas que não aparecem nos prompts/PRD. Tecnologias no PRD sem skill correspondente. Prompts que referenciam funcionalidades não descritas.
3. **🟠 Lacunas** — Regras de negócio sem tarefas. Funcionalidades no PRD sem prompts. Tarefas sem prompts associados. Documentos com requisitos não refletidos.
4. **🔵 Redundâncias** — Informações duplicadas, prompts sobrepostos, tarefas redundantes.
5. **⚠️ Qualidade** — Avalie CADA elemento:
   - PRD: clareza, completude, critérios de aceite, user stories
   - Tarefas: granularidade, descrições, ordem lógica, dependências
   - Prompts: especificidade, contexto, actionability para um LLM
   - Regras de negócio: clareza, ambiguidade, completude
   - Skills: adequação ao escopo do projeto
   - Documentos: relevância, aproveitamento do conteúdo
6. **🟢 Sugestões** — Melhorias concretas e priorizadas

## REGRAS:
- Cite EXATAMENTE onde está cada problema (ex: "Na tarefa 3...", "No documento X...", "No prompt de backend...")
- NÃO ignore nenhuma seção, mesmo vazia (reporte como lacuna crítica)
- Ao final, dê uma NOTA DE MATURIDADE (1-10) com justificativa detalhada

---
${auditContext}`;

      const auditBody1 = providerConfig.transformBody({
        messages: [
          { role: "system", content: "Você é um auditor sênior de projetos de software. Seja extremamente rigoroso e detalhista." },
          { role: "user", content: auditPrompt },
        ],
      });

      const resp1 = await fetch(providerConfig.url, {
        method: "POST",
        headers: providerConfig.headers,
        body: JSON.stringify(auditBody1),
      });

      if (!resp1.ok) {
        const t = await resp1.text();
        console.error("Audit AI1 error:", resp1.status, t);
        return new Response(JSON.stringify({ error: "Erro na IA ao auditar" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const auditResult1 = await resp1.json();
      const isClaude1 = llmSettings?.provider === "claude";
      const audit1Content = isClaude1
        ? (transformClaudeResponse(auditResult1).choices?.[0]?.message?.content || "")
        : (auditResult1.choices?.[0]?.message?.content || "");
      console.log("Audit AI1 done, length:", audit1Content.length);

      // STEP 2: AI2 (reviewer) critiques the audit itself
      const reviewerConfig = (effectiveSettings?.reviewer_mode === "same")
        ? providerConfig
        : getProviderConfig(null, LOVABLE_API_KEY);

      const auditReviewPrompt = `Você é um CONTRA-AUDITOR INDEPENDENTE. Outro auditor analisou um projeto e produziu o relatório abaixo. Sua missão é:

1. **Verificar se o auditor foi rigoroso o suficiente** — Ele deixou passar alguma contradição? Ignorou alguma seção?
2. **Identificar falsos positivos** — O auditor apontou problemas que na verdade não existem?
3. **Encontrar problemas adicionais** — Há contradições ou lacunas que o primeiro auditor NÃO percebeu?
4. **Avaliar a nota** — A nota de maturidade está justa? Deveria ser mais alta ou mais baixa?

CONTEXTO ORIGINAL DO PROJETO:
${auditContext.slice(0, 6000)}

RELATÓRIO DO PRIMEIRO AUDITOR:
${audit1Content.slice(0, 8000)}

Responda com uma análise objetiva e direta. Liste especificamente o que foi bem feito e o que precisa ser corrigido no relatório.`;

      let auditReviewFeedback = "";
      try {
        const reviewBody = reviewerConfig.transformBody({
          messages: [
            { role: "system", content: "Você é um contra-auditor independente. Seja rigoroso e imparcial." },
            { role: "user", content: auditReviewPrompt },
          ],
        });
        const resp2 = await fetch(reviewerConfig.url, {
          method: "POST",
          headers: reviewerConfig.headers,
          body: JSON.stringify(reviewBody),
        });
        if (resp2.ok) {
          const reviewResult = await resp2.json();
          auditReviewFeedback = reviewResult.choices?.[0]?.message?.content || "";
          console.log("Audit AI2 review done, length:", auditReviewFeedback.length);
        }
      } catch (e) {
        console.error("Audit AI2 error:", e);
      }

      // STEP 3: AI1 produces final consolidated audit
      let finalAudit = audit1Content;
      if (auditReviewFeedback) {
        try {
          const refineBody = providerConfig.transformBody({
            messages: [
              { role: "system", content: "Você é um auditor sênior. Produza o relatório final definitivo." },
              { role: "user", content: auditPrompt },
              { role: "assistant", content: audit1Content.slice(0, 6000) },
              { role: "user", content: `Um CONTRA-AUDITOR INDEPENDENTE revisou seu relatório e encontrou os seguintes pontos:\n\n${auditReviewFeedback}\n\nProduza o RELATÓRIO FINAL CONSOLIDADO, incorporando as correções e pontos adicionais identificados. Mantenha o formato original (seções, emojis, nota). Corrija falsos positivos e adicione problemas que você não havia detectado.` },
            ],
          });
          const resp3 = await fetch(providerConfig.url, {
            method: "POST",
            headers: providerConfig.headers,
            body: JSON.stringify(refineBody),
          });
          if (resp3.ok) {
            const finalResult = await resp3.json();
            finalAudit = finalResult.choices?.[0]?.message?.content || audit1Content;
            console.log("Audit AI1 refinement done");
          }
        } catch (e) {
          console.error("Audit AI1 refinement error:", e);
        }
      }

      const auditDuration = Date.now() - auditStartTime;

      // STEP 4: Generate actionable fix prompts based on the audit
      let fixPrompts: { title: string; prompt: string; severity: string }[] = [];
      try {
        const fixBody = reviewerConfig.transformBody({
          messages: [
            { role: "system", content: "Você gera prompts de correção concisos para um chat de IA que planeja projetos de software." },
            { role: "user", content: `Baseado no relatório de auditoria abaixo, gere de 3 a 6 prompts de CORREÇÃO que o usuário pode enviar no chat para pedir à IA que ajuste o projeto.

Cada prompt deve:
- Ser uma instrução clara e direta para a IA do chat
- Focar em UM problema específico encontrado na auditoria
- Usar linguagem imperativa (ex: "Atualize o PRD para...", "Adicione tarefas para...")
- Ter no máximo 2-3 frases
- Ser BILÍNGUE: primeiro em português, depois "---", depois a mesma instrução em inglês

RELATÓRIO DE AUDITORIA:
${finalAudit.slice(0, 6000)}

Responda EXCLUSIVAMENTE com um JSON válido neste formato (sem markdown, sem texto antes/depois):
[
  {"title": "título curto em PT (max 6 palavras)", "prompt": "instrução em PT\\n---\\ninstruction in EN", "severity": "high|medium|low"}
]` },
          ],
        });
        const fixResp = await fetch(reviewerConfig.url, {
          method: "POST",
          headers: reviewerConfig.headers,
          body: JSON.stringify(fixBody),
        });
        if (fixResp.ok) {
          const fixResult = await fixResp.json();
          const fixContent = fixResult.choices?.[0]?.message?.content || "";
          const jsonMatch = fixContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            fixPrompts = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        console.error("Fix prompts generation error:", e);
      }

      // Save audit debate record
      try {
        await supabase.from("project_debates").insert({
          project_id: projectId,
          user_id: userId,
          main_provider: effectiveSettings?.provider || "lovable",
          main_model: effectiveSettings?.model || null,
          reviewer_provider: (effectiveSettings?.reviewer_mode === "same")
            ? (effectiveSettings?.provider || "lovable")
            : "lovable",
          reviewer_mode: effectiveSettings?.reviewer_mode || "lovable",
          initial_output: audit1Content.slice(0, 50000),
          review_feedback: auditReviewFeedback ? auditReviewFeedback.slice(0, 50000) : null,
          final_output: finalAudit.slice(0, 50000),
          debate_happened: !!auditReviewFeedback,
          duration_ms: auditDuration,
        });
      } catch (e) {
        console.error("Failed to save audit debate:", e);
      }

      return new Response(JSON.stringify({
        result: finalAudit,
        fixPrompts,
        debate: {
          happened: !!auditReviewFeedback,
          initialAudit: audit1Content,
          reviewFeedback: auditReviewFeedback || null,
          finalAudit,
          mainProvider: effectiveSettings?.provider || "lovable",
          reviewerProvider: (effectiveSettings?.reviewer_mode === "same")
            ? (effectiveSettings?.provider || "lovable")
            : "lovable",
          durationMs: auditDuration,
        },
      }), {
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
