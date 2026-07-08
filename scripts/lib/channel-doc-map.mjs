import { PROTOCOL_DOC_MANIFEST } from "../protocol-doc-manifest.mjs";

/** channel_id (+ optional protocol) → docs/api path */
export function docPathForChannel(channelId, protocolId = "chat_completions") {
  for (const [relPath, meta] of Object.entries(PROTOCOL_DOC_MANIFEST)) {
    if (meta.channel_id === channelId && meta.protocol_id === protocolId) return relPath;
  }
  const suffix = protocolId === "anthropic_messages" ? "message" : protocolId === "responses_api" ? "response" : "chat";
  const guess = `docs/api/${channelId}-${suffix}.md`;
  if (channelId === "deepseek" && protocolId === "chat_completions") return "docs/api/deepseek.md";
  return guess;
}

export function resolveChannelId(name = "") {
  const text = String(name).toLowerCase();
  if (!text) return "";
  if (text.includes("streamlake") || text.includes("万擎") || text.includes("快手")) return "streamlake";
  if (text.includes("aliyun") || text.includes("百炼") || text.includes("阿里")) return "aliyun";
  if (text.includes("deepseek")) return "deepseek";
  if (text.includes("moonshot") || text.includes("月之暗面")) return "moonshot";
  if (text.includes("zhipu") || text.includes("智谱")) return "zhipu";
  if (text.includes("minimax")) return "minimax";
  if (text.includes("siliconflow") || text.includes("硅基")) return "siliconflow";
  if (text.includes("openrouter")) return "openrouter";
  if (text.includes("openai")) return "openai";
  return text.replace(/[^a-z0-9_-]/g, "");
}

export function manifestEntryForDoc(relPath) {
  return PROTOCOL_DOC_MANIFEST[relPath] || null;
}
