# Claude 3.7 Sonnet 스타터 팩 (TypeScript)

이 프로젝트는 Claude 3.7 Sonnet을 사용하여 애플리케이션을 빠르게 구축할 수 있도록 도와주는 TypeScript 버전의 스타터 팩입니다.

## 기능

- 간단한 프롬프트 예제
- 구조화된 출력 예제
- 실제 날씨 API 통합을 통한 도구 사용
- 확장된 사고 기능
- 스트리밍 API 지원
- 확장 출력(128k 토큰) 지원
- 토큰 사용량 및 비용 계산

## 필수 조건

- Node.js 16+
- TypeScript 5.0+
- Anthropic API 키

## 설정

1. 이 저장소를 클론합니다:

```bash
git clone https://your-repo-url/claude-3-7-sonnet-starter-pack-ts.git
cd claude-3-7-sonnet-starter-pack-ts
```

2. 의존성을 설치합니다:

```bash
npm install
```

3. Anthropic API 키로 `.env` 파일을 생성합니다:

```bash
cp .env.example .env
# 그런 다음 .env 파일을 편집하여 API 키를 추가하세요
```

## 예제

### 간단한 프롬프트

Claude 3.7 Sonnet에 프롬프트를 보내고 응답을 받는 기본 예제입니다.

```bash
npm run start:simple-prompt -- --prompt "5 bullet points: no markdown: Why are breakthroughs in AI so important?"
```

선택적 매개변수:
- `--max-tokens <number>` (기본값: 1000)

### 구조화된 출력

고객 피드백 분석을 위해 Claude 3.7 Sonnet에서 구조화된 JSON 출력을 얻습니다.

```bash
npm run start:simple-structured-output -- --prompt "Analyze this customer feedback: Great buy, I'm happy with my purchase."
```

선택적 매개변수:
- `--max-tokens <number>` (기본값: 1000)

### 도구 사용

날씨 API와 같은 도구와 함께 Claude 3.7 Sonnet을 사용하는 방법을 보여주는 예제입니다.

```bash
npm run start:simple-tool-use -- --prompt "What's the weather in Paris?"
```

선택적 매개변수:
- `--max-tokens <number>` (기본값: 1000)

### 확장된 사고

복잡한 작업에 대한 더 나은 추론을 위해 Claude의 확장된 사고 기능을 사용합니다.

```bash
npm run start:prompt-with-extended-thinking -- --prompt "Explain quantum computing to me" --max-tokens 2048 --thinking-budget-tokens 1024
```

선택적 매개변수:
- `--max-tokens <number>` (기본값: 2000)
- `--thinking-budget-tokens <number>` (기본값: 8000)

### 스트리밍과 함께 확장된 사고

Claude의 확장된 사고 응답을 생성되는 대로 실시간으로 스트리밍합니다.

```bash
npm run start:prompt-with-extended-thinking-and-streaming -- --prompt "What is the expected number of coin flips needed to get 3 heads in a row?" --max-tokens 3000 --thinking-budget-tokens 2000
```

선택적 매개변수:
- `--max-tokens <number>` (기본값: 2000)
- `--thinking-budget-tokens <number>` (기본값: 4000)

### 도구 사용과 함께 확장된 사고

확장된 사고와 도구 사용을 결합하여 Claude가 날씨 관련 작업을 추론할 수 있게 합니다.

```bash
npm run start:prompt-with-extended-thinking-tool-use -- --prompt "What's the weather in New York and what should I wear?" --max-tokens 2000 --thinking-budget-tokens 1024
```

선택적 매개변수:
- `--max-tokens <number>` (기본값: 2000)
- `--thinking-budget-tokens <number>` (기본값: 8000)

### 확장된 사고와 스트리밍을 통한 확장 출력

생성 과정 전반에 걸쳐 포괄적인 메트릭 추적과 함께 매우 길고 상세한 응답을 생성합니다.

```bash
npm run start:prompt-with-extended-output -- --prompt "Generate a 10,000 word comprehensive analysis of renewable energy technologies" --max-tokens 32000 --thinking-budget-tokens 8000 --enable-extended-output
```

선택적 매개변수:
- `--max-tokens <number>` (기본값: 32000)
- `--thinking-budget-tokens <number>` (기본값: 16000)
- `--enable-extended-output` (128k 토큰 출력 지원을 활성화하는 플래그)

## 비용 정보

이 예제들은 현재 Claude 3.7 Sonnet 가격을 기준으로 토큰 사용량 계산 및 예상 비용을 포함합니다:
- 입력 토큰: 백만 토큰당 $3.00
- 출력 토큰: 백만 토큰당 $15.00
- 사고 토큰: 백만 토큰당 $15.00 (출력으로 청구됨)

## TypeScript 작업

이 프로젝트는 다음을 사용합니다:
- 정적 타입 검사를 위한 TypeScript
- TypeScript 파일을 직접 실행하기 위한 `ts-node`
- 명령줄 인수 파싱을 위한 Commander.js
- 환경 변수 관리를 위한 dotenv
- 터미널 포맷팅을 위한 chalk 및 cli-table3

## Python에서 마이그레이션됨

이 스타터 팩은 원래 [Claude 3.7 Sonnet Python 스타터 팩](https://github.com/anthropics/claude-3-7-sonnet-examples)의 TypeScript 버전입니다. 대부분의 예제가 완전히 마이그레이션되었으며, 에이전트 지원 및 MCP 서버 통합과 같은 일부 고급 예제는 특수 요구 사항으로 인해 추가 적응이 필요합니다.

## 라이선스

[MIT 라이선스](LICENSE)