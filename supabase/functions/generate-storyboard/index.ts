import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { story } = await req.json();
    
    if (!story) {
      return new Response(
        JSON.stringify({ error: "Story text is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log("Extracting key scenes from story...");
    
    // Step 1: Extract key scenes from the story using Lovable AI
    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a storyboard expert for children's stories. Extract 4-6 key visual scenes from the story that would make a great storyboard. For each scene, provide a detailed visual description suitable for image generation."
          },
          {
            role: "user",
            content: `Extract key scenes from this children's story and describe them visually:\n\n${story}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_scenes",
              description: "Extract key visual scenes from a children's story",
              parameters: {
                type: "object",
                properties: {
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { 
                          type: "string",
                          description: "Detailed visual description for image generation, including characters, setting, mood, and action"
                        },
                        sequence: { 
                          type: "number",
                          description: "Scene number in sequence"
                        }
                      },
                      required: ["description", "sequence"]
                    }
                  }
                },
                required: ["scenes"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_scenes" } }
      })
    });

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      console.error("Scene extraction error:", extractResponse.status, errorText);
      throw new Error(`Failed to extract scenes: ${extractResponse.status}`);
    }

    const extractData = await extractResponse.json();
    console.log("Extraction response:", JSON.stringify(extractData));
    
    const toolCall = extractData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No scenes extracted from story");
    }

    const scenesData = JSON.parse(toolCall.function.arguments);
    const scenes = scenesData.scenes;
    
    console.log(`Extracted ${scenes.length} scenes, generating images...`);

    // Step 2: Generate images for each scene
    const storyboard = [];
    
    for (const scene of scenes) {
      console.log(`Generating image for scene ${scene.sequence}...`);
      
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `Create a colorful, child-friendly illustration for a children's storybook: ${scene.description}. Style: vibrant, warm, illustrated children's book art.`
            }
          ],
          modalities: ["image", "text"]
        })
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error(`Image generation error for scene ${scene.sequence}:`, imageResponse.status, errorText);
        continue;
      }

      const imageData = await imageResponse.json();
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageUrl) {
        storyboard.push({
          sequence: scene.sequence,
          description: scene.description,
          imageUrl: imageUrl
        });
        console.log(`Successfully generated image for scene ${scene.sequence}`);
      }
    }

    console.log(`Generated ${storyboard.length} storyboard images`);

    return new Response(
      JSON.stringify({ storyboard }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-storyboard function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred" 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
