# Warm Editor Web

사용자 글을 교정/편집하는 HTML5 + JavaScript 웹서비스입니다.

## c의 최종 결정 (앱 vs 웹)
- 결정: **웹서비스**
- 이유:
1. 설치 없이 브라우저에서 바로 사용 가능
2. GitHub Pages 배포가 쉬움
3. 파일(PDF/텍스트) 기반 작업 흐름과 잘 맞음

## 역할 분담 (a/b/c)
1. `c`(시니어 엔지니어): 아키텍처 결정, 안정성 기준 설정
2. `a`(프로그래밍 전문가): 구현 담당 (UI/분석/교정 로직)
3. `b`(편집자): 결과 품질 점검 (흐름/온도/독자 관점)

## 주요 기능
1. PDF 또는 텍스트 기반 작가 문체 분석
2. 오타/띄어쓰기/문장부호 로컬 교정
3. 선택형 AI 고급 교정(OpenAI API Key 입력 시)
4. 변경분 `**Bold**` 표시
5. 변경 이력 + 수정 이유 자동 기록
6. 편집자 평가 의견 자동 생성

## 사용 프레임워크/라이브러리
1. HTML5
2. Vanilla JavaScript (ES Modules)
3. [PDF.js](https://mozilla.github.io/pdf.js/) (브라우저에서 PDF 텍스트 추출)

## 실행 방법
1. 이 폴더를 열고 `index.html`을 브라우저에서 실행
2. 스타일 분석용 PDF 또는 텍스트 입력
3. 교정할 원문 입력
4. 필요 시 OpenAI API Key 입력 후 `교정 실행`

## GitHub Pages 배포
1. GitHub에 `warm-editor-web` 폴더를 새 저장소로 업로드
2. 저장소 `Settings > Pages`로 이동
3. Source를 `Deploy from a branch`로 선택
4. `main` 브랜치 `/ (root)` 선택 후 저장
5. 생성된 URL 접속

## 제한 사항
1. AI 모드는 API 키가 필요합니다.
2. PDF가 스캔 이미지 중심인 경우 텍스트 추출이 제한될 수 있습니다.
3. 로컬 규칙 교정은 보조 기능이며, 완전한 문학 편집은 AI 모드가 더 정확합니다.
