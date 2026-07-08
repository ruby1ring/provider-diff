#!/usr/bin/env node
/**
 * Quick verification: run ali_protocol_stream_basic against configured platforms.
 */
const API = process.env.API_BASE || "http://127.0.0.1:8080";

const TARGETS = [
  { label: "DeepSeek Baseline", platform: "deepseek", model: "deepseek-v4-flash" },
  { label: "阿里云百炼 (新加坡)", platform: "aliyun-sg", model: "deepseek-v4-flash" },
  { label: "阿里云百炼 (美国)", platform: "aliyun-us", model: "deepseek-v4-flash" },
];

async function runOne(target) {
  const body = {
    provider: "ali",
    endpoint_id: "chat_completions",
    config_platform_id: target.platform,
    model: target.model,
    case_ids: ["ali_protocol_stream_basic"],
    max_concurrency: 1
  };
  const response = await fetch(`${API}/api/run-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${target.label}: HTTP ${response.status} ${text.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "result") result = event.result;
      if (event.type === "error") throw new Error(`${target.label}: ${event.message || "stream error"}`);
    }
  }

  if (!result) throw new Error(`${target.label}: no result event`);
  const metrics = result.stream_metrics || {};
  const failed = (result.assertions || []).filter((a) => !a.pass);
  const streamAssertion = failed.find((a) => a.name === "stream_probe_attempts" || a.name === "min_content_chunks");
  return {
    label: target.label,
    conclusion: result.support_conclusion,
    http: result.http_status,
    sse: metrics.sse_chunk_count,
    content: metrics.content_chunk_count,
    reasoning: metrics.reasoning_chunk_count || 0,
    pass: result.support_conclusion === "supported" && failed.length === 0,
    failMessage: streamAssertion?.message || failed[0]?.message || ""
  };
}

const results = [];
for (const target of TARGETS) {
  try {
    results.push(await runOne(target));
  } catch (error) {
    results.push({ label: target.label, pass: false, failMessage: error.message });
  }
}

for (const row of results) {
  if (row.pass) {
    console.log(`OK  ${row.label} · HTTP ${row.http} · SSE ${row.sse} · content ${row.content} · reasoning ${row.reasoning}`);
  } else {
    console.log(`FAIL ${row.label} · ${row.conclusion || "error"} · ${row.failMessage || "unknown"}`);
  }
}

if (!results.every((row) => row.pass)) process.exit(1);
