import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId, projectId, filePath, fileName, fileType } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Download file from storage
    const { data: fileData, error: dlError } = await sb.storage
      .from("project-documents")
      .download(filePath);

    if (dlError || !fileData) {
      console.error("Download error:", dlError);
      return new Response(JSON.stringify({ error: "Falha ao baixar arquivo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let extractedText = "";

    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      // Use Lovable AI to extract text from PDF via vision
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Convert PDF to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      // Use Gemini vision to extract text from PDF
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extraia TODO o texto deste documento PDF. Retorne APENAS o conteúdo textual extraído, sem adicionar comentários, análises ou formatação extra. Mantenha a estrutura original (títulos, listas, parágrafos). Se houver tabelas, formate-as de forma legível.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 16000,
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("AI extraction error:", aiResp.status, errText);
        return new Response(JSON.stringify({ error: `AI extraction failed (${aiResp.status})` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResult = await aiResp.json();
      extractedText = aiResult.choices?.[0]?.message?.content || "";
    } else if (fileType?.startsWith("application/vnd") || fileName.match(/\.(doc|docx|xls|xlsx)$/i)) {
      // For Office documents, try basic text extraction
      extractedText = `[Documento Office: ${fileName} - extração de texto não disponível para este formato]`;
    } else {
      // Text-based files
      extractedText = await fileData.text();
    }

    if (extractedText) {
      // Update the document record with extracted text
      const { error: updateError } = await sb
        .from("project_documents")
        .update({ extracted_text: extractedText })
        .eq("id", documentId);

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(JSON.stringify({ error: "Falha ao salvar texto extraído" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, textLength: extractedText.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Extract error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
