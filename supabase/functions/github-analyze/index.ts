import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  return match ? { owner: match[1], repo: match[2] } : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId } = await req.json();
    if (!projectId) throw new Error("projectId is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Load project data
    const { data: project } = await sb.from("projects").select("*").eq("id", projectId).single();
    if (!project) throw new Error("Projeto não encontrado");
    if (!project.github_repo_url) throw new Error("Nenhum repositório GitHub conectado");

    const parsed = parseGithubUrl(project.github_repo_url);
    if (!parsed) throw new Error("URL do repositório inválida");

    // Load project context
    const [tasksRes, promptsRes, rulesRes, skillsRes] = await Promise.all([
      sb.from("project_tasks").select("*").eq("project_id", projectId).order("sort_order"),
      sb.from("project_prompts").select("*").eq("project_id", projectId).order("sort_order"),
      sb.from("project_business_rules").select("*").eq("project_id", projectId).maybeSingle(),
      sb.from("project_skills").select("*").eq("project_id", projectId),
    ]);

    // Build GitHub headers (with optional token for private repos)
    const ghHeaders: Record<string, string> = { "User-Agent": "CodeBuddy-App" };
    if (project.github_token) {
      ghHeaders["Authorization"] = `Bearer ${project.github_token}`;
    }

    // Fetch repo tree from GitHub
    let tree: any[] = [];
    let branch = "main";
    let treeResp = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/main?recursive=1`, {
      headers: ghHeaders,
    });
    if (!treeResp.ok) {
      branch = "master";
      treeResp = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/master?recursive=1`, {
        headers: ghHeaders,
      });
    }
    if (!treeResp.ok) throw new Error("Não foi possível acessar o repositório. Verifique a URL e o token.");
    const treeData = await treeResp.json();
    tree = (treeData.tree || []).filter((t: any) => t.type === "blob").map((t: any) => t.path);

    // Fetch key files content (README, package.json, etc)
    const keyFiles = ["README.md", "readme.md", "package.json", "src/App.tsx", "src/app.tsx", "src/main.tsx", "src/index.tsx"];
    const fileContents: Record<string, string> = {};
    
    for (const file of keyFiles) {
      if (tree.includes(file)) {
        try {
          const fileResp = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${file}?ref=${branch}`, {
            headers: { ...ghHeaders, Accept: "application/vnd.github.v3.raw" },
          });
          if (fileResp.ok) {
            const content = await fileResp.text();
            fileContents[file] = content.slice(0, 3000); // limit
          }
        } catch {}
      }
    }

    // Build analysis prompt
    const tasksList = (tasksRes.data || []).map((t: any, i: number) => `${i + 1}. [${t.status}] ${t.title}${t.description ? ` — ${t.description}` : ""}`).join("\n");
    const promptsList = (promptsRes.data || []).map((p: any) => `- ${p.title}: ${p.prompt_text.slice(0, 200)}`).join("\n");
    const skills = (skillsRes.data || []).map((s: any) => s.name).join(", ");
    const rules = rulesRes.data?.content || "";

    const fileTree = tree.slice(0, 300).join("\n");
    const fileContentsStr = Object.entries(fileContents).map(([f, c]) => `### ${f}\n\`\`\`\n${c}\n\`\`\``).join("\n\n");

    const prompt = `Você é um auditor sênior de projetos de software. Analise a COERÊNCIA entre o que foi planejado no projeto e o que realmente existe no repositório GitHub.

## PROJETO PLANEJADO

### PRD:
${project.prd_content || "(vazio)"}

### Tarefas:
${tasksList || "(nenhuma)"}

### Prompts Lovable:
${promptsList || "(nenhum)"}

### Skills/Tecnologias:
${skills || "(nenhuma)"}

### Regras de Negócio:
${rules || "(nenhuma)"}

---

## REPOSITÓRIO GITHUB: ${parsed.owner}/${parsed.repo}

### Estrutura de Arquivos (${tree.length} arquivos):
${fileTree}

### Conteúdo de Arquivos-Chave:
${fileContentsStr || "(nenhum arquivo-chave encontrado)"}

---

## INSTRUÇÕES DE ANÁLISE:

Produza um relatório em markdown com as seguintes seções:

### 1. 📊 Visão Geral
- O repositório corresponde ao que foi planejado?
- Qual % estimado de implementação?

### 2. ✅ Implementado
- Quais funcionalidades do PRD JÁ aparecem no código?
- Quais tarefas provavelmente já foram feitas?

### 3. ❌ Gaps / Não Implementado  
- Quais funcionalidades do PRD NÃO aparecem no código?
- Quais tarefas marcadas como "done" parecem NÃO estar implementadas?

### 4. ⚠️ Divergências
- O código implementa algo que NÃO está no PRD?
- As tecnologias usadas correspondem às skills definidas?
- As regras de negócio estão sendo respeitadas?

### 5. 🔧 Recomendações
- Próximos passos prioritários
- Ajustes no PRD se necessário
- Tarefas que devem ser adicionadas ou removidas

### 6. 📝 Nota de Aderência: X/10
- Nota de 1 a 10 sobre a aderência do código ao projeto planejado.

Seja objetivo, direto e construtivo. Responda em português.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um auditor técnico de projetos de software." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Erro ao chamar a IA");
    }

    const aiData = await aiResp.json();
    const analysis = aiData.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("github-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
