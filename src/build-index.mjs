// 청크 원본(data/chunks.json) → 벡터 저장소(data/vectors.json)
// 사용법: node src/build-index.mjs
import { readFile, writeFile } from "node:fs/promises";
import { embedDocument, MODEL, DTYPE, DIM } from "./embedder.mjs";

const MIN_LENGTH = 110; // CLAUDE.md 데이터 계약: text 최소 110자
const FIELDS = ["id", "text", "url", "section"];

const chunks = JSON.parse(await readFile(new URL("../data/chunks.json", import.meta.url), "utf8"));

// 1) 먼저 검사: 필드 누락·중복 id는 중단, 짧은 text는 경고
const seen = new Set();
for (const c of chunks) {
  const missing = FIELDS.filter((f) => typeof c[f] !== "string" || c[f].trim() === "");
  if (missing.length) {
    console.error(`중단: ${c.id ?? "(id 없음)"} 필드 누락 — ${missing.join(", ")}`);
    process.exit(1);
  }
  if (seen.has(c.id)) {
    console.error(`중단: id 중복 — ${c.id}`);
    process.exit(1);
  }
  seen.add(c.id);
  if (c.text.length < MIN_LENGTH) console.warn(`경고: ${c.id} text가 ${c.text.length}자 (${MIN_LENGTH}자 미만)`);
}

// 2) 청크마다 임베딩
const out = [];
for (const c of chunks) {
  const vector = await embedDocument(c);
  out.push({ id: c.id, text: c.text, url: c.url, section: c.section, vector });
  console.log(`✓ ${c.id} (${c.section})`);
}

// 3) 768차원 검사 후 저장
const bad = out.filter((c) => c.vector.length !== DIM);
if (bad.length) {
  console.error(`중단: ${DIM}차원이 아닌 벡터 — ${bad.map((c) => c.id).join(", ")}`);
  process.exit(1);
}
const store = { model: MODEL, dtype: DTYPE, dim: DIM, createdAt: new Date().toISOString(), chunks: out };
await writeFile(new URL("../data/vectors.json", import.meta.url), JSON.stringify(store) + "\n", "utf8");

// 학습용: 첫 벡터의 앞 5개 숫자와 노름(길이, 1.0이어야 함)
const v = out[0].vector;
const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
console.log(`첫 벡터 앞 5개: [${v.slice(0, 5).map((x) => x.toFixed(4)).join(", ")}]  노름: ${norm.toFixed(4)}`);
console.log(`저장: data/vectors.json — ${out.length}청크 × ${DIM}차원`);
