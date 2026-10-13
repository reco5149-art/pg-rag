// 임베딩 공통 모듈 — CLAUDE.md "임베딩 계약"을 이 파일 한 곳에서만 정의한다.
import { pipeline } from "@huggingface/transformers";

export const MODEL = "onnx-community/embeddinggemma-300m-ONNX";
export const DTYPE = "q8";
export const DIM = 768;

let extractorPromise = null;

// 파이프라인은 한 번만 만들어 재사용한다.
function getExtractor() {
  if (!extractorPromise) {
    console.log("임베딩 모델 불러오는 중…(첫 실행은 다운로드)");
    extractorPromise = pipeline("feature-extraction", MODEL, { dtype: DTYPE });
  }
  return extractorPromise;
}

async function embed(input) {
  const extractor = await getExtractor();
  const output = await extractor(input, { pooling: "mean", normalize: true });
  const vector = Array.from(output.data);
  if (vector.length !== DIM) throw new Error(`벡터가 ${DIM}차원이 아닙니다 (${vector.length})`);
  return vector;
}

// 문서(청크): EmbeddingGemma 공식 문서 형식
export function embedDocument(chunk) {
  return embed(`title: ${chunk.section} | text: ${chunk.text}`);
}

// 질문: EmbeddingGemma 공식 질문 형식
export function embedQuery(question) {
  return embed(`task: search result | query: ${question}`);
}
