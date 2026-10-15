# FreeShow-ko

[ChurchApps/FreeShow](https://github.com/ChurchApps/FreeShow)를 바탕으로 한 개인 포크입니다. 원본에 더한 기능은 세 가지입니다. 원본과 다른 코드 전체와 그 관리 방법은 아래 [원본과 다른 코드](#원본과-다른-코드)에 있습니다.

1. 성경 약어 검색: `창 1`, `창 1:1-10`, `요일1:9`처럼 입력해도 찾습니다. 성경 파일의 `abbreviation` 값을 씁니다. 원본과 달리 검색창에 친 글자를 `창세기`처럼 자동완성으로 바꾸지 않고 그대로 둡니다. 목록은 치는 대로 따라가고, 한글을 조합하는 도중에 다른 책으로 넘어가지도 않습니다.
2. 스테이지 화면 영상 싱크: 스테이지 레이아웃을 바꿨다가 돌아오면 영상이 처음부터가 아니라 현재 재생 위치 근처에서 다시 시작하고, 보통 3초 안에(스테이지 창이 2개면 최대 약 9초) 메인 출력과 0.1초 이내로 맞춰집니다. 일시정지 중에 바꾸면 메인 출력과 0.02초 이내의 같은 위치에 섭니다.
3. 자동 업데이트: 이 저장소의 Releases에서 새 버전을 받습니다.

## Mac에 설치하기 (Mac마다 한 번)

1. [최신 릴리스](https://github.com/jangisaac-dev/FreeShow-ko/releases/latest)에서 dmg를 받습니다. Apple Silicon은 `arm64`, Intel은 `x64`입니다.
2. dmg를 열고 FreeShow를 Applications로 옮깁니다. 기존 FreeShow 위에 덮어써도 쇼와 설정은 그대로 남습니다.
3. FreeShow에서 설정 → 기타 → 업데이트 확인을 열고 "자동 업데이트"를 켭니다.

자동 업데이트를 켜 두면 새 버전을 백그라운드에서 받아 두었다가 앱을 종료할 때 설치합니다. 공증하지 않은 빌드는 처음 열 때 macOS가 막을 수 있습니다. 그때는 시스템 설정 → 개인정보 보호 및 보안에서 "그래도 열기"를 누릅니다.

## 새 버전 배포하기

준비물은 `gh auth login`(jangisaac-dev 계정), 키체인의 "Developer ID Application" 인증서, `npm ci`입니다.

```bash
git push fork HEAD:main
bash scripts/fork/release-mac.sh
```

스크립트는 릴리스를 초안(draft)으로 올립니다. 초안은 자동 업데이트에 잡히지 않습니다. 초안의 dmg를 받아 실행해 보고 문제가 없으면 스크립트가 마지막에 보여 주는 `gh release edit ... --draft=false --latest` 명령으로 공개합니다. 공개하는 순간 자동 업데이트를 켠 모든 Mac이 이 버전을 받습니다.

버전은 `원본버전-ko.N`(예: `1.6.6-ko.1`)으로 자동으로 매겨집니다. 원본의 배포 워크플로(`release.yml`, `winget.yml`)는 원본 저장소에서만 돌도록 막아 두었습니다. 공증까지 하려면 한 번만 `xcrun notarytool store-credentials freeshow-notary`를 실행해 두고, 배포할 때 `APPLE_KEYCHAIN_PROFILE=freeshow-notary bash scripts/fork/release-mac.sh`로 실행합니다.

## 원본 FreeShow 업데이트 반영하기

원본 `main`에는 베타도 올라옵니다(예: 2026-10-14의 1.6.7-beta.1). 정식 버전만 받도록 릴리스 태그를 합칩니다.

```bash
git fetch origin --tags
git merge v1.6.7    # 받으려는 원본 정식 버전의 태그
```

충돌이 나면 아래 [원본과 다른 코드](#원본과-다른-코드)에서 항목마다 적힌 "원본 업데이트 때"를 따릅니다. 다 풀었으면 확인하고 배포합니다.

```bash
npm run test:unit
git diff --stat origin/main...HEAD    # 원본과 다른 파일이 아래 목록과 맞는지 봅니다
git push fork HEAD:main
bash scripts/fork/release-mac.sh
```

GitHub 포크 페이지의 "Sync fork" 버튼은 쓰지 않습니다. 원본 `main`을 그대로 합쳐 베타까지 들어오고, 충돌이 나면 그 화면에서 풀 수 없습니다.

## 원본과 다른 코드

포크의 변경은 세 종류로 나눠 관리합니다.

- **포크 전용**: 원본에 내지 않습니다. 원본이 일부러 만든 동작을 바꾸거나, 이 포크의 배포에만 필요한 변경입니다.
- **원본 반영 대기**: 원본에 PR을 냈거나 낼 변경입니다. 원본에 들어오면 포크 쪽 코드를 지웁니다.
- **원본에 반영됨**: 원본에 이미 들어갔습니다. 다음 원본 업데이트를 합칠 때 원본 코드로 바꾸고 목록에서 지웁니다.

원본과 다른 파일 전체는 아래 명령으로 봅니다. 여기 나온 파일이 아래 목록에 없으면 목록에 항목을 더합니다.

```bash
git fetch origin
git diff --stat origin/main...HEAD
```

### 검색창 자동완성 끄기 (포크 전용)

- 바꾼 곳: `src/frontend/components/drawer/bible/Scripture.svelte`의 `referenceSearch()`
- 하는 일: 검색창에 친 글자를 책 이름으로 바꾸지 않고, 책을 찾은 뒤 1.5초 동안 입력을 막지도 않습니다. 여러 장 참조(`요일 1:1;2:1`)도 친 그대로 둡니다. 성경 목록과 미리보기는 원본처럼 친 내용을 따라갑니다.
- 원본에 내지 않는 이유: 자동완성은 원본 메인테이너(vassbo)가 2022년부터 직접 만들어 온 기능이고, json-bible #3에서도 의도된 동작이라고 밝혔습니다(2026-10-12). 원본에 낸다면 자동완성은 그대로 두고 "한글 조합 중에는 검색창을 덮어쓰지 않기"만 따로 만듭니다.
- 원본 업데이트 때: `referenceSearch()`에서 충돌이 나면 원본 코드를 받은 뒤, 검색창을 바꾸는 `searchValue = ...` 줄과 `freezeInput`·`freezeTimeout`을 다시 지웁니다. 그 때문에 쓰이지 않게 된 `referenceLabel`과 `buildReferenceLabel`도 지웁니다.
- 확인: 앱에서 `창 1:1`을 치면 검색창은 `창 1:1`로 남고 창세기 1:1이 선택됩니다.
- 남은 일: 검색창 오른쪽의 마법봉 아이콘(`src/frontend/components/drawer/Drawer.svelte`의 `autofill`)은 자동완성 표시인데 아직 남아 있습니다.

### 한글 약어 검색 (원본 반영 대기)

- 바꾼 곳: `src/frontend/components/drawer/bible/bookAbbreviation.ts`(새 파일)와 `bookAbbreviation.test.ts`, 원본 파일에 연결한 4줄(`scripture.ts`의 `withKoreanBookSearch` 2줄, `Scripture.svelte`의 `expandKoreanBook` 2줄)
- 하는 일: 원본이 쓰는 json-bible 라이브러리는 한글 약어(`창 1`)와 숫자가 든 책 이름(`요한1서 1:1`)을 찾지 못합니다. 포크는 검색어를 json-bible에 넘기기 전에 표준 책 id나 전체 책 이름으로 바꿉니다.
- 원본 상태(2026-10-15): json-bible #4(숫자가 든 책 이름)는 json-bible의 `korean` 브랜치에 병합됐지만 아직 npm에 배포되지 않았습니다. json-bible #3(한글 약어)은 열려 있고, vassbo의 코멘트(2026-10-12)에 아직 답하지 않았습니다.
- 지우는 시점: 두 수정이 들어간 json-bible이 배포되고 원본 FreeShow가 그 버전을 쓰면 `bookAbbreviation.ts`, `bookAbbreviation.test.ts`, 연결한 4줄을 지웁니다. 지운 뒤 `창 1:1-10`, `요일1:9`, `요한1서 1:1`이 여전히 찾아지는지 확인합니다.

### 스테이지 화면 영상 싱크 (원본에 반영됨)

- 바꾼 곳: `src/frontend/components/media/Video.svelte`, `src/frontend/components/media/video/videoSync.ts`, `videoSync.test.ts`
- 원본 상태: FreeShow #3850으로 병합돼 원본 1.6.7-beta.1에 들어갔습니다. vassbo가 병합하면서 코드를 조금 정리했고(`get(playingVideoState)`를 `$playingVideoState`로), 테스트 파일은 넣지 않았습니다.
- 원본 업데이트 때: 1.6.7 이후 버전을 합치면 `Video.svelte`와 `videoSync.ts`에서 충돌이 납니다(2026-10-15에 1.6.7-beta.1로 시험 병합해 확인). 같은 수정이므로 두 파일 모두 원본 쪽을 씁니다: `git checkout --theirs <파일>`. 원본에 없는 `videoSync.test.ts`는 단위 테스트가 통과하면 두고, 실패하면 지웁니다. 다 끝나면 이 항목을 목록에서 지웁니다.

### 포크 배포와 자동 업데이트 (포크 전용)

- 바꾼 곳:
    - `config/building/electron-builder.yaml`: 빌드를 FreeShow-ko 저장소에 초안으로 올립니다.
    - `scripts/fork/release-mac.sh`: 포크 배포 스크립트입니다.
    - `scripts/macos/notarize.js`: 키체인 프로필로 공증하고, 자격 증명이 없으면 공증을 건너뜁니다.
    - `src/frontend/utils/checkForUpdates.ts`, `src/frontend/components/main/popups/NewUpdate.svelte`, `UpdateManager.svelte`: 새 버전 확인과 다운로드 링크를 포크 저장소로 바꿨고, 자동 업데이트를 켜면 바로 확인을 시작합니다.
    - `.github/workflows/release.yml`, `winget.yml`: 원본 저장소에서만 돌게 막았습니다.
- 원본 업데이트 때: 이 파일들에서 충돌이 나면 원본 변경을 받고 포크 쪽 줄(저장소 주소 `jangisaac-dev/FreeShow-ko`, `if: github.repository == 'ChurchApps/FreeShow'`)을 다시 넣습니다. 원본이 배포 워크플로를 새로 더했으면 같은 `if:` 줄을 넣습니다. 합친 뒤 아래 명령에 아무것도 나오지 않으면 원본 다운로드 주소가 새로 들어오지 않은 것입니다.

```bash
git grep -in "ChurchApps/freeshow/releases\|freeshow.app/?download" -- src
```

### 한국어 README (포크 전용)

- 바꾼 곳: `README.md`를 한국어로 옮겼습니다.
- 원본 업데이트 때: 충돌이 나면 포크 것을 두고(`git checkout --ours README.md`), 원본에서 바뀐 내용 중 필요한 것만 옮겨 적습니다.

## 새 변경을 넣을 때

포크 전용과 원본용이 한 커밋에 섞이면 원본에 PR을 낼 때도, 원본 업데이트를 합칠 때도 떼어 내기 어렵습니다. 그래서 처음부터 나눕니다.

1. 시작 전에 종류를 정합니다. 원본이 일부러 만든 동작을 바꾸면 포크 전용, 원본에도 있는 버그를 고치면 원본 반영 대기입니다.
2. 커밋을 나눕니다. 포크 전용 커밋은 메시지를 `FreeShow-ko:`로 시작합니다. 원본에 낼 커밋은 접두어 없이 원본 스타일(영어 한 줄 요약)로 쓰고, FORK.md와 포크 전용 파일을 넣지 않습니다.
3. 원본 파일은 몇 줄만 고치고 로직은 새 파일에 둡니다(`bookAbbreviation.ts`처럼). 그래야 원본 업데이트 때 충돌이 그 몇 줄로 줄어듭니다.
4. 위 [원본과 다른 코드](#원본과-다른-코드)에 항목을 더합니다. 바꾼 곳, 하는 일, 종류, 원본 업데이트 때 할 일, 지우는 시점이나 확인 방법을 적습니다.
5. 원본에 PR을 낼 때는 원본 `dev`에서 브랜치를 새로 따고 그 커밋만 옮깁니다. PR 대상도 `dev`입니다. 최근 `main`을 대상으로 한 외부 PR은 모두 닫혔습니다.

```bash
git fetch origin
git switch -c fix/<이름> origin/dev
git cherry-pick <커밋>
```
