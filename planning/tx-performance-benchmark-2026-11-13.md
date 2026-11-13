# TX 거주지 분석 대시보드 — 5차 성능 기준선 및 보수적 릴리즈 결정

2026-11-13 · 대상: `kevinim/kevinim.github.io`의 DFW 거주지·학교·ZIP 지도 (**CareerQ 잡 서치 대시보드 아님**).

## 기준선

- 이전 운영 `main`: `52776f3c87933d5e8c4374aaadfd460f246c0a71`
- 별도 Playwright/Chromium 테스트 환경: GitHub Actions Ubuntu, 390×844 및 1366×900
- 각 환경 최초 방문(cold) 및 동일 브라우저 재방문(warm) 1회
- 공정한 내부 코드 비교를 위해 로컬 HTTP 서버 두 개 사용. 타사 API와 타일은 차단하되 고정된 Leaflet 1.9.4 CDN만 허용.
- **학교 500개 이상 TEA 등급, 학교 목록 150개 이상, ZIP 경계 150개 이상 및 Leaflet 지도 크기 확보**를 지도 준비 완료(core map ready)로 정의. 실제 학군 주소별 배정 인증은 별개이며 측정/인증하지 않음.
- [실험 Actions 실행 #43433721513](https://github.com/kevinim/kevinim.github.io/actions/runs/43433721513): 단 한 번의 브라우저 샘플.

## 61개 JS 일괄 `defer` 변경의 실험 결과 — **배포 취소**

| 환경 | 기준선 core map ready | 49개 추가 defer 실험 | 참고 변화 |
|---|---:|---:|---:|
| 모바일 cold | 974.2ms | 699.4ms | -28.2% |
| 모바일 warm | 748.7ms | 701.8ms | -6.3% |
| 데스크톱 cold | 934.8ms | 943.7ms | +1.0% |
| 데스크톱 warm | 840.6ms | 819.3ms | -2.5% |

- 동일한 98개 첫-party 리소스 요청, 약 4.96MiB 측정 전송량; 실험 단계에서는 다운로드 용량 자체가 감소하지 않음.
- 모바일 FCP는 cold에서 160→176ms, 데스크톱 cold에서는 132→256ms로 **증가**. 주관적 체감이 개선된다고 단정할 수 없음.
- 신규 `defer` 속성 49개가 기존 소스·보안·출처·CSP 검사의 HTML exact-match guard에 걸려 다수의 required checks가 실패. 이는 보호 장치를 일괄 완화해서 해결할 일이 아님.
- 따라서 HTML 및 변경한 감사 테스트를 **운영 기준선과 바이트 단위로 동일하게 원복**했음. 실제 코드 변경은 독립 성능 벤치마크 및 예산 검사에 한정. 실험 측정치를 배포된 개선 수치로 제시하지 않는다.

## 새 회귀 측정 인프라

`scripts/benchmark-tx-map-browser.cjs`와 `.github/workflows/tx-browser-performance.yml`

- 390px/1366px, cold/warm, 기준선 및 PR 커밋을 동일 CI 브라우저/로컬 HTTP 조건에서 나란히 실행
- Navigation Timing의 DCL, First Contentful Paint, 학교/ZIP 지도 준비 완료, First-Party 요청 수/바이트, 최소 학교 검증 건수, 12회 동기 마커 렌더 CPU 시간
- 비교 JSON은 민감한 주소나 사용자 정보를 포함하지 않고 GitHub Actions artifact로 보존
- 변형 브라우저 환경에 대한 과도한 정확도 주장을 방지: 기준선 대비 지도 준비 시간 2배 또는 5초 한도, 추가 내부 요청 5개 이하, 전송량 20%+256KiB 이내의 **거친 회귀 방지 예산**만 강제
- 배포된 Pages CDN의 HTTP 캐시 동작과 실제 사용자 네트워크/디바이스 성능은 별도 측정 필요. 단일 CI 실험은 통계적 결론이 아님.

## 다음 최적화의 판단 기준

1. 우선 61개 스크립트의 의존성 및 기존 HTML 출처·보안 감사 패턴을 명세화한다. 전체 `defer` 변경이나 번들링을 바로 허용하지 않는다.
2. 지도 초기 사용에 불필요한 모듈만 개별 분리하여 UAT에서 검증한다. CSP, 강제 학교 배정 미인증, 주소 입력 개인 정보, Redfin 독립 UAT는 유지.
3. 프로덕션 체감 성능을 측정할 때는 Pages의 첫 방문·재방문을 다회 측정하고 크롬 성능 레코딩, LCP, INP 및 레이아웃 안정성을 함께 검토한다.
