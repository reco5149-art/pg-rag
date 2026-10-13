// Ollama와 주고받는 일만 담당 — CLAUDE.md "생성 계약"
export const OLLAMA_URL = "http://localhost:11434";
export const LLM_MODEL = "qwen3.5:2b";

/** Ollama가 켜져 있는지 (GET /api/tags 성공 여부) */
export async function pingOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** 스트리밍 대화: 조각(토큰)이 올 때마다 onToken을 부르고, 전체 답변 문자열을 돌려준다 */
export async function chatStream(messages, onToken) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: LLM_MODEL, messages, stream: true, think: false, options: { temperature: 0 } }),
  });
  if (!res.ok) throw new Error(`Ollama 응답 오류 ${res.status}: ${await res.text()}`);

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let answer = "";
  const handleLine = (line) => {
    if (!line.trim()) return;
    const msg = JSON.parse(line);
    if (msg.error) throw new Error(`Ollama 오류: ${msg.error}`);
    const piece = msg.message?.content ?? "";
    if (piece) {
      answer += piece;
      onToken(piece);
    }
  };
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true }); // 한글이 조각 경계에서 깨지지 않게
    const lines = buffer.split("\n");
    buffer = lines.pop(); // 덜 받은 줄은 다음 조각과 합친다
    lines.forEach(handleLine);
  }
  buffer += decoder.decode();
  handleLine(buffer);
  return answer;
}
