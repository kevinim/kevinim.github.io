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
| TX-P1-02 | P1 | GIS 미탑재 학교/교육청 확대 | **출처 정보/중대 오류 정정 배포 완료; 학교별 GIS 확대 미완료** | #366 4개 학군 출처 안내 배포 main `2d722f1` / Pages·live smoke 통과. #387 2026-11-21 완료: Wylie(043914)와 동명이교 Abilene 문서 오연결 제거, Rockwall 연도 혼재 학년도 미확인 표시, Mesquite 공식 링크와 fail-closed 검증 보강. PR HEAD `2a6ee85` 51/51 CI, main `acbc5d3`, Pages [44933319150](https://github.com/kevinim/kevinim.github.io/actions/runs/44933319150) 및 live 390/1366 [44933398717](https://github.com/kevinim/kevinim.github.io/actions/runs/44933398717) 성공. 전체 108 ISD 중 기본 지도 GIS 6, 클릭형 2, 미표시 100. 실제 신규 학교별 폴리곤 0, 독립 공식 주거지 배정 0. Mesquite 학년도/재사용권/캠퍼스 ID, CFB/Denton 최신 벡터, Wylie/Rockwall/Richardson 현행 배정 GIS 계속 미완료 | Issue #125, PR #364/#366/#387, docs/DFW_NEXT_GIS_SOURCE_INTAKE_20261121.md |
| TX-P2-01 | P2 | TEA 2026 / PEIMS 2025–26 공개 원본 데이터 품질 | **완료 — 2026-11-11 공개 원본 스냅샷의 무결성 기준** | 2,282/2,282 학교 ID 대조; PEIMS 15,974/15,974 공개/마스킹/미표시 셀 상태 대조, 0건 기존 원본 불일치. 최종 데이터 QA가 전수 재계산하고 이전 독립 대조 Git blob 고정. **새 온라인 원본 재다운로드는 별도 새 버전 작업** | 병합·Pages 성공 PR #365, PR #369, docs/TEA_DFW_FINAL_DATA_QUALITY_20261112.md |
| TX-P2-02 | P2 (외부 공개 전 필수) | Production 공개 보안 | **진행 중 / 외부 공개 NO-GO** | 보안 작업 장부 SEC-01–SEC-11 확인, 실무 변경·테스트·운영 설정 증거 기록. 가족 UAT 유지. 외부 공개/로그인/소스 분리 등은 별도 릴리스 게이트를 통과해야 함. Security tracker PR #377은 미병합 초안 | PR #377, PUBLIC_RELEASE_SECURITY.md, docs/PUBLIC_SECURITY_REMAINDERS_2026-11-13.md |
| TX-P3-01 | P3 | 지역 분석: 의료·교통·재난·전력·범죄 근거 | **6개 카드 P3 기본 UI 배포·실사이트 검증 완료 / 근거 데이터 4개 확장 과제 미완료** | #367: 최종 head 73 success, 1 skipped; main d12fabbb, Pages 44931479215 성공. #388 무료 Live Pages QA: 6개 카드·CMS 직선거리·FEMA 겨울·Allen 마커·390/1280px, JS SHA-256 검증 44931769693 성공. 실제 ED 15/30분 운전권·운영, 지역별 utility outage, NTTA/TEXpress 자동견적, 경찰 원천 비교가능성은 **미완료**; ZIP 직선거리를 ETA로 표시하지 않음 | PR #367, #388, Issue #375, HANDOFF.md P40–P43 |

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
| 2026-11-21 13:05 EST | GIS #387 데이터 출처 오류 정정: PR 51/51 성공, main acbc5d3, Pages 44933319150 성공, live 학교 지도 44933398717 성공. Collin/Abilene Wylie 오연결 제거와 Rockwall 기준학년도 미확인 노출. 현행 학교별 폴리곤 탑재·주소 자동 인증 여전히 미완료, SEC-04 공개 데이터 권리 별도 NO-GO. | PR #387, Issue #125, docs/DFW_NEXT_GIS_SOURCE_INTAKE_20261121.md |
| 2026-11-21 EST | #387 Wylie 동명 교육청 PDF 오등록 삭제, Rockwall 지도 연도 충돌 출처 신뢰도 하향, 소스 검증/캐시 강화. 최종 CI/Pages 배포 전까지 incomplete. | PR #387, Issue #125 |
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
- **#367** P3 healthcare/winter reference: 73 CI success / 1 skipped, merged d12fabbb, Pages run 44931479215 SUCCESS. **#388** free deployed-site 6-card/Allen/health/winter smoke run 44931769693 SUCCESS, merged 53d07601. No per-address emergency ETA or outage probability claimed.
- **#377 / #381** documentation and historical-privacy audit PRs explicitly require manual owner approval for merging. SEC-02 has four reachable retired-history objects; count audit is not remediation. Public Production remains NO-GO.
- **#383** refreshes this canonical ledger; source-year/CORS/license/independent exact-address official data gates remain separate, without relabeling unverifiable schools.


### 2026-11-21 — TX-P3-01 release validation and outstanding sources
- **UI release completed:** #367 main `d12fabbb`; Pages build `44931479215` succeeded. Existing GitHub Actions workflow extended by #388, and **live** site `44931769693` passed JS SHA parity, Allen school markers, CSP/FEMA and P3 six-card/CMS/winter map on 390px and 1280px. This is not proof that higher-precision datasets exist.
- **Outstanding P41:** 104 CMS facilities; 83 Census interpolated locations; 21 unmapped; 67 mapped CMS ED-flagged; 34 exact trauma matches. No verified latest 24-hour ED entrance, complete pediatric/freestanding provider universe or 15/30-minute route access. [P3 issue #375](https://github.com/kevinim/kevinim.github.io/issues/375).
- **Outstanding P42:** FEMA 2025 NRI winter *hazard* 1,734 tracts and EIA 2024–25 **Texas statewide** reliability are available, not verified address-to-utility or historical local outage times. EIA Form 861 utility report acquisition/normalization and legal service-area attribution still required. No PUCT restricted GIS republication.
- **Outstanding P40:** route-specific official auto toll quotes, TEXpress time-variable tolls and AM/PM measured congestion remain unimplemented. Existing per-direction manual NTTA quote and fuel/parking model preserved.
- **Outstanding P43:** 5,465 source-native aggregate groups for Dallas/Fort Worth/Frisco/Plano/McKinney have incompatible periods/offense definitions. Allen and nearby city gaps remain. No new neighborhood crime heatmap/safety score without separate owner authorization.
- **Next sequence:** P41 facility coverage/access → P42 utility data & spatial attribution → P43 comparability/permission → P40 traffic/toll automation (lower priority). Use [Issue #375](https://github.com/kevinim/kevinim.github.io/issues/375) for detailed acceptance criteria. Missing sources get explicit unavailable labels; do not wait for school-district email responses.

### 2026-11-23 09:17 ET — TX-P0-01 Plano High/Senior missing-coverage guard (Draft PR; not deployed)
- Baseline main `bf310c5f9bbfc43a760ae9688e160fedd22a3ee3`. Narrow change in `features/school-reference-preview.js` plus synthetic regression `tests/school-reference-preview.test.cjs` on `agent/tx-p0-plano-high-senior-coverage-20261123`.
- Previously a Senior High polygon could suppress the missing High alert. For Plano 9–10 High and 11–12 Senior High are separate levels; each missing layer must now be independently reported. This is **reference-only GIS coverage UI**, not verified street/unit/grade/year enrollment or new GIS polygons. Source: Plano ISD current SchoolFinder-linked GIS (source layer named 2025–26; exact year independent certification unresolved). No new data copied or source rights asserted.
- CI and PR evidence to be recorded on Issue #378 and #125 at exact PR HEAD. **Main merge and Pages deployment require per-PR owner authorization**. Public Production remains NO-GO.


### 2026-11-23 — TX-P2-02 / SEC-04 scoped follow-up

- Last live baseline checked: `main f4a5c07b1fa657762bd0bdf383d7587df3e1fa50`, Pages run `45212038482` and post-deploy school-map smoke `45212189082` successful, open PRs 0 before work began.
- This scoped P0 security/data-rights diagnostic adds deeper **structural review subtypes** for the 30 education/GIS preview files without top-level source fields. This is a triage improvement only; exact subtype counts are pending branch CI. 0/288 redistribution rights established, independent residential enrollment certification 0 ISDs, and separate Public Production NO-GO.
- No new school polygons, enrollment claims, provider workarounds, confidential fields, hosting changes, Cloudflare/family authentication, or live runtime modifications.
- Continue #378 and #371 with exact-head PR QA and source-by-source legal/evidence review; separate parent-school/GIS milestones are not cleared by this audit.


#### Exact-head CI evidence for metadata-gap subtype pass (2026-11-23 UTC)

- Tested code head `9e2e2dcdef128683c56a3560ad6d9f8533d3e501`: [SEC-04 exact-build rights inventory 45234041413](https://github.com/kevinim/kevinim.github.io/actions/runs/45234041413) **SUCCESS**, unit tests 11+7+5 = 23 passed, none failed; [required main JS/data `verify` 45234041343](https://github.com/kevinim/kevinim.github.io/actions/runs/45234041343) **SUCCESS**; [public preview security/browser QA 45234041251](https://github.com/kevinim/kevinim.github.io/actions/runs/45234041251) **SUCCESS** (full-history Gitleaks job skipped, not falsely counted as run).
- Exact sanitized build: **30/30** previously no-top-level-source-key unpinned candidates classified: **13 nested source-shaped key hints**, **2 GeoJSON feature-property records without recognized source keys**, **15 files with no recognized source key**, **0 root arrays / key-bearing GeoJSON / uninspectable**.
- Full counters unchanged: 288 static data/media candidates, 244 education/school GIS filename candidates, 14 Git-pinned source records (byte-identical), **230 source evidence gaps, 0 independently approved redistribution rights**.
- This PR remains a *read-only audit plus documentation change*. It neither closes SEC-04 nor approves any currently pending dataset. Main Pages release remains unchanged; no family auth or separate Public Production deployment.


### 2026-11-23 — SEC-04 follow-up: omit 3 nonruntime CFB research worksheets from future public preview

- Prior merged baseline: PR #403, main `a4794945b4f36eabc2e3f9d4ea9b69a8311cf539`; Pages build run `45235330039` and school map live smoke `45235468170` both success.
- Three **internal CFB school-zone raster calibration/QA datasets**, `data/cfb-ag02-high-gcps.json`, `data/cfb-ag02-middle-gcps.json` and `data/cfb-ag03-contour-label-review.json`, are kept in developer source but explicitly excluded from `scripts/build-public-preview.cjs`'s future sanitized public-only artifact.
- Repository code search found no client-runtime references to the two GCP worksheets; the contour review filename was referenced by reconstruction script and project docs only. This is a narrow, reversible exclusion, **not a declaration that other bundled assets are safe**. Browser/verify CI must still validate any dynamic references before merge.
- Expected built candidate counts after exclusion: 288→285 data/media; 244→241 education/GIS filename candidates; school GIS 44→41; source pinned 14 unchanged; unpinned source evidence 230→227 (pending exact-head verification).
- Rights decisions remain **0 approved**, future Public Production **NO-GO**, currently hosted family Pages unchanged until this documentation/build-script PR passes CI and is merged. No Cloudflare/family auth, provider scraping, source migration, historical Git rewrite or owner billing change.


### 2026-11-23 — SEC-04 twelve no-recognized-key assets: inspected and scoped disposition

- Baseline before this branch: protected `main 10dc689736fc8334946a08d9bdd48f289148da12`, #403/#404 already Pages-deployed/live-smoke-passed, 0 open PRs. The exact sanitized-preview SEC-04 audit reported 285 data/media assets; 241 school/TEA filename candidates, 14 pinned Git-source evidence records, 227 without independent pinned evidence and 27 with no recognized top-level source key.
- **All twelve** unpinned files in the audit's `no_source_key_found_manual_review` subtype were identified and examined. Grouping: CFB GIS/official-Finder review 3; Denton public-point/holdout records 4; DFW school approval/registry control and west-district reference 3; TEA 2025–26 gender-parity audit + CFB/Lewisville academic QA batch02 (2). Existing filenames, dates, source hints and repository code references were checked; no original record, token, residential test fixture, or API response was reproduced in CI output.
- **Runtime-required (retain 3):** two Denton records are fetched by `features/denton-campus-marker-info.js`; one western DFW district reference is fetched by `features/west-dfw/panel.js`. Denton campus point vintage includes 2024–25 AskTED/NCES, `currentYearLocationVerified=false`, and the exception file does not claim 2026–27 precise/current GIS or independent home assignment. Retention only means the existing reference UI remains functional; it does not establish current assignment or licensed redistribution.
- **Internal QA/developer-only (exclude 9 from FUTURE sanitized preview, retain in source):** 3 CFB Finder/zone/source candidate review files, 2 Denton public locator holdout fixtures, 2 DFW approval/release preflight controls, 2 TEA QA assets (a gender-parity audit and academic batch02; separately source-pinned academic batch01 retained). Repository-wide exact-filename code searches found their consumers in tests, QA scripts, workflows and docs, not browser runtime; synthetic preview-selection test additionally guards against dropping the three necessary browser files. The unpinned academic batch02 records `sourcePublisher` and the gender-parity audit records `sourcePublisher`/`genderSourceUrls`, despite the narrow structural key test; the previously source-pinned academic batch01 remains in the future public-preview candidate set; their provenance hints are **not** reuse rights.
- Expected after isolated preview build: static data/media **285→276**, education/GIS lane **241→232** (TEA 200→198, GIS 41→34), unpinned source evidence **227→218**, no top-level source signal **27→18**, narrow no-recognized-key subtype **12→3**. The remaining three are browser-required; 13 nested-source hints and 2 GeoJSON feature-prop gaps persist. All counters require exact-head CI confirmation.
- **No changes** to live family Pages browser logic, school/TEA displayed values, GIS polygons, map markers, official address assignments, provider calls, authentication, hosting or private source history. This exclusion alone **does not remove these files from current Pages/source Git history** and does not constitute a separate Public Production deployment. All **276** remaining distribution records remain **pending rights** until independent source-specific publisher, terms and attribution evidence are reviewed; owner-publication gate **NO-GO**.
- Next verification: exact PR-head `verify`, SEC-04 crosswalk with hard fail-closed 232/18/3 assertions, sanitized desktop/mobile/strict-CSP browser QA, and no runtime fetch failures. Record exact PR and CI links after completion; do not merge based on documentation alone.

### 2026-11-24 — TX-P0-01 per-campus GIS source-vintage visibility (isolated review)
- Baseline `main 2acfaced5e32875d290f338856aa1822ff8347ff`; branch `agent/tx-p0-per-campus-vintage-20261124`. Earlier open PR count was zero.
- Reproducible omission: the source-year-limited Plano and Lewisville GIS preview returned `candidate.yearNote` internally but did not render that per campus; a school list could hide which grade's source layer is older or undated. Proposed repair displays a text-only small vintage note for each reference candidate, bumps existing cache pins on 4 UAT entrypoints and retains exact HTML bootstrap gate.
- Added synthetic Plano 4-grade and Lewisville 3-grade render tests. No geometry, enrollment certification, PII, paid vendor, external source, auth/hosting or other map behavior is changed.
- **Staged only** until PR latest-head CI + deployment decisions; no main merge or Pages delivery is claimed by this record. Independently certified exact address+unit+school-year+grade enrollment remains **0 ISDs**, and Public Production **NO-GO**. Next actionable P1 work: independent Prosper boundary mismatch/actual-source-year review, then data rights/TEA and Area Intelligence.

### 2026-11-24 — TX-P0-01 source vintage UI verified release and west-DFW enrollment label follow-up
- PR [#406](https://github.com/kevinim/kevinim.github.io/pull/406) merged to existing family Pages at `ee47b7f213084891ad1db0eb5ec4a059d408ee06`. Its corrected exact-head CI was **46/46 success**, Pages [deploy #45472159744](https://github.com/kevinim/kevinim.github.io/actions/runs/45472159744) **success** and independent live 390/1366 school-map/browser [#45472310226](https://github.com/kevinim/kevinim.github.io/actions/runs/45472310226) **success** on the same commit. This closes only the per-campus Plano/Lewisville source-vintage disclosure omission, not residence certification.
- Additional isolated P0 follow-up staged on `agent/tx-p0-west-dfw-source-link-purpose-20261124`: Carroll ISD's western-panel general district URL is an **enrollment portal**, while distinct official SchoolSearch is available separately. Existing generic `공식 학교 찾기 / 배정 지도` label risks misrepresenting the enrollment URL as address-based search. Update only visible text/entrypoint cache and regression tests, retaining the source URLs and zero West DFW polygons. **Pending branch CI/PR/merge/Pages smoke** until recorded; no automatic enrollment inference.
- Official street+unit+academic-year+grade automatic assignment remains **0 ISDs**; GIS expansion/rights checks and separate Public Production **NO-GO** remain open.

### 2026-11-24 — TX-P1 Prosper cross-grade distance audit correction
- Source: existing pinned 2026–27 Prosper GIS, 31 schools; no geometry or school assignment change. Read-only deterministic 120×120 local QA found **293** partial E/M/H grid cells. A prior metric used maximum distance to a missing grade boundary and described **133** cells as deep. Recalculated strict all-missing-grade 200 m distance shows **121 deep** and **12 mixed-distance** cells; the original 133 count remains as the separately labelled any-missing-grade-far measure. By missing grade: E+M 177; H 30; M+H 19; E+H 16; M 20; E 31.
- Scope: correct QA report semantics, add per-grade distance explanations and deterministic negative/real-source regression tests. Do **not** label grid cells actual homes, residential eligibility failures, or false publisher polygons; this corrects the audit interpretation only. New branch `agent/tx-p1-prosper-cross-grade-depth-semantics-20261124` requires exact-head CI, PR review, main merge, Pages/live check before **release completed** status.
- Outstanding P1 official land use + district edge + residence holdouts, P0 residential certification 0 ISDs, P2 data reuse rights (0 authorized), separate Public Production NO-GO.

### 2026-11-24 — TX-P1 Prosper metric release and follow-up for absent school-grade sources
- [PR #408](https://github.com/kevinim/kevinim.github.io/pull/408) **merged** main `4ed8b2aea63f4d04a4659886e61d99c0c945a340`; latest-head main QA, school-polygon linkage and security PR workflow all PASS. GitHub Pages [#45485322132](https://github.com/kevinim/kevinim.github.io/actions/runs/45485322132) and actual 390/1366 live school-map/CFB [#45485460736](https://github.com/kevinim/kevinim.github.io/actions/runs/45485460736) both completed/success on the same exact main commit. The 293 / 121 strict deep / 12 mixed / 133 any-far corrected measurement is now **released**, not merely CI-ready.
- Additional P1 source-integrity follow-up staged on `agent/tx-p1-unmeasurable-missing-grade-layer-20261124`: when a school-grade layer is **entirely absent**, there is no finite source boundary distance. Explicitly mark the layer and corresponding samples as **unmeasurable** rather than falsely treating infinity as a deep 200m+ gap. Add synthetic regression and preserve all Prosper 2026–27 published geometry/counts. **Release not claimed** until independent PR review, exact-head QA, merge, Pages and live smoke.
- P0 certified exact-residence assignment remains 0 ISDs; P1 official land-use/district-edge/school-year/address holdouts remain open. No new source rights approved; Public Production NO-GO.

### 2026-11-24 — TX-P1 Prosper independent synthetic land-context source check (staged)
- GIS source unchanged: Prosper official Infofinder 2026–27 current reference geometry (31 polygon features, 20 E/7 M/4 H); 120² synthetic reference grid contains 293 partial grade-coverage cells after #408/#409 corrected semantics. **None is independently confirmed to be an actual residential address or school enrollment.**
- New bounded read-only audit `scripts/prosper-public-parcel-overlap-audit.cjs` cross-references all 293 synthetic locations against publicly published Collin CAD and Denton CAD parcel feature services with **strictly restricted non-personal fields** and no persistent parcel geometry/owner/address. Source aggregate QA report and synthetic/mocked security tests run in existing polygon-linkage workflow, not a new service or public runtime endpoint. Sources and limitations: `docs/PROSPER_PUBLIC_CAD_SYNTHETIC_GRID_20261124.md`.
- Work branch `agent/tx-p1-prosper-parcel-synthetic-sourcecheck-20261124`: **staged only** pending latest-head tests, observed non-PII aggregate, PR review, main merge, Pages build and actual live browser verification. If official service access fails, return `source-unavailable`, never invent nonresidential/occupied/residence-certified counts. Further tax-jurisdiction/parcel occupancy validation and 100-ISD school polygon expansion remain **P1 incomplete**, Public Production NO-GO.

### 2026-11-24 — TX-P1 Prosper independent public map-click parity on CAD synthetic points (staged)
- PR #410 (synthetic CAD source and taxing-unit cross-tab) published to main `ac105e0d150a1e419d60ff288e2624f925b3e49c`, GitHub Pages [45489675182](https://github.com/kevinim/kevinim.github.io/actions/runs/45489675182) completed/success and 390/1366 public school map [45489817148](https://github.com/kevinim/kevinim.github.io/actions/runs/45489817148) completed/success. Official CI aggregate: **293** source grid cells; 191 residential-*property category*, 59 no-parcel-grid-point, 24 partial Denton provider unavailable, 19 unknown land category; **20 residential-category plus Prosper taxing-unit code** and 12 unknown land category plus Prosper taxing-unit code. These are synthetic points, not student/home evidence.
- Follow-up `agent/tx-p1-prosper-residential-tax-synthetic-locator-20261124` adds at most 20 **public official Prosper Infofinder map-click** checks at synthetic grid points matched to residential-property-category/Prosper taxing-unit code, counting publisher source-campus parity vs source missing-grade patterns without personal addresses or IDs in artifact. Pending exact-head PR QA/merge/Pages smoke; do not claim complete until release verified. P1 real residence/land-use/100-ISD GIS expansion, 0 certified residential ISDs and separate Public Production NO-GO remain.


### 2026-11-25 ET — GIS 출처·레이어 연도·주거지 공식 배정 상태 분리 (PR #421)
- **관련 ID:** TX-P0-01, TX-P0-02, TX-P1-01. UI provenance 후속 개선은 PR #421에서 진행 중이며 **main/Pages 배포 완료 판정이 아님**.
- **변경:** 주소 GIS 참고 후보에서 GIS 제공기관, 경계 유형, 적용 학년도/원본 레이어의 연도, 최초 게시일 미확인, 실제 주소별 배정 미인증을 별도 표시. McKinney 공식 Finder 2026–27 운영 연도와 초·중·고 개별 SCHL_YEAR 구분. 학교 선택 배지는 '공식 배정선' 대신 '공식 학교별 GIS · 배정 미인증'으로 개선.
- **독립 실행 근거:** GitHub PR #421 브랜치의 실제 소스에서 JS 문법 6개 파일 및 프로비넌스·차단 동작 10개 검증 **16/16 통과** (2026-11-25 ET). 이 검증은 Node 전체 스위트나 브라우저/Pages QA의 PASS를 의미하지 않음.
- **남은 완료 조건:** GitHub workflow의 해당 PR HEAD 검증, PR #418 변경과의 호환성, main 병합, Pages 실행과 배포 사이트의 GIS/학교 선택·주소 검색 및 모바일 회귀 확인. 공식 거주지 배정 0개 인증 유지, Public Production NO-GO 변경 없음.

### 2026-11-25 — GIS next-source iteration (Melissa, TX-P1-02)

- The 2026-11-21 baseline remains **108 public ISDs, 6 default polygon sources, 2 opt-in sources, 100 without app campus polygons; 0 independently certified residence assignments**.

- Fifth curated source candidate Melissa ISD (TEA 043908; 9 TEA campus records) is **reference-only**; earlier four candidates retain their original evidence and status. District announcement confirms board-approved 2026–27 elementary zones and CRA family placement choices, NOT the live GIS layer's year/coverage.

- Fail-closed validator pins district, official URLs, unverified live geometry year, separately approved 2026–27 E map, 0 imported polygons, 0 automatic certifications, unapproved reuse. Rights remain pending.

- Branch gpt/tx-gis-melissa-source-20261125. CI, merge SHA, Pages deploy and live smoke must be checked separately; PR creation is not deployment proof. Follow-up: licensed current school-by-grade polygon sources and public-point/parcel exception checks.
- **Source vintage refinement:** district web zoning guide still describes 2025–26; separate board notice approves 2026–27 elementary boundaries, but live E/M/H GIS year remains unverified. Both years are independently stored, Melissa row reviewed 2026-11-25.
