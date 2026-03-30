import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { createClient } from "@supabase/supabase-js";

const app = new Hono();

function getSupabaseClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

async function getUserId(authHeader: string): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = getSupabaseClient(authHeader);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}

const mcpServer = new McpServer({
  name: "codebuddy-mcp",
  version: "1.0.0",
});

mcpServer.tool({
  name: "list_projects",
  description: "List all projects for the authenticated user",
  inputSchema: { type: "object", properties: {}, required: [] },
  handler: async (_params: Record<string, unknown>, extra: { headers?: Record<string, string> }) => {
    const authHeader = extra?.headers?.authorization || extra?.headers?.Authorization || "";
    const userId = await getUserId(authHeader);
    if (!userId) return { content: [{ type: "text", text: "Unauthorized" }] };

    const supabase = getSupabaseClient(authHeader);
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, status, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool({
  name: "get_project_prd",
  description: "Get the PRD (Product Requirements Document) content for a specific project",
  inputSchema: {
    type: "object",
    properties: { project_id: { type: "string", description: "The project UUID" } },
    required: ["project_id"],
  },
  handler: async (params: { project_id: string }, extra: { headers?: Record<string, string> }) => {
    const authHeader = extra?.headers?.authorization || extra?.headers?.Authorization || "";
    const userId = await getUserId(authHeader);
    if (!userId) return { content: [{ type: "text", text: "Unauthorized" }] };

    const supabase = getSupabaseClient(authHeader);
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, prd_content")
      .eq("id", params.project_id)
      .single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: data?.prd_content || "No PRD content available." }] };
  },
});

mcpServer.tool({
  name: "get_project_tasks",
  description: "Get all tasks for a specific project",
  inputSchema: {
    type: "object",
    properties: { project_id: { type: "string", description: "The project UUID" } },
    required: ["project_id"],
  },
  handler: async (params: { project_id: string }, extra: { headers?: Record<string, string> }) => {
    const authHeader = extra?.headers?.authorization || extra?.headers?.Authorization || "";
    const userId = await getUserId(authHeader);
    if (!userId) return { content: [{ type: "text", text: "Unauthorized" }] };

    const supabase = getSupabaseClient(authHeader);
    const { data, error } = await supabase
      .from("project_tasks")
      .select("id, title, description, status, sort_order, created_at")
      .eq("project_id", params.project_id)
      .order("sort_order");

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool({
  name: "get_project_prompts",
  description: "Get all generated prompts for a specific project",
  inputSchema: {
    type: "object",
    properties: { project_id: { type: "string", description: "The project UUID" } },
    required: ["project_id"],
  },
  handler: async (params: { project_id: string }, extra: { headers?: Record<string, string> }) => {
    const authHeader = extra?.headers?.authorization || extra?.headers?.Authorization || "";
    const userId = await getUserId(authHeader);
    if (!userId) return { content: [{ type: "text", text: "Unauthorized" }] };

    const supabase = getSupabaseClient(authHeader);
    const { data, error } = await supabase
      .from("project_prompts")
      .select("id, title, prompt_text, category, prompt_type, sort_order")
      .eq("project_id", params.project_id)
      .order("sort_order");

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool({
  name: "get_project_skills",
  description: "Get all skills associated with a specific project",
  inputSchema: {
    type: "object",
    properties: { project_id: { type: "string", description: "The project UUID" } },
    required: ["project_id"],
  },
  handler: async (params: { project_id: string }, extra: { headers?: Record<string, string> }) => {
    const authHeader = extra?.headers?.authorization || extra?.headers?.Authorization || "";
    const userId = await getUserId(authHeader);
    if (!userId) return { content: [{ type: "text", text: "Unauthorized" }] };

    const supabase = getSupabaseClient(authHeader);
    const { data, error } = await supabase
      .from("project_skills")
      .select("id, name, context_md, github_url")
      .eq("project_id", params.project_id);

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool({
  name: "get_business_rules",
  description: "Get business rules for a specific project",
  inputSchema: {
    type: "object",
    properties: { project_id: { type: "string", description: "The project UUID" } },
    required: ["project_id"],
  },
  handler: async (params: { project_id: string }, extra: { headers?: Record<string, string> }) => {
    const authHeader = extra?.headers?.authorization || extra?.headers?.Authorization || "";
    const userId = await getUserId(authHeader);
    if (!userId) return { content: [{ type: "text", text: "Unauthorized" }] };

    const supabase = getSupabaseClient(authHeader);
    const { data, error } = await supabase
      .from("project_business_rules")
      .select("id, content, created_at, updated_at")
      .eq("project_id", params.project_id);

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

const transport = new StreamableHttpTransport();

app.all("/*", async (c) => {
  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
