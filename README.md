# 브런치 글 수정

사용자 글을 교정/편집하고, 글 기반 이미지 프롬프트/생성을 지원하는 HTML5 + JavaScript 웹서비스입니다.

## 핵심 변경
- 클라이언트에서 API 키를 직접 입력하지 않습니다.
- 서버가 `OPENAI_API_KEY` 환경변수를 읽어 OpenAI API를 호출합니다.
- 따라서 GitHub Pages(정적 호스팅) 단독으로는 AI 기능이 동작하지 않습니다.

## 주요 기능
1. 오타/띄어쓰기/문장부호 로컬 교정
2. 서버 프록시 기반 AI 고급 교정
3. 변경분 `**Bold**` 표시
4. 변경 이력 + 수정 이유 자동 기록
5. 편집자 평가 의견 자동 생성
6. 원문 기반 이미지 프롬프트 자동 제안(ChatGPT/Canva/Gemini)
7. OpenAI 이미지 API 기반 이미지 생성/미리보기

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

## GitHub 시크릿 관련 중요 사항
- GitHub 저장소 시크릿은 **GitHub Actions 실행 시점**에만 사용 가능합니다.
- 브라우저에서 열리는 GitHub Pages 앱은 저장소 시크릿을 런타임에 읽을 수 없습니다.
- AI 기능을 쓰려면 서버가 있는 배포(예: Render/Railway/Fly.io/Vercel Serverless)가 필요합니다.

## 권장 배포 방식
1. 이 저장소를 Render/Railway 같은 Node 런타임 서비스에 연결
2. 환경변수 `OPENAI_API_KEY` 등록
3. Start Command: `npm start`
4. 배포 URL로 접속

## 제한 사항
1. 서버 환경변수 `OPENAI_API_KEY`가 없으면 AI 교정/이미지 생성은 실패하고 로컬 교정만 동작합니다.
2. Canva/Gemini는 API 직접 연동이 아니라 프롬프트 제안 + 서비스 이동 방식입니다.
