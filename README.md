# 브런치 글 수정

사용자 글을 교정/편집하고, 글 기반 이미지 프롬프트/생성을 지원하는 HTML5 + JavaScript 웹서비스입니다.

## 핵심 변경
- 클라이언트에서 API 키를 직접 입력하지 않습니다.
- 서버가 `OPENAI_API_KEY` 환경변수를 읽어 OpenAI API를 호출합니다.
- 따라서 GitHub Pages(정적 호스팅) 단독으로는 AI 기능이 동작하지 않습니다.

## 주요 기능
1. 오타/띄어쓰기/문장부호 로컬 교정
2. 서버 프록시 기반 AI 고급 교정(원문 최소 수정 원칙)
3. 변경분 `**Bold**` 표시
4. 변경 이력 + 수정 이유 자동 기록
5. 4인 전문가 토론 후 합의된 편집자 평가 의견 생성
: 출판사 편집자, 베스트셀러 작가, 에세이 작가, 출판사 대표 관점 반영
6. 사용자가 제공한 출간본 PDF 문체를 내부 기준으로 우선 적용
7. 원문 기반 이미지 프롬프트 자동 제안(ChatGPT/Canva/Gemini)
8. OpenAI 이미지 API 기반 이미지 생성/미리보기
9. 교정결과 원문 버튼 복사
10. 일일 명언(24시간 주기 자동 변경)

## 기술 구성
1. HTML5
2. Vanilla JavaScript (ES Modules)
3. Node.js + Express (OpenAI 프록시 API)

## 로컬 실행
1. Node.js 18+ 설치
2. 프로젝트 폴더에서 실행:
```bash
npm install
OPENAI_API_KEY=여기에_키 npm start
```
3. 브라우저에서 `http://localhost:3000` 접속
4. 프론트/백엔드 분리 시 `API 서버 URL` 입력란에 서버 주소 입력

## GitHub 시크릿 관련 중요 사항
- GitHub 저장소 시크릿은 **GitHub Actions 실행 시점**에만 사용 가능합니다.
- 브라우저에서 열리는 GitHub Pages 앱은 저장소 시크릿을 런타임에 읽을 수 없습니다.
- AI 기능을 쓰려면 서버가 있는 배포(예: Render/Railway/Fly.io/Vercel Serverless)가 필요합니다.

## 권장 배포 방식
1. 이 저장소를 Render/Railway 같은 Node 런타임 서비스에 연결
2. 환경변수 `OPENAI_API_KEY` 등록
3. (선택) `CORS_ORIGIN`에 프론트 도메인 설정
4. Start Command: `npm start`
5. 배포 URL로 접속

## 제한 사항
1. 서버 환경변수 `OPENAI_API_KEY`가 없으면 AI 교정/이미지 생성은 실패하고 로컬 교정만 동작합니다.
2. Canva/Gemini는 API 직접 연동이 아니라 프롬프트 제안 + 서비스 이동 방식입니다.

## 장애 대응
1. AI 교정/이미지가 실패하면 먼저 `https://서버도메인/api/health` 호출 결과를 확인합니다.
2. `API 서버 URL`이 비어 있으면 현재 도메인(`/api/...`)으로 호출합니다.
3. 프론트가 GitHub Pages이고 API가 다른 도메인이면 `CORS_ORIGIN` 설정이 필요합니다.
