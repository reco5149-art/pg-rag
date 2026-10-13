// 시스템 메시지와 프롬프트 조립 — CLAUDE.md "생성 계약"
import { WEAK_THRESHOLD } from "./search.mjs";

export const SYSTEM_MESSAGE =
  "당신은 피지컬그라운드 센터 안내 도우미입니다. 주어진 자료에 근거한 내용만 답하고, 자료에 없는 정보는 " +
  "'제가 가진 자료에는 없습니다'라고 답한 뒤 센터에 카카오톡이나 전화로 확인하라고 안내합니다. " +
  "통증·부상·질환 같은 몸 상태는 괜찮다거나 안 된다고 판단하지 않고 코치에게 직접 상담하라고 안내합니다. " +
  "할인·환불·예약 확정은 약속하지 않습니다. 근거 조각의 ID만 [PG-005]처럼 대괄호로 감싸 해당 문장 끝에 표시합니다.";

function nowKST() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

/** 계약의 ①~⑦ 순서로 사용자 메시지(프롬프트)를 만든다 */
export function buildPrompt(question, hits) {
  const weak = hits.length === 0 || hits[0].score < WEAK_THRESHOLD;
  const lines = [
    // ① 자료 소개
    "다음 자료는 피지컬그라운드 센터가 공개한 자료와 센터 운영자가 확인한 정보에서 뽑은 조각입니다.",
    // ② 근거 원칙
    weak
      ? "주의: 검색된 조각의 유사도가 낮습니다. 질문과 완전히 맞는 근거가 아닐 수 있으니, 근거에 있는 내용만 짧게 답하고 자료에 없는 부분은 없다고 말합니다."
      : "자료에 근거한 내용만 답하고, 자료에 없으면 없다고 말합니다.",
    // ③ 출처 규칙
    "근거가 된 조각의 ID만 [PG-005]처럼 대괄호로 감싸 해당 문장 끝에 표시합니다.",
    // ④ 현재 시각
    `현재 시각은 ${nowKST()}(KST)입니다. '지금', '오늘', '다음 주' 같은 상대 표현은 이 시각을 기준으로 해석합니다.`,
    // ⑤ 자료 (대괄호 안에는 ID만)
    "",
    "[자료]",
    hits.map((h) => `[${h.id}] (${h.section}) ${h.text}`).join("\n\n"),
    // ⑥ 질문
    "",
    "[질문]",
    question,
    // ⑦ 출처 규칙 한 번 더
    "",
    "(답할 때 근거로 쓴 자료의 ID를 [PG-005]처럼 문장 끝에 붙입니다.)",
  ];
  return lines.join("\n");
}
