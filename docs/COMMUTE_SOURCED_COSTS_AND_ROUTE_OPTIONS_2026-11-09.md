# P1 출퇴근 비용 자동 입력 및 경로별 비교 — 2026-11-09

## 사용자 요구와 제공 범위
주소/ZIP으로 통근 경로를 계산할 때, 출근·퇴근 TollTag와 TEXpress 요금을 직접 입력하도록 강제하지 않고 공식 출처에 기반한 자동 요금 및 연비·유가를 적용하고자 함. 또한 톨 허용 경로와 톨 회피 경로의 시간·월 비용을 나란히 비교하고자 함.

### 지금 구현하는 UI
- 기존 '월 출퇴근 비용' 창은 유지하면서 기본 내용 위에 새 **공식 자료 우선** 패널 추가. 기존 편도 TollTag, TEXpress 수동 입력은 '고급 설정'에 접어둠.
- AAA 2026-11-08 DFW 평균 유가를 저장본으로 적용. 선택 ZIP 또는 **검색 완료된 주택주소의 ZIP**을 `county-scopes.json`에서 확인해 Collin/Dallas/Denton → Dallas 평균, Tarrant/Parker/Johnson → Fort Worth–Arlington 평균으로 연결. 실제 집 근처 개별 주유소 평균/가격이 아닌 **광역 대리지표**이며, 30일 이상 오래되면 사용 차단.
- 등급(Regular/Midgrade/Premium/Diesel)은 공식 EPA 차량 레코드의 fuelType1에 맞춰 자동 선택. FuelEconomy.gov 4단계 메뉴(year/make/model/options) + 선택 vehicle ID의 `comb08` (공인 복합 MPG)를 조회. 사용자가 차량·트림을 선택하지 않거나 CORS/API 연결이 실패하면 값을 만들지 않고 별도 안내. 전기차·복합연료는 가솔린 연비로 환산하지 않음.
- 현재 OSRM 도로망 거리가 계산됐고 EPA 연비·AAA 유가·월 출근일이 확인되면 **월 예상 유류비만** 자동 산정.
- 별도 두 카드: (A) '톨 허용 경로 (OSRM 교통량 미반영 값)'와 (B) '통행료 회피 경로'. 후자는 Google Maps 공식 Directions URL의 `avoid=tolls`을 이용해 사용자가 **클릭할 때**만 외부 사이트에서 거리/ETA를 확인. 경로/요금 정보 미확인 상태에서는 톨 $0, 월 총비용, 시간 차이를 **만들지 않음**.
- NTTA TollTag/ZipCash/AutoPay는 거주 ZIP이 아닌 실제 통과 간트리(gantry)와 결제방식에 따라 차등; TEXpress는 TxDOT/NTE/LBJ 운영사별 **변동요금**이며 일반 NTTA 요율을 적용하지 않음.

## 공식 출처
- NTTA 공식 구간별 계산기: https://maps.ntta.org/tollcalculator/ — 자체 안내에 TEXpress **미포함**.
- NTTA 2025–2027 요율표: https://www.ntta.org/sites/default/files/2025-06/NTTAS_2025-2027_Toll%20Rate%20Tables.pdf — 여러 톨 통과 지점에 개별 적용.
- TEXpress 공식 안내: https://www.txdot.gov/discover/toll-roads-managed-lanes/txdot-toll-roads/txdot-texpress-lanes-toll-rates.html — 50 mph 목표 기반 동적 가격, 통행 시간대/HOV/축수에 영향.
- AAA Texas Metro: https://gasprices.aaa.com/?state=TX — Nov 8, 2026 (Regular Dallas $3.3431, Fort Worth–Arlington $3.3749/gallon). 다른 유종은 `data/aaa-dfw-fuel-prices.json` 참조.
- FuelEconomy.gov 공식 API: https://www.fueleconomy.gov/feg/ws/ — `/ws/rest/vehicle/menu/year|make|model|options` → 차량 ID → `comb08`와 `fuelType1`.
- Google 공식 Maps URLs: https://developers.google.com/maps/documentation/urls/get-started — `avoid=tolls`는 톨 회피 **선호**이며 완전한 무톨 보증 아님.
- Google Routes API / TollInfo: https://developers.google.com/maps/documentation/routes/calculate_toll_fees — 지원 지역과 pass에 따라 `tollInfo.estimatedPrice` 가능; 정확한 자동 경로 비교는 제한된 키 및 청구 정책을 갖춘 API 연결 필요.

## 미완료: 값으로 표시하면 안 되는 것
1. **NTTA 주소 출발/도착별 정확한 톨요금:** 공식 웹 계산기는 사용자 상호작용 도구이며 지금 확인된 공개/무인 서버 API가 없음. 요금표 PDF만 가지고 OSRM polyline이 어느 톨 통과 지점을 통과하는지 확정할 수 없음.
2. **TEXpress 출근·퇴근 변동요금:** 동적 운영사 요금에 대해 이 정적 GitHub Pages에서 통행 시각별 확정 quote를 할 수 없음. TxDOT 게시 최소요금을 실제 톨 또는 대표 출퇴근 요금으로 표시하면 안 됨.
3. **톨 회피 경로의 실제 ETA/연료비:** 기존 `router.project-osrm.org` 표준 경로에는 `avoidTolls` 또는 최신 교통량 데이터 없음. 링크의 Google Maps 경로는 앱 데이터 API로 반환되지 않음.
4. **실시간 DFW 휘발유값:** 정적 저장본은 기준일·출처를 보여주되 실시간으로 속이면 안 됨. 주기적 데이터 갱신 검증/수집기는 추후 보완.
5. **차량 전기요금과 PHEV:** 전기/혼합연료는 별도 kWh 모델 전까지 미지원.

## 다음 자동화 단계
- 사용자가 배포한 공용 클라이언트 API 키/비밀정보를 넣지 않고, 제한된 서버·Cloudflare Workers/Pages Functions 등 인증된 프록시에서 **Google Routes API** `computeRoutes`를 두 차례 호출. 같은 출발/목적지, 같은 출발 요일/시각, 동일 교통 조건을 맞춘다. 경로 A 일반, B `routeModifiers.avoidTolls=true`. 패스 `US_TX_TOLLTAG`, 미가입/ZipCash에 대응하는 옵션과 `extraComputations:['TOLLS']`; 미지원 구간은 `unknown`.
- 두 경로 거리·출퇴근 편도 소요 시간, 톨 연료 비용을 모두 검증한 뒤에만 월 합계/시간가치 비교를 공개. 운영사별 동적 가격은 보수적 범위 또는 외부 링크로 안내.
- AAA 데이터 주기적 수집은 출처/기준일/범위·요금 검증, 이상치·HTML 변경시 배포 중단, 오래된 스냅샷 표시 중단 및 로그를 갖춘 작업으로 구현.
- 주소 입력내용을 외부 서버/브라우저에서 저장하지 않으며 API 접속/개인정보/사용량 비용 통제와 별도 가족 UAT 승인 이후 공개.

## 안정성
기존 학교 위치, 주소 배정, 지도 마커, NTTA 기존 수동 모델은 변경하지 않음. 기존 수동 추정기는 접힌 '고급 설정' 내부에 남아 직접 근거를 가진 사용자를 위한 fallback으로만 제공. UI는 기존 CSP hash를 그대로 유지하면서 EPA 공식 origin만 `connect-src`에 좁게 추가.
