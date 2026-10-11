# FreeShow-ko

[ChurchApps/FreeShow](https://github.com/ChurchApps/FreeShow)를 바탕으로 한 개인 포크입니다. 원본에 더한 기능은 세 가지입니다.

1. 성경 약어 검색: `창 1`, `창 1:1-10`, `요일1:9`처럼 입력해도 찾습니다. 성경 파일의 `abbreviation` 값을 씁니다.
2. 스테이지 화면 영상 싱크: 스테이지 레이아웃을 바꿨다가 돌아오면 영상이 처음부터가 아니라 현재 재생 위치 근처에서 다시 시작하고, 몇 초 안에 메인 출력과 0.1초 이내로 맞춰집니다. 일시정지 중에는 같은 프레임에 섭니다.
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

버전은 `원본버전-ko.N`(예: `1.6.6-ko.1`)으로 자동으로 매겨집니다. 포크의 Actions 탭에서 워크플로를 켜지 마세요. 원본의 배포 워크플로가 함께 들어 있어서, 켜면 `main`에 푸시할 때마다 서명 없는 빌드가 이 저장소에 배포됩니다. 공증까지 하려면 한 번만 `xcrun notarytool store-credentials freeshow-notary`를 실행해 두고, 배포할 때 `APPLE_KEYCHAIN_PROFILE=freeshow-notary bash scripts/fork/release-mac.sh`로 실행합니다.

## 원본 FreeShow 업데이트 반영하기

```bash
git fetch origin
git merge origin/main
git push fork HEAD:main
bash scripts/fork/release-mac.sh
```

GitHub 포크 페이지의 "Sync fork" 버튼으로 합친 뒤 `git pull fork main`을 해도 됩니다.
