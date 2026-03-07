# Daily Planner - Notion Connect

할일 계획표 + Notion 연동 앱

## 주요 기능

- **할일 관리**: 할일 추가/삭제, 태그형 UI
- **시간 배정**: 할일을 시간대에 배정하여 계획표 생성
- **계획표**: 시간순 정렬, 완료 체크, 별점 평가, 드래그 시간 교환
- **자동 배정**: 빈 시간대에 할일 자동 배치
- **삭제/복원**: 삭제된 항목 복원 가능
- **시간표 (원형 차트)**: 하루 계획 시각화
- **주간 통계**: 주간 완료율, 평균 별점
- **다크 모드**: 라이트/다크 테마 전환
- **알림**: 계획 시작 시간 푸시 알림
- **Notion 연동**: Notion DB와 양방향 동기화

## Notion 연동 기능

| 버튼 | 방향 | 동작 |
|------|------|------|
| **내보내기** | App -> Notion | 기존 Notion 데이터 유지, 추가 (중복 허용) |
| **새로출력** | App -> Notion | 해당 날짜+ID의 기존 Notion 데이터 삭제 후 교체 |
| **가져오기** | Notion -> App | 기존 로컬 데이터에 추가 (중복 허용) |
| **새로입력** | Notion -> App | 로컬 데이터를 Notion 데이터로 교체 |

- 데이터는 `user.name` 기반 `ID` 속성으로 사용자별 분리
- 같은 Notion DB를 여러 사용자가 공유 가능

## 기술 스택

- **Frontend**: React 19 + Vite, Axios, date-fns
- **Backend**: Express.js, JWT 인증, bcryptjs
- **Storage**: JSON 파일 (이메일 prefix 기반)
- **Notion**: @notionhq/client v2.2.15
- **보안**: Helmet, CORS, Rate Limiting, 입력 검증
- **배포**: Render (https://daily-planner-notion-connect.onrender.com)

## 프로젝트 구조

```
daily-planner-notion-connect/
├── client/                  # React 프론트엔드
│   ├── src/
│   │   ├── App.jsx         # 메인 앱
│   │   ├── App.css         # 전체 스타일
│   │   ├── components/     # UI 컴포넌트
│   │   │   ├── DateSelector.jsx
│   │   │   ├── TodoInput.jsx
│   │   │   ├── TimeAssigner.jsx
│   │   │   ├── ScheduleTable.jsx
│   │   │   ├── ScheduleClock.jsx
│   │   │   ├── WeeklyStats.jsx
│   │   │   ├── DeletedItems.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── NotionSync.jsx   # Notion 연동 UI
│   │   └── hooks/
│   │       ├── useAuth.js
│   │       ├── usePlanner.js
│   │       └── useNotification.js
│   └── vite.config.js
├── server/                  # Express 백엔드
│   ├── src/
│   │   ├── index.js        # 서버 진입점
│   │   ├── middleware/
│   │   │   └── auth.js     # JWT 인증 미들웨어
│   │   ├── routes/
│   │   │   ├── auth.js     # 인증 (로그인/가입)
│   │   │   ├── planner.js  # 할일/계획 CRUD
│   │   │   ├── notion.js   # Notion 연동 API
│   │   │   └── push.js     # 푸시 알림
│   │   └── scheduler.js
│   └── data/               # JSON 데이터 저장소
└── package.json
```

## 설치 및 실행

```bash
# 의존성 설치
npm run install-all

# 개발 서버 실행
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:5001
```

## 환경 변수 (server/.env)

```env
# 필수
JWT_SECRET=your_jwt_secret_key

# Notion 연동 (선택 - 없으면 클라이언트에서 수동 입력)
NOTION_API_KEY=ntn_xxxxx
NOTION_DB_ID=your_database_id
```

## 보안

- JWT 토큰 인증 (30일 만료)
- bcrypt 비밀번호 해싱 (salt 12)
- 로그인 시도 제한 (5회/15분)
- API Rate Limiting (100req/min)
- Helmet 보안 헤더
- 파일명 경로 탈출 방지 (emailPrefix 살균)
- 날짜 형식 검증 (YYYY-MM-DD)
- 입력 길이 제한 (이메일 100자, 할일 100자)

## 배포

GitHub repo: https://github.com/jeremio7/daily-planner-notion-connect
Render: https://daily-planner-notion-connect.onrender.com

Render 환경 변수:
- `NODE_ENV=production`
- `JWT_SECRET` (필수 - 설정 안하면 배포마다 세션 초기화)
- `NOTION_API_KEY` (선택)
- `NOTION_DB_ID` (선택)
