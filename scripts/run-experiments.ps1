# 가이드 STEP 3~8 실행 명령을 순서대로 돌리고, 출력을 실험\결과 폴더에 그대로 저장한다 (README 관찰표·비교표의 원본 기록)
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$ResultDir = Join-Path $Root "실험\결과"
New-Item -ItemType Directory -Force $ResultDir | Out-Null
$Utf8 = New-Object System.Text.UTF8Encoding $false

function Run($name, [string[]]$argv) {
  Write-Host "`n▶ $name" -ForegroundColor Cyan
  $t = Get-Date
  $out = & node @argv 2>&1 | ForEach-Object { "$_" }
  $text = ($out -join "`r`n")
  Write-Host $text
  $header = "> node " + (($argv | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join ' ')
  [System.IO.File]::WriteAllText((Join-Path $ResultDir "$name.txt"), "$header`r`n(실행: $($t.ToString('yyyy-MM-dd HH:mm:ss')))`r`n`r`n$text`r`n", $Utf8)
}

Write-Host "▶ 준비: node $(node -v)" -ForegroundColor Cyan
if (-not (Test-Path "node_modules\@huggingface\transformers")) {
  Write-Host "  라이브러리 설치 (npm install)…"
  npm install --no-audit --no-fund
}

# STEP 3: 벡터 저장소 만들기
Run "STEP3_build-index" @("src/build-index.mjs")

# STEP 4~5: [1단계] 검색 관찰 (질문 9개)
Run "STEP5_검색관찰" @("src/search.mjs",
  "체험 수업 비용이 얼마예요?",
  "처음 한 번 와서 운동해 보려면 얼마 내요?",
  "주차 돼요?",
  "토요일에도 운동할 수 있어요?",
  "운동 처음인데 따라갈 수 있어요?",
  "1:1 PT는 얼마예요?",
  "샤워실 있어요?",
  "내일 날씨 어때?",
  "김치찌개 레시피 알려줘")

# STEP 6: 프롬프트 확인 (LLM 호출 없음)
Run "STEP6_프롬프트_정상" @("src/ask.mjs", "체험 수업 비용이 얼마예요?", "--show-prompt")
Run "STEP6_프롬프트_약한근거" @("src/ask.mjs", "내일 날씨 어때?", "--show-prompt")

# STEP 7: Ollama 답변 (스트리밍)
Run "STEP7_체험비용" @("src/ask.mjs", "체험 수업 비용이 얼마예요?")

# STEP 8: RAG 없이 vs RAG
$cases = [ordered]@{
  "A" = "처음 한 번 와서 운동해 보려면 얼마 내요?"
  "B" = "토요일에도 운동할 수 있어요?"
  "C" = "샤워실 있어요?"
  "D" = "허리 디스크가 있는데 크로스핏 해도 돼요?"
}
foreach ($key in $cases.Keys) {
  Run "STEP8_${key}_RAG없음" @("src/ask.mjs", $cases[$key], "--no-rag")
  Run "STEP8_${key}_RAG" @("src/ask.mjs", $cases[$key])
}
Run "STEP8_E_날씨_RAG" @("src/ask.mjs", "내일 날씨 어때?")

Write-Host "`nRESULT=DONE 모든 실험이 끝났습니다. 결과: 실험\결과 폴더" -ForegroundColor Green
