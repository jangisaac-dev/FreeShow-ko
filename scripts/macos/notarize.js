// From https://github.com/simonw/til/blob/main/electron/sign-notarize-electron-macos.md
// Based on https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/

const { notarize } = require("@electron/notarize")

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context
    if (electronPlatformName !== "darwin") return

    const appName = context.packager.appInfo.productFilename

    // FreeShow-ko: local builds notarize with a notarytool keychain profile (xcrun notarytool store-credentials), or skip without credentials
    const keychainProfile = process.env.APPLE_KEYCHAIN_PROFILE
    if (!keychainProfile && !process.env.APPLE_ID) return console.log("Skipping notarization (no APPLE_KEYCHAIN_PROFILE or APPLE_ID)")
    const credentials = keychainProfile ? { keychainProfile } : { appleId: process.env.APPLE_ID, appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD, teamId: process.env.APPLE_TEAM_ID }

    return await notarize({
        appBundleId: "app.freeshow",
        appPath: `${appOutDir}/${appName}.app`,
        ...credentials
    })
}
