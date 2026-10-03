// Text-generation models that are free of charge on the Gemini API free tier.
// Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-03).
// Live, TTS, transcription, image and embedding models are left out on purpose.
// The 2.5 models were removed on 2026-10-03: the API returns 404 "no longer available to new users".
export const GEMINI_MODELS = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", description: "Newest Flash, best quality" },
  { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", description: "Fast and capable" },
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", description: "Fast and capable" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", description: "Default, stable all-rounder" },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", description: "Lowest latency" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", description: "Lightweight and quick" },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview", description: "Preview model" },
];

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

export const isAllowedModel = (id) => GEMINI_MODELS.some((m) => m.id === id);
