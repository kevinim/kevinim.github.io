# TX Home Explorer — UI/UX 실행계획 (2026-11-25)

> **승인된 방향 / 구현 미완료 상태.** 본 문서는 UI 향상용 계획이며 현재 기능의 정확한 배포 상태를 대체하지 않는다. 현행/변경 증거는 매 회차 GitHub에서 다시 확인할 것.
>
> **UX 작업 원장:** [Issue #412](https://github.com/kevinim/kevinim.github.io/issues/412)  
> **TX 통합 원장:** [Issue #378](https://github.com/kevinim/kevinim.github.io/issues/378) / [TX_RELOCATION_WORK_LEDGER.md](TX_RELOCATION_WORK_LEDGER.md)  
> **GIS/학군 데이터:** [#125](https://github.com/kevinim/kevinim.github.io/issues/125), [#376](https://github.com/kevinim/kevinim.github.io/issues/376), [BOUNDARIES.md](../BOUNDARIES.md)  
> **Public Production 보안:** [PRODUCTION_SECURITY_TRACKER.md](PRODUCTION_SECURITY_TRACKER.md) — NO-GO 유지

## 1. 무엇을 위한 제품인가

사용자가 DFW 주소 하나를 검색하면 **첫 화면에서 학교 정보의 신뢰 수준을 이해**하고, 지도에서 관련 학교와 학군 범위를 살펴본 뒤, 생활 조건과 여러 후보 주소를 비교하여 실제로 집을 보러 갈 후보를 좁히는 도구다.

**유저 여정:**
1. **주소 입력** → 유효한 검색 결과 선택, 주소 지오코딩/학군 검색 상태 확인
2. **학교 검토** → Elementary / Middle / High (Plano senior band 등 예외 구분), 학업 등급과 근거 출처 확인
3. **지도 탐색** → 학교핀, 출처·연도 라벨이 있는 참조/공식 학교 경계, 예외/누락 확인
4. **생활 적합성** → 학교 요건, Plano 직장 통근, 교회/발레 이동, 위험·의료를 분야별로 검토
5. **관심집 비교** → 주소 2~3곳을 공통 척도로 나란히 비교 후 Redfin 외부 매물 보기
6. **추가 정보** → TEA/PEIMS 상세, 지역 통계, 원천 링크, 각주(기본 접힘)

**디자인 원칙:** first-fold essentials, progressive disclosure, map/list 연결, evidence-first labels, clear empty/error states, dark-mode-first contrast. **정량 목표:** 15초 안에 1차 판단(향후 사용성 테스트 목표일 뿐, 현재 성능 보증 아님).

## 2. 기존 구현 재사용 및 중복 회피

아래는 저장소 이력/현재 파일에서 확인된 기존 기반이다. 목표 UX가 이미 충분히 구현됐다고 판단하지 말고 실제 동작을 회귀 검증한다.

| 기존 기반 | 확인 근거 | 이번 변경의 방향 |
| --- | --- | --- |
| 3열 desktop map + filter + info, address-first responsive ordering | index.html, #214 | 전면 재작성보다 첫 fold 시각적 위계 강화 |
| 학군 reference-only 안내와 년도 표기, E/M/H 일부 참조 UI | #368, #384, BOUNDARIES.md | 소스/학년도/학교급별 결측 상태를 **한 곳에서** 통일 |
| DFW 지도/학교 markers, source-dated GIS | #125, #376 | 목록-지도 상호작용 QA 및 개선 |
| Redfin 링크/매물 지도와 Area Explorer | index.html | 선택 주소/필터 복원 및 비교 흐름 개선 |
| 지역 의료·겨울 위험 등 6개 기본 카드 | #367, #388 | 요약카드와 상세의 계층화 (새 추정치 생성 금지) |
| 각주 접기, 다크모드 CSS | index.html | 시각적 밀도·접근성·출처 접근 개선 |

**중요:** 실제 정확한 거주지·unit·school year·grade 별 독립 공식 배정이 확인되지 않으면 **'공식 배정 확정'이라는 문구를 사용하지 않는다**. Academic rating A/B/C는 배정 여부의 증거가 아니다. 현재 reference GIS 및 승인 상태는 별도 게이트를 유지한다.

## 3. 우선순위와 개발 작업 계약

### P0 — 주소에서 학교까지의 첫 화면

**UX-01 / 주소 첫 fold 및 학교 카드**
- 설계: 상단 검색, 검색된 주소, 초/중/고 (필요한 grade band) 별 **등급 카드 + 학교 명칭 + 확인 상태**를 지도 위에 배치.
- 상태: 검색 전, 주소 후보 선택 중, 조회 중, 부분 성공(2/3 등), 없음/미연결, 공식 Finder 확인 필요, 오류/타임아웃, 주소 지우기.
- 학교 등급은 A/B/C/Not Rated/Not Available을 색 + 텍스트로 표시. 학교점수와 주소 배정상태는 독립 컴포넌트.
- **수용기준:** 주소 변경 시 이전 학교 결과가 남지 않고, E/M/H 중 하나만 존재할 때 누락급을 명확히 표시. 지도·검색 결과가 일관된지 재현 가능한 fixture로 테스트.

**UX-02 / 지도 ↔ 학교 선택 양방향 연동**
- 학교 카드/리스트 클릭 → 올바른 학교 marker 강조, 지도 이동, 이용 가능한 attendance polygon 강조. 지도 학교 marker/학교 구역 클릭 → 동일 학교 카드/리스트 선택 및 스크롤/상세 열기.
- 선택된 학교의 E/M/H 종류, ID, 년도, GIS 신뢰도, 중복(동명이교, multi-campus)을 별도로 판별.
- 같은 외곽을 공유하는 adjacent polygons는 가능한 경우 외곽선 합치기를 검토하되, **실제 지리학적 차이·홀·island 등은 숨기지 않는다**.
- **수용기준:** 교차 선택/해제/주소 초기화/줌/모바일에서 마커 0개 회귀 방지; 소스 GIS가 없으면 경계선을 만들지 않고 안내만 표시.

**UX-03 / 데이터 근거·신뢰도 디자인 시스템**
- 상태 정의: **공식 출처에서 주소별 별도 확인**, **현행 운영 Finder의 GIS 참조**, **과거 공식 GIS 참고**, **자료 없음**, **출처 충돌/확인 필요**.
- 각 카드에 school year, GIS source/effective year, 출처 바로가기, 기준자료 표시. 노출하지 못하는 마스킹된 TEA/PEIMS 데이터는 결측/마스킹으로 구분.
- 에러/결측 시 단순 'B' 또는 빈 화면으로 fallback하지 않음. 부정확한 경계 인근은 사용자에게 공식 조회 안내.
- **수용기준:** 데이터-상태 mapping regression, 누락된 High/Senior 감지, 모든 학교별 출처 라벨 테스트. 공식 배정 승인 registry는 건드리지 않음.

### P1 — 지역 적합성과 비교

**UX-04 / 지역 적합성 패널**
- 요약 항목: 학교 최소 B 요구사항을 판단 가능한 경우, Plano 직장 출퇴근 30분 목표(측정 가능한 경우), 교회/발레 이동(실측 또는 구분된 예상치), 위험·병원 근거.
- **점수 하나로 결정하지 않는다**: '조건 충족 / 목표 초과 / 확인 필요'를 항목마다 설명하고 사용자가 우선순위를 바꿀 수 있게 한다.
- 위험/의료/정전/교통은 GIS/측정 시점·방법·부재를 함께 표시. 직선거리를 운전 시간으로 대체하지 않는다.
- **수용기준:** 없는 지역 데이터는 0 위험·0 거리·양호로 나타나지 않음. 필터 조건은 설명 가능하며 기존 분석 패널을 재사용.

**UX-05 / 비교와 shortlist**
- 주소 최대 3개를 카드로 고정, 학교/출퇴근/생활 접근/위험의 동일한 열로 비교. 수치와 출처, 미확인 상태를 구분.
- 기본은 한 브라우저 세션 안에서만 보관하며 서버에 자동 저장하지 않음. 장기 저장은 개인정보 리스크 검토·명시적 사용자 선택 뒤 별도 작업.
- **수용기준:** 비교 주소 추가/제거/교체/동일 주소 중복·부분 데이터·개별 로딩 상태; 비교 이후 이전 지도/검색 상태 복원.

**UX-06 / 탐색 상태 유지**
- Area Explorer → 지도 → Redfin 관련 링크 후 돌아와도 선택 주소, 지도 zoom/center, 학교 필터가 안전하게 유지되는 방법을 선택; 외부 Redfin은 deep link 이상의 무단 스크래핑/임베드 보장 금지.
- 새 주소 검색과 명시적 Clear는 이전 상태를 완전히 지운다.
- **수용기준:** 뒤로가기, 새로고침(개인정보 정책과 합치되는 범위), 실패한 지오코딩, 중복 검색에 대한 브라우저 회귀.

### P2 — 완성도·접근성·성능

**UX-07 / 반응형과 접근성**
- 모바일 지도 크기 확보, 필터/카드 Bottom Sheet(접근가능한 포커스/키보드 제어); Desktop split view 유지.
- Dark theme 기본값 요구를 존중하되, 시스템/명시 선택 유지에 대한 기존 기능과 충돌하지 않게 통합.
- WCAG 2.2 AA 기준의 대비·focus-visible·target size를 QA 목표로 삼고, reduce-motion 지원.
- **수용기준:** 320/375/390/430/480/720/1366px, 키보드-only, screenreader 구조, 지도 오버랩/가로스크롤 0.

**UX-08 / 출처·각주 정리**
- 관련 출처를 정보 옆에 작은 링크/아이콘으로 노출하되 상세 각주는 기본 접힌 공통 출처 패널로 이동; 클릭 시 정확한 해당 항목에 포커스 이동.
- 공식확인 제한/개인정보·제공자 필수 고지는 검색 시점에 충분히 보이고 상세는 접힘.
- **수용기준:** footnote 수 보존, source links 유효성, 키보드/스크린리더, 외부 링크 표시, 미리보기와 실제 문구 일치.

**UX-09 / 성능 및 UI 회귀**
- 브라우저에서 주소선택→학교 카드 첫 render, 지도 pan/zoom, 레이어 전환, 메모리/중복 이벤트 리스너를 측정. 성능 예산은 실측 후 설정.
- 동작은 원래 상태 기반: 새 레이어가 학교 marker/zone 렌더와 독립, 데이터 캐시가 stale school result를 화면에 잘못 남기지 않음.
- **수용기준:** CI fixture + 실 Chrome 390px/1366px smoke, 기존 학교 마커·Redfin·지역 분석·CSP·source label·mobile overflow 회귀 제로.

## 4. 기술/파일 소유권 규칙

- **먼저 현 코드의 검색/주소 → 학교 표시 → 지도 state 흐름을 추적**하고 파일별 소유권을 정한다. 범위 밖 리팩터링은 별도 PR.
- 권장 순서: UI 상태 모델 정리 → read-only component/adapter → browser QA → 시각적 polishing. 기존 Leaflet/vanilla JS/CSS와 정합성 유지; 새 framework/유료 API 무조건 도입 금지.
- 데이터 입력 contract 초안: selectedAddress (ephemeral), geoStatus, schoolRows[gradeBand,schoolId,schoolName,academicRating,assignmentStatus,geometryStatus,schoolYear,sourceYear,sourceUrl], areaFacts[metric,value,unit,method,asOf,availability].
- status는 하나의 boolean으로 합치지 않는다. grade별 school candidate 존재, GIS reference 유무, official residence confirmation, academic rating은 각자 별도 상태.
- **Production security/GIS data 권한 문제는 UX에서 우회하지 않으며 기존 장부에 연결**한다.

## 5. 릴리스/검증 절차

| Stage | 실행 및 기록 | PASS 확인 |
| --- | --- | --- |
| A. Baseline | main SHA, 열린 PR, 같은 파일 작업자, 현재 Pages 렌더 | 중복/충돌 없음 |
| B. Implementation | UX-ID 전용 branch/PR + 작은 변경 | 코드 및 수정 범위 확인 |
| C. Local/CI | 해당 테스트 **실행 결과** 기록, 실패 원인 수정 | 현재 HEAD 결과 green |
| D. Release | 승인된 PR review, main merge + Pages 배포 | branch status/Pages success |
| E. Live QA | 390px/1366px, 주소 삭제, E/M/H, 지도, dark mode, source status | deployed build에 대한 smoke 통과 |
| F. Record | Issue #412 + 필요시 #378 상태·증거·차단 이유 갱신 | 상태와 근거 일치 |

문서/이슈 작성만으로 UX-01~09는 완료되지 않는다. Actions quota 제한 시 **현지/정적 테스트를 진행하고 CI/배포 미확인 그대로 표시**한다. 지나간 Actions 300개 정리는 별도 owner 제외사항이다. 이미 존재하는 동작은 재구현하지 않고 검증된 개선분만 PR로 분리한다.

## 6. 채팅 재개 프로토콜

**어느 새 Chat이든 아래 한 문장으로 요청 가능:**

> TX UI 계속 진행. kevinim/kevinim.github.io Issue #412와 docs/TX_UI_UX_ROADMAP_20261125.md, #378을 읽고, 최신 main/PR/CI/Pages 상태를 확인한 다음 UX-01~09 중 P0 미완료 우선순위부터 실제 코드를 수정·테스트하고 가능한 릴리스까지 진행하세요. 완료/미완료/차단 원인·대안/다음 순위/배포 여부를 Issue에 갱신하세요. 문서만 만들고 종료하지 마세요.

**운영 규칙:** 매 요청 회차에서 실제로 수행 가능한 개발을 끝까지 수행. 승인/권한/검증이 부족하면 차단 근거·대안을 보고. 사용자 요청 없이 대화 밖에서 자동으로 개발하고 있다고 주장하지 않음.

## 7. 다음 액션 (UX-01)

1. 현재 index.html과 주소 검색/선택 핸들러, 학년별 school reference preview, 지도 렌더링, CSS media queries를 최신 main에서 정확히 연결해 현행 동작 표 작성.
2. 390px/1366px의 한 주소 검색 시나리오를 재현하고 **학교 3급 중 1급 누락**, 근거 연도, 주소 삭제 등 우선 회귀를 fixture/test로 확정.
3. 중복 UI를 만들지 않고 첫 fold의 E/M/H 요약 컴포넌트만 우선 개선, 별도 UX-01 PR 및 테스트.
4. UX-02는 UX-01의 school ID/state contract를 재사용하여 리스트↔지도 동기화 개선.
