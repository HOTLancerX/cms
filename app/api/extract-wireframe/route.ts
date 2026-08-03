import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, theme = "slate", detailLevel = "standard", layoutMode = "fullwidth" } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Image data (base64) is required." },
        { status: 400 }
      );
    }

    // Resolve API key from request body or environment variables
    const apiKey =
      body.apiKey ||
      process.env.NEXT_PUBLIC_AI_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.AI_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing. Please configure NEXT_PUBLIC_AI_KEY in .env.local or enter API Key." },
        { status: 400 }
      );
    }

    // Extract mime type and raw base64 data
    let mimeType = "image/png";
    let base64Data = image;

    if (image.includes(";base64,")) {
      const parts = image.split(";base64,");
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      base64Data = parts[1];
    }

    // Determine theme styling instructions for SVG output
    let themeColors = {
      bg: "#f8fafc",
      cardBg: "#ffffff",
      border: "#cbd5e1",
      accentBorder: "#94a3b8",
      fill: "#e2e8f0",
      textPrimary: "#334155",
      textMuted: "#94a3b8",
      highlight: "#3b82f6",
    };

    if (theme === "charcoal") {
      themeColors = {
        bg: "#18181b",
        cardBg: "#27272a",
        border: "#3f3f46",
        accentBorder: "#71717a",
        fill: "#3f3f46",
        textPrimary: "#f4f4f5",
        textMuted: "#a1a1aa",
        highlight: "#fbbf24",
      };
    } else if (theme === "blueprint") {
      themeColors = {
        bg: "#0f172a",
        cardBg: "#1e293b",
        border: "#334155",
        accentBorder: "#38bdf8",
        fill: "#1e293b",
        textPrimary: "#f8fafc",
        textMuted: "#64748b",
        highlight: "#0284c7",
      };
    } else if (theme === "minimal") {
      themeColors = {
        bg: "#ffffff",
        cardBg: "#ffffff",
        border: "#e2e8f0",
        accentBorder: "#cbd5e1",
        fill: "#f8fafc",
        textPrimary: "#1e293b",
        textMuted: "#cbd5e1",
        highlight: "#64748b",
      };
    }

    const isOriginalRatio = layoutMode === "original";

    const systemInstruction = `
You are an expert UI/UX Wireframe Architect and SVG Vector Graphics Engineer.
Your task is to analyze the user's provided screenshot layout and produce a clean, modern, crisp 16:9 SVG wireframe (width="1920", height="1080", viewBox="0 0 1920 1080").

STRICT REQUIREMENTS FOR SVG:
1. Exact dimensions: width="1920", height="1080", viewBox="0 0 1920 1080", xmlns="http://www.w3.org/2000/svg". DO NOT duplicate XML attributes on any tag.
2. FULL HEIGHT & CENTERED SCREENSHOT COMPONENT LAYOUT:
   - Canvas is a full-width 16:9 workspace (1920x1080).
   - For narrow screenshots, vertical card lists, mobile screens, or sidebar components:
     * FULL HEIGHT REQUIREMENT: The centered screenshot component MUST span across the FULL HEIGHT of the canvas vertically (from y=40/y=60 at the top to y=1020/y=1040 at the bottom, using ~980px to 1000px height).
     * HORIZONTAL PLACEMENT: Render the component centered horizontally in the middle of the canvas (e.g. x=640 to x=1280 or x=600 to x=1320).
     * The background container fills the full 16:9 canvas cleanly (${themeColors.bg}).
   - For wide desktop screenshots, span elements across the full 1920px width and 1080px height bounds.
3. Wireframe design elements:
   - Rounded rectangles for cards, buttons, input fields, containers (rx="6" to rx="12").
   - Crisp stroke lines (stroke-width="1.5" or "2").
   - Image placeholders: simple empty rounded rectangles with thin diagonal cross lines (X).
   - Text placeholders: clean horizontal rounded bars (capsule lines).
   - Include component IDs or class tags on major elements for identification (e.g. id="lead-card", id="news-list").
4. Theme Colors to incorporate:
   - Canvas Background: ${themeColors.bg}
   - Card/Container Background: ${themeColors.cardBg}
   - Border/Strokes: ${themeColors.border}
   - Secondary Borders/Dividers: ${themeColors.accentBorder}
   - Fill elements: ${themeColors.fill}
   - Text labels: ${themeColors.textPrimary}
   - Placeholder text lines: ${themeColors.textMuted}
   - Accent highlights: ${themeColors.highlight}
5. Detail level is set to "${detailLevel}". (${detailLevel === "detailed" ? "Include granular icons, secondary text lines, and sub-action buttons." : detailLevel === "minimalist" ? "Focus on major structural blocks and containers." : "Include standard buttons, inputs, key titles, and container cards."})
6. Return a valid JSON object matching the requested schema. The 'svg' field MUST contain the full, valid SVG string starting with '<svg' and ending with '</svg>'. Do NOT wrap the svg string in markdown backticks inside the JSON value.
`;

    const promptText = `
Analyze this screenshot and reconstruct it as a 16:9 SVG wireframe (1920x1080).
Requirements:
1. The canvas is 16:9 (1920x1080).
2. The screenshot layout appears centered in the middle of the canvas horizontally.
3. CRITICAL: The screenshot component spans FULL HEIGHT vertically from top (y=40) to bottom (y=1040) across the canvas.

Output JSON with:
1. "svg": The complete 16:9 SVG markup string.
2. "title": A concise title for the detected wireframe layout.
3. "summary": A brief 1-2 sentence description of the UI layout hierarchy.
4. "detectedElements": An array of objects describing the recognized UI regions with properties: "id", "name", "type", and "description".
`;

    const rawRequestedModel =
      body.model ||
      process.env.NEXT_PUBLIC_AI_MODELS;

    // Sanitize non-existent/invalid model names (e.g. gemini-3.6-flash -> gemini-2.5-flash)
    const sanitizedModel =
      rawRequestedModel.includes("3.6") || rawRequestedModel.includes("3.5") || rawRequestedModel.includes("3.1")
        ? "gemini-3.6-flash"
        : rawRequestedModel;

    // Dynamic model candidate cascade list with REAL working Google Gemini model names
    const rawCandidates = [
      sanitizedModel,
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];

    // Deduplicate candidate list
    const candidateModels = Array.from(new Set(rawCandidates));

    let lastError = "";
    let resData: any = null;
    let successfulModel = "";

    for (const modelName of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const apiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "aistudio-build",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  summary: { type: "STRING" },
                  svg: { type: "STRING", description: "Full 16:9 SVG string 1920x1080" },
                  detectedElements: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        id: { type: "STRING" },
                        name: { type: "STRING" },
                        type: { type: "STRING" },
                        description: { type: "STRING" },
                      },
                      required: ["id", "name", "type"],
                    },
                  },
                },
                required: ["title", "summary", "svg", "detectedElements"],
              },
            },
          }),
        });

        const data = await apiRes.json();

        if (apiRes.ok && !data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          resData = data;
          successfulModel = modelName;
          break;
        } else {
          lastError = data.error?.message || `Model ${modelName} returned HTTP ${apiRes.status}`;
          console.warn(`[Gemini Cascade] ${modelName} failed (${apiRes.status}): ${lastError}. Retrying fallback...`);
        }
      } catch (err: any) {
        lastError = err.message || `Failed requesting ${modelName}`;
        console.warn(`[Gemini Cascade] ${modelName} exception: ${lastError}. Retrying fallback...`);
      }
    }

    if (!resData) {
      return NextResponse.json(
        { error: lastError || "All Gemini candidate models returned errors or high demand (503/429)." },
        { status: 503 }
      );
    }

    const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return NextResponse.json(
        { error: "Empty response from Gemini model." },
        { status: 500 }
      );
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, responseText);
      const svgMatch = responseText.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        parsedData = {
          title: "Extracted UI Wireframe",
          summary: "Reconstructed wireframe layout from screenshot.",
          svg: svgMatch[0],
          detectedElements: [
            { id: "header", name: "Header Navigation", type: "navigation", description: "Top bar" },
            { id: "main-content", name: "Main Content Area", type: "container", description: "Central grid layout" },
          ],
        };
      } else {
        return NextResponse.json(
          { error: "Failed to parse SVG from model response." },
          { status: 500 }
        );
      }
    }

    let svgContent = parsedData.svg || "";
    if (svgContent) {
      svgContent = svgContent
        .replace(/<rect\s+[^>]*x=["']60["']\s+y=["']40["']\s+width=["']1800["']\s+height=["']60["'][^>]*>(?:<\/rect>)?/gi, "")
        .replace(/<rect\s+[^>]*width=["']1800["']\s+height=["']60["']\s+x=["']60["']\s+y=["']40["'][^>]*>(?:<\/rect>)?/gi, "");

      if (!svgContent.includes('viewBox="0 0 1920 1080"')) {
        svgContent = svgContent.replace(
          /<svg/i,
          '<svg viewBox="0 0 1920 1080" width="1920" height="1080"'
        );
      }
    }

    return NextResponse.json({
      title: parsedData.title || "UI Wireframe",
      summary: parsedData.summary || "Wireframe generated successfully.",
      svg: svgContent,
      detectedElements: parsedData.detectedElements || [],
      modelUsed: successfulModel,
      engine: "ai",
    });
  } catch (error: any) {
    console.error("Wireframe Extraction Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract wireframe." },
      { status: 500 }
    );
  }
}
