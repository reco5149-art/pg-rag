// [2단계] 검색 + 프롬프트 조립 + LLM 답변 + 근거 목록
// 사용법: node src/ask.mjs "질문" [--k 3] [--show-prompt] [--no-rag]
import { search, WEAK_THRESHOLD } from "./search.mjs";
import { SYSTEM_MESSAGE, buildPrompt } from "./prompt.mjs";
import { pingOllama, chatStream, OLLAMA_URL } from "./ollama.mjs";

const args = process.argv.slice(2);
let k = 3;
let showPrompt = false;
let noRag = false;
const rest = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--k") k = Number(args[++i]) || 3;
  else if (args[i] === "--show-prompt") showPrompt = true;
  else if (args[i] === "--no-rag") noRag = true;
  else rest.push(args[i]);
}
const question = rest.join(" ").trim();
if (!question) {
  console.log('사용법: node src/ask.mjs "질문" [--k 3] [--show-prompt] [--no-rag]');
  process.exit(1);
}

async function ensureOllama() {
  if (!(await pingOllama())) {
    console.error(`Ollama가 실행 중인지 확인하세요 (확인: curl.exe ${OLLAMA_URL}/api/tags)`);
    process.exit(1);
  }
}

const write = (t) => process.stdout.write(t);
const sec = (ms) => (ms / 1000).toFixed(1);

if (noRag) {
  // RAG 없이: 검색·시스템 메시지 없이 질문만 보낸다 (비교 실험용)
  await ensureOllama();
  console.log("💬 답변 (RAG 없이)");
  const t0 = Date.now();
  await chatStream([{ role: "user", content: question }], write);
  console.log(`\n⏱ 답변 ${sec(Date.now() - t0)}초`);
  process.exit(0);
}

const t0 = Date.now();
const hits = await search(question, k);
const tSearch = Date.now() - t0;
const weak = hits[0].score < WEAK_THRESHOLD;
const messages = [
  { role: "system", content: SYSTEM_MESSAGE },
  { role: "user", content: buildPrompt(question, hits) },
];

if (showPrompt) {
  console.log("===== [system] =====");
  console.log(messages[0].content);
  console.log("\n===== [user] =====");
  console.log(messages[1].content);
  process.exit(0);
}

console.log("🔎 검색 결과");
for (const h of hits) console.log(`  ${h.id}  ${h.score.toFixed(3)}  ${h.section}`);
if (weak) console.log(`  ⚠ 관련 자료가 약함(<${WEAK_THRESHOLD})`);

await ensureOllama();
console.log("💬 답변");
const t1 = Date.now();
const answer = await chatStream(messages, write);
const tAnswer = Date.now() - t1;

console.log("\n📚 근거 (LLM에게 넘긴 자료 · ✓ = 답변에 ID가 표시된 자료)");
let checked = 0;
for (const h of hits) {
  const mark = answer.includes(h.id) ? "✓" : " ";
  if (mark === "✓") checked++;
  console.log(`  ${mark} ${h.id}  ${h.section}  ${h.url}`);
}
if (weak) console.log("  ⚠ 관련 자료가 약해 이 자료들을 답변의 근거로 보기 어렵습니다");
else if (checked === 0) console.log("  (답변에 ID 표시가 없습니다. 위 자료와 답변을 비교해 확인하세요)");
console.log(`⏱ 검색 ${sec(tSearch)}초 · 답변 ${sec(tAnswer)}초`);
