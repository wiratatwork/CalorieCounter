// Supabase Edge Function: ประมาณแคลอรี่ด้วย Gemini (key อยู่ที่ secret ฝั่ง server)
// Deploy: supabase functions deploy estimate-calories
// Secrets: supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=gemini-3.1-flash-lite

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseCalories(text: string | undefined | null): number | null {
  if (!text) return null;
  const trimmed = String(text).trim();

  try {
    const parsed = JSON.parse(trimmed);
    const value = parsed.calories ?? parsed.calorie ?? parsed.kcal;
    const num = parseInt(value, 10);
    if (!Number.isNaN(num) && num >= 0) return num;
  } catch {
    // fall through
  }

  const match = trimmed.match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return Number.isNaN(num) ? null : num;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-3.1-flash-lite";

  if (!geminiApiKey) {
    return jsonResponse({ error: "GEMINI_API_KEY is not configured on the server" }, 500);
  }

  let foodName = "";
  try {
    const body = await req.json();
    foodName = String(body?.food_name ?? body?.food ?? "").trim();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!foodName || foodName.length > 200) {
    return jsonResponse({ error: "food_name is required (max 200 chars)" }, 400);
  }

  const prompt = [
    "คุณเป็นผู้ช่วยประมาณแคลอรี่อาหาร",
    "ประมาณแคลอรี่สำหรับ 1 ที่เสิร์ฟทั่วไป ของเมนูที่ผู้ใช้ระบุ",
    'ตอบเป็น JSON เท่านั้นในรูปแบบ {"calories": <จำนวนเต็ม>}',
    "ห้ามใส่คำอธิบายอื่น",
    `เมนู: ${foodName}`,
  ].join("\n");

  const geminiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent` +
    `?key=${encodeURIComponent(geminiApiKey)}`;

  try {
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", geminiRes.status, errText.slice(0, 500));
      return jsonResponse({ error: "Gemini request failed" }, 502);
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const calories = parseCalories(text);

    if (calories === null) {
      return jsonResponse({ error: "Could not parse calories from model response" }, 502);
    }

    return jsonResponse({ calories, food_name: foodName });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Unexpected server error" }, 500);
  }
});
