# phone_english

헤이링(HeyRing)을 레퍼런스로 삼은 AI 전화영어 웹앱. AI가 먼저 전화를 걸어와 받으면 바로 영어 회화 연습이 시작되는 경험을 웹에서 재현합니다.

기획 배경과 화면별 UI/UX 분석, 결정 사항은 [docs/PROJECT_NOTES.md](docs/PROJECT_NOTES.md)를 참고하세요 — 코드를 수정할 때 항상 이 문서를 우선 참고합니다.

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # GEMINI_API_KEY 입력 (https://aistudio.google.com/apikey)
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Gemini API (대화 생성/교정/리포트 요약)
- 브라우저 Web Speech API (STT/TTS)
- 로그인·결제 없음 — localStorage 기반 로컬 저장 (MVP 범위)

## 주요 라우트

| 경로 | 설명 |
|---|---|
| `/` | 홈 — 전화 걸기 |
| `/onboarding` | AI 페르소나 설정 |
| `/call` | 수신 → 통화 → 종료 요약 |
| `/reports`, `/reports/[id]` | 통화 리포트 목록/상세, 보관함 |
| `/reports/[id]/practice/[expressionId]` | 표현 섀도잉 연습 |
| `/stats` | 발화 기록 통계 |
| `/schedule` | 일정 (표시용, 실제 트리거는 온디맨드) |
