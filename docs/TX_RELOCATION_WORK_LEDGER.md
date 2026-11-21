# TX 이주 준비 — 통합 잔여 작업 장부 (Single Source of Work Status)

- **기준 시각:** 2026-11-21 10:47 EST (2026-11-21 15:47 UTC), 이후 상태는 새 조회로 갱신
- **저장소:** kevinim/kevinim.github.io / main
- **기준 main (장부 작성 시):** fc64c4dcfc240743942282b0f342212624ad3089
- **적용 범위:** TX 주거지/학교/지도/지역 분석 대시보드. CareerQ 등 다른 프로젝트 제외
- **이 문서는 한 번 작성하고 버리는 계획이 아니라, 다음 작업의 우선순위와 검증 상태를 갱신하는 지속 장부다.**
- 현황 숫자에는 확인 시점·출처·대상 범위를 반드시 적는다. 오래된 장부보다 현재 GitHub main, PR, CI, Pages 증거가 우선한다.

## 상태 정의 — 섞어서 쓰지 말 것

- **완료:** 코드·데이터와 검증된 근거가 main에 반영되고 해당 변경에 필요한 CI 및 Pages 배포·라이브 확인을 통과. 순수 조사/문서 과제는 명시된 검증·리뷰·병합을 완료하면 된다.
- **검증 완료 / 배포 확인 대기:** 검증은 성공했지만 Pages 배포 또는 배포 후 확인 미완료. 완료로 쓰지 않는다.
- **진행 중:** 구현/조사/PR이 열려 있으며 승인/테스트/배포의 어느 부분이 남았는지 기록한다.
- **자료 제약으로 보류:** 공식 공개 소스·권한·연도·원인 설명이 부재. 실패/누락/비공개를 수치 0이나 추정 GIS로 대체하지 않는다. 확인 가능한 출처를 남기고 다른 과제로 진행한다.
- **다음 단계:** 과제 착수 전 우선순위 및 검증 가능한 완료 조건이 지정됨.
- **Public Production NO-GO:** 가족용 UAT Pages가 동작하는 것과 외부 사용자 대상 공개 보안 승인 여부는 별개다.

## 작업 표 — 우선순위 높은 것부터

| ID | 우선순위 | 항목 | 현재 판정 (작성 시) | 완료 조건과 바로 다음 조치 | 추적 근거 |
| --- | --- | --- | --- | --- | --- |
| TX-P0-01 | P0 | 주소 → 해당 학년의 공식 초·중·고 배정 학교 | **참고 UI 배포 완료 / 공식 인증 미완료** | #368 Plano E/M/High/Senior 및 Lewisville E/M/H 원본연도 경고를 표시. #384 Prosper 새 등록 학생 입학 예외 안내. 학교별 실제 street+unit+year+grade 공식 자동 API가 허용·독립 검증되지 않아 배정 인증 0개. 공식 Finder 링크/사용자 수동 대조 제공, 임의 GIS로 인증 금지 | #368 #384, Issue #125 |
| TX-P0-02 | P0 | DFW 전체 GIS 출처·커버리지 장부 | **108-ISD 현황 감사 완료 / 실탑재 확대 미완료** | #364 108개 ISD 공식 안내·원본 대조·기본 GIS 6, 선택형 GIS 2, 미표시 100, 현행 연도 확인 소스 2, 공식 거주지 자동 인증 0. PR CI/Pages/라이브 지도 검사 완료; 학교별 정확한 GIS 탑재와 경계 품질은 P1 별도 | #364 main ff27840c, Pages 44928830393, live 44928909341 |
| TX-P1-01 | P1 | 이미 표시된 학군 지도 정확성/토폴로지 | **Allen 정밀도 수정 배포 / 전체 독립 검증 진행 중** | #379 토폴로지 감사, #382 Allen 원본 정밀도 경계 20개/5,668 꼭짓점 복원 및 6곳 공개 좌표 QA. Prosper 31개 학교 지오메트리 대조. 기타 학군의 공식 소스 연도·학교 ID·경계/주거지 예외 검증 유지, 과거 경계를 현행 공식 배정으로 승격 금지 | #379 #382, Issue #376 |
| TX-P1-02 | P1 | GIS 미탑재 학교/교육청 확대 | **4개 학군 공개 출처·UI 배포 / 실제 새 폴리곤 미완료** | #366 Mesquite/Wylie/Rockwall/Richardson 공식 GIS/PDF 링크와 출처/연도·권리 불확실성 표시. 신규 학교별 탑재 폴리곤 0. 다른 100개 미표시 ISD 순차 검증, 공식 연도/권리/학교코드 정합성 확인 후 지도 레이어만 공개. CFB/Denton 공개 조사 완료는 GIS 인증 완료 아님 | #366, Issue #125 |
| TX-P2-01 | P2 | TEA 2026 / PEIMS 2025–26 공개 원본 데이터 품질 | **완료 — 2026-11-11 공개 원본 스냅샷의 무결성 기준** | 2,282/2,282 학교 ID 대조; PEIMS 15,974/15,974 공개/마스킹/미표시 셀 상태 대조, 0건 기존 원본 불일치. 최종 데이터 QA가 전수 재계산하고 이전 독립 대조 Git blob 고정. **새 온라인 원본 재다운로드는 별도 새 버전 작업** | 병합·Pages 성공 PR #365, PR #369, docs/TEA_DFW_FINAL_DATA_QUALITY_20261112.md |
| TX-P2-02 | P2 (외부 공개 전 필수) | Production 공개 보안 | **진행 중 / 외부 공개 NO-GO** | 보안 작업 장부 SEC-01–SEC-11 확인, 실무 변경·테스트·운영 설정 증거 기록. 가족 UAT 유지. 외부 공개/로그인/소스 분리 등은 별도 릴리스 게이트를 통과해야 함. Security tracker PR #377은 미병합 초안 | PR #377, PUBLIC_RELEASE_SECURITY.md, docs/PUBLIC_SECURITY_REMAINDERS_2026-11-13.md |
| TX-P3-01 | P3 | 지역 분석: 의료·교통·재난·전력·범죄 근거 | **응급시설 직선거리·겨울 출처 연결 코드 병합 / 후속 데이터 미완료** | #367 44/44 CI 통과·main d12fabbb 병합; Pages 배포 성공 (Run 44931479215). 실제 ED 자동차 접근시간·운영 여부, 경로별 NTTA 요금, 주소별 정전기록, P43 범죄 공개 지도는 미완료. 직선거리를 ETA로 표시 금지 | #367, HANDOFF.md P40–P43 |

## 사용 가능한 근거와 외부 제약 (P2 완료와 혼동 금지)

- TEA 2026 학업·2025–26 PEIMS 공식 공개 데이터의 **원본 일치 여부** 검증 완료는 모든 수치가 공개됐다는 뜻이 아님. 인종 셀 8,277 공개, 5,141 비공개, 2,556 원본 미표시. 학교 전체 7개 인종 비율은 6개 학교만 재구성 가능; 나머지 2,276개는 일부 공개치 참고용. 전체 인종 집단 비율을 임의 보간하지 않음.
- 14개 특수학교의 개별 STAAR 원본 행 누락 사유는 공식 설명이 확인되지 않았음. 오류로 간주하여 0점 처리하거나 임의 설명을 붙이지 않음. 2026년 11월 11일 온라인 원본 대조, 11월 21일 저장 데이터 재검증은 서로 구별.
- TEA 학업 품질 QA는 **학교 지리위치, 학군 경계 및 실제 집 주소의 배정학교 인증과 독립**이다. 공개 지도의 이전 연도 참고 polygon은 연도 라벨로 제공 가능하며 현재 배정 확정과 혼동하지 않는다.
- 교육청 이메일 답신 대기는 **업무 완료 조건에서 제외**한다. 가능한 공개 GIS/PDF/검색기/공식 지도를 조사하고 공개 불가·미발견이면 해당 학교에 사유·출처·연도를 표시하고 다음 대상으로 진행.
- **300개 Actions queue 정리 업무는 의도적으로 무시한다.** 단, 현재 변경 PR·배포의 정확한 체크 및 실패는 검증해야 한다.
- 비용 정책: GitHub Free 및 공개적으로 합법적이고 무료인 데이터/기술 우선. 출처 권리·CORS·API 제한을 우회하여 허위로 '공식 연동' 처리하지 않는다.

## 2026-11-21 열린 관련 PR — 메인 반영 아님

- **#364** 108 ISD GIS 실탑재/연도별 현황 조사 (6 기본 GIS + 2 클릭형 + 100 미탑재). 이 PR에 108개 공립 ISD 정확한 ID/원본 링크/학교 수 연동 QA 추가. **병합·배포 완료 판정은 CI/Pages 실제 성공을 확인한 후만** 기록. 학교별 실측 GIS와 주소 배정은 별도.
- **#366** Mesquite/Wylie/Rockwall/Richardson 원천 탐색 + 안내 UI (학교별 polygon 탑재 아님).
- **#367** 병원·겨울 위험 요약 고도화 (실제 응급실 운전시간이나 주소별 정전 확률 아님).
- **#368** Plano/Lewisville 주소 기반 공식 GIS **참조** 학교 UI (배정 인증 아님).
- **#377** Production 보안 SEC 추적표 (문서 PR, 공개 승인과 별개; 소유자 수동 검토 조건 준수).
- **#379 (후속 확인: 2026-11-21 10:50 EST 병합됨)** Allen/Prosper GIS 토폴로지 읽기전용 QA는 main `58b61e2d`에 반영. 다만 실제 공식 원천 경계와의 독립 대조·오류 수정 및 프로덕션 통과는 **TX-P1-01의 후속 작업**. 이 기록은 최초 열린 PR 스냅샷을 보존하면서 이후 변경을 명시함.

위 목록은 작성 당시의 열린 PR 스냅샷이며, #379은 바로 아래 최신 확인 결과를 반영했다. 다음 대화에서는 PR 실제 open/merged/closed 및 main 상태를 다시 조회해 업데이트한다.

## 다음 대화부터 고정 운영 순서

1. 사용자가 **'남은 건 뭐죠?' / '다음 진행' / '상태 보고'** 를 요청하면, 먼저 GitHub main SHA, 열린 PR·Issues, 현재 CI·Pages, 이 장부와 HANDOFF.md, BOUNDARIES.md를 비교한다. 문서만 보고 배포 완료라고 보고하지 않는다.
2. 표의 각 ID를 **완료 / 진행 중 / 검증·배포 대기 / 자료 제약으로 보류** 중 하나로 판정한다. 완료된 ID는 삭제하지 않고 검증 근거(커밋/PR/테스트/Pages/기준 날짜)를 남긴다.
3. 우선순위 P0 → P1 → P2 → P3 순서로, 이미 진행 중인 관련 PR을 먼저 마무리하고 하나의 안전한 변경 단위로 코드·데이터·검증을 진행한다. 무관한 작업이 서로 충돌하면 변경 범위 분리.
4. 완료 판정에는 **실제로 수행한 범위, 테스트 수치, 실제 commit/PR, merge 여부, Pages 배포 및 live smoke**를 붙인다. 근거 없는 완료/배포 주장 금지.
5. 작업마다 **이 표의 상태·증거·다음 행동과 기준 시각을 PR 안에서 함께 업데이트**한다. 병합 전 확인해 동시 진행 중 다른 팀 변경을 덮어쓰지 않는다. 보안 세부 사항은 SEC 장부와 중복 저장하지 말고 링크한다.
6. 응답 마지막에는 항상 **이번에 완료한 ID, 아직 남은 ID, 막힌 사유와 실제 대안, 다음 최우선 ID**를 명시한다. 모든 항목을 매번 재설명하지 말고 바뀐 상태와 실행 근거를 우선 요약한다.
7. 이 프로세스는 사용자가 대화에서 작업을 요청하거나 연결된 실행 환경에서 명시적으로 작업할 때 진행한다. **예약된 자동 실행 또는 대화 밖의 백그라운드 개발을 약속하지 않는다.** 자동 알림은 별도 예약 승인을 받아야 한다.

## 변경 이력

| 날짜 (EST) | 변경 | 실행 근거 |
| --- | --- | --- |
| 2026-11-21 | #366 이전 통합 HEAD b6a95de에서 52/52 CI 통과. #368 동시 병합으로 index/UAT/immutable tests/ledger 6개 겹침 발생. Plano/Lewisville v22/v3와 DFW panel v5 양쪽 보존 재통합, 새 HEAD CI 재실행 필요. 학교별 신규 폴리곤 0, 미배포. | PR #366 #368, Issue #125 |
| 2026-11-21 12:05 EST | TX-P0-02 108개 ISD GIS 표시 분류 및 공식 링크 전수 대조 검사 추가. 6개 기본+2개 클릭형+100개 미탑재, 2개 현행 GIS, 주소 배정 인증 0개. P0-02는 학교별 실측·독립 검증 미완료로 계속 추적 | PR #364; data/dfw-gis-coverage-audit-20261121.json; tests/dfw-gis-coverage-audit.test.cjs |
| 2026-11-21 10:50 EST | #379 Allen/Prosper 토폴로지 QA가 main에 병합되었음을 재확인. TX-P1-01은 공식 원천 대조 단계가 남아 진행 중 | main 58b61e2d, PR #379 |
| 2026-11-21 | 통합 장부 최초 작성. P2 TEA QA는 완료(스냅샷 기준), GIS/배정/보안/분석은 개별 진행 항목으로 분리 | main fc64c4dc, PR #365/#369 (merged), 열린 #364/#366/#367/#368/#377/#379 |

### 2026-11-21 12:06 EST — TX-P0-01 address reference release continuation
- PR #368 (Plano/Lewisville): previous 51/51 CI passed; this branch synchronizes with latest main #380 ledger and #379 GIS audit. New head CI is required before merge. This change remains **reference-only**, no official residential enrollment grant.
- Exact final CI/merge SHA/Pages smoke must be filled after GitHub verifies this new head; do not assume deployed.

- P0-02 source audit #364 is now merged into main ff27840c1. Address official assignment remains 0 certified districts; no change to gate.


### 2026-11-21 — GIS accuracy, Prosper enrollment exception and 108-ISD rollout (verified progression)

- **TX-P0-01**: Plano/Lewisville reference-only address schools PR #368 merged into main; 0 districts carry independent official residential certification. Prosper 2026–27 Christie/Reynolds/Moseley new-entrant exception notice is implemented in pending PR #384, with exact official campus IDs, kindergarten and returning-student rules; CI and Pages pending. This never substitutes GIS zone candidates or `home.assignment`.
- **TX-P0-02**: PR #364 108-ISD source/link/render-type census merged; 6 main map GIS + 2 opt-in + 100 without per-campus rendered zones, 2 confirmed current-year official GIS sources. This is NOT 108-district school assignment automation.
- **TX-P1-01 Allen**: Original-precision historic municipal polygons (2019 H, 2023 E/M) PR #382 merged, Pages workflow #44929741854 passed. Live `allen-attendance-historical.geojson` inspected with 20 features / 5,668 vertices; six synthetic municipal source point fixtures uniquely reconciled; independent real residential certification still absent.
- **TX-P1-01 Prosper**: 2026–27 live Infofinder source polygons compared end-to-end: 31/31 campuses, 1,706/1,706 identical vertices. Six synthetic location-lookup gap examples agreed with the same single/two-grade subset as map shapes; officially published GIS differences, not local conversion errors. Actual residential eligibility / land-use still unknown.
- **TX-P1-02**: PR #366 approved next-source discovery for Mesquite/Wylie/Rockwall/Richardson merged; adds official source links/status to explorer, **not** current campus zone polygons.
- Source/landlord privacy: no private residences in git; no CORS bypass, no new provider proxy. Public external production security launch is still a separate NO-GO gate.

## 2026-11-21 12:38 EST 실제 최신 릴리스 기록

- **#364** GIS 108 ISD census: merged ff27840c, Pages 44928830393 + live smoke 44928909341 success. 6 primary + 2 opt-in references; 100 ISDs no dashboard school polygons.
- **#368** Plano/Lewisville vintage-labeled GIS reference: merged 9cbe5a15, 51/51 CI PASS and Pages 44929326812 SUCCESS, live JS inspected. *Not legal residential assignment*.
- **#366** four additional ISD public GIS/PDF source candidates: main merged; source info only, no new campus polygons.
- **#382** Allen historical polygon source precision: main merged eb069018, Pages 44929741854 success, source-origin 20 polygons retained; current-year lookup separate.
- **#384** Prosper new-student exception note merged in main 44b9fe94, production map smoke 44930846346 success.
- **#367** regional assessment clinical emergency straight-line and winter reference links: 44/44 PR CI PASS, merged d12fabbb, Pages run 44931479215 SUCCESS as of this ledger revision. No per-address emergency ETA or outage probability claimed.
- **#377 / #381** documentation and historical-privacy audit PRs explicitly require manual owner approval for merging. SEC-02 has four reachable retired-history objects; count audit is not remediation. Public Production remains NO-GO.
- **#383** refreshes this canonical ledger; source-year/CORS/license/independent exact-address official data gates remain separate, without relabeling unverifiable schools.
