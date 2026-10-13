// [1단계] 질문 → 비슷한 자료 보여주기
// 사용법: node src/search.mjs "질문1" ["질문2" …] [--k 3]
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { embedQuery, MODEL, DTYPE } from "./embedder.mjs";

// 약한 근거 기준 — 이 파일에서만 정의하고 다른 파일은 import한다 (CLAUDE.md 검색 계약)
export const WEAK_THRESHOLD = 0.55;

let storePromise = null;
async function loadStore() {
  if (!storePromise) {
    storePromise = readFile(new URL("../data/vectors.json", import.meta.url), "utf8").then((s) => {
      const store = JSON.parse(s);
      if (store.model !== MODEL || store.dtype !== DTYPE) {
        console.error(
          `벡터 저장소(${store.model}, ${store.dtype})가 현재 임베딩 설정(${MODEL}, ${DTYPE})과 다릅니다. ` +
            "node src/build-index.mjs 를 다시 실행하세요.",
        );
        process.exit(1);
      }
      return store;
    });
  }
  return storePromise;
}

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

/** 질문과 가장 비슷한 청크 top-k (점수 내림차순). 벡터가 정규화되어 있어 내적 = 코사인 유사도 */
export async function search(question, k = 3) {
  const store = await loadStore();
  const q = await embedQuery(question);
  return store.chunks
    .map((c) => ({ id: c.id, text: c.text, url: c.url, section: c.section, score: dot(q, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function bar(score) {
  const n = Math.max(0, Math.min(20, Math.round(score * 20)));
  return "█".repeat(n) + "░".repeat(20 - n);
}

async function main() {
  const args = process.argv.slice(2);
  let k = 3;
  const questions = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--k") k = Number(args[++i]) || 3;
    else questions.push(args[i]);
  }
  if (questions.length === 0) {
    console.log('사용법: node src/search.mjs "질문1" ["질문2" …] [--k 3]');
    process.exit(1);
  }
  for (const question of questions) {
    const hits = await search(question, k);
    const weak = hits[0].score < WEAK_THRESHOLD ? `  ⚠ 관련 자료가 약함(<${WEAK_THRESHOLD})` : "";
    console.log(`\nQ: ${question}${weak}`);
    hits.forEach((h, i) => {
      console.log(`  ${i + 1}. ${h.id}  ${h.score.toFixed(3)}  ${bar(h.score)}  [${h.section}]`);
      console.log(`     ${h.text.slice(0, 60)}…`);
      console.log(`     출처: ${h.url}`);
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
