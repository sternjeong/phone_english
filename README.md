# Good Morning

헤이링(HeyRing)을 레퍼런스로 삼은 AI 전화영어 웹앱. AI가 먼저 전화를 걸어와 받으면 바로 영어 회화 연습이 시작되는 경험을 웹에서 재현합니다.

기획 배경과 화면별 UI/UX 분석, 결정 사항은 [docs/PROJECT_NOTES.md](docs/PROJECT_NOTES.md)를 참고하세요 — 코드를 수정할 때 항상 이 문서를 우선 참고합니다.

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # GEMINI_API_KEY, AUTH_SECRET, AUTH_PASSCODE, POSTGRES_URL 입력
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Gemini API (대화 생성/교정/리포트 요약) — 모델×키 폴백 (`src/lib/gemini.ts`)
- 브라우저 Web Speech API (STT/TTS)
- NextAuth.js 단일 사용자 비밀번호 로그인 (`AUTH_PASSCODE`)
- Postgres (Vercel Postgres 등) — 페르소나·통화 기록·리포트·보관함·Voca 저장, 테이블은 첫 요청 시 자동 생성

## 주요 라우트

| 경로 | 설명 |
|---|---|
| `/sign-in` | 비밀번호 로그인 |
| `/` | 홈 — 전화 걸기 |
| `/onboarding` | AI 페르소나 설정 |
| `/call` | 수신 → 통화 → 종료 요약 |
| `/reports`, `/reports/[id]` | 통화 리포트 목록/상세, 보관함 |
| `/reports/[id]/practice/[expressionId]` | 표현 섀도잉 연습 |
| `/voca` | 통화 중 교정된 문장으로 만든 내 단어장 |
| `/stats` | 발화 기록 통계 |
| `/schedule` | 일정 (표시용, 실제 트리거는 온디맨드) |
