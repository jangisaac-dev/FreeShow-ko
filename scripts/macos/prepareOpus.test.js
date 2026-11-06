const assert = require("assert/strict")
const { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } = require("fs")
const { dirname, join, resolve } = require("path")
const { find } = require("@discordjs/node-pre-gyp")
const { Arch } = require("builder-util")
const prepareOpus = require("./prepareOpus").default

const projectDir = resolve(__dirname, "../..")
const fixtureDir = mkdtempSync(join(projectDir, ".tmp-opus-hook-"))
const packagePath = join(projectDir, "node_modules", "@discordjs", "opus", "package.json")
const fixturePackage = join(fixtureDir, "node_modules", "@discordjs", "opus", "package.json")
const electronVersion = require("electron/package.json").version

try {
    mkdirSync(dirname(fixturePackage), { recursive: true })
    copyFileSync(packagePath, fixturePackage)
    const sources = {}
    for (const arch of ["x64", "arm64"]) {
        const options = { target_arch: arch, target_platform: "darwin" }
        const source = find(packagePath, { ...options, runtime: "node" })
        const fixtureSource = find(fixturePackage, { ...options, runtime: "node" })
        const destination = find(fixturePackage, { ...options, runtime: "electron", target: electronVersion })
        mkdirSync(dirname(fixtureSource), { recursive: true })
        copyFileSync(source, fixtureSource)
        sources[arch] = fixtureSource
        const context = { electronPlatformName: "darwin", arch: Arch[arch], packager: { projectDir: fixtureDir, config: { electronVersion } } }

        assert.equal(existsSync(destination), false)
        prepareOpus(context)
        assert.deepEqual(readFileSync(destination), readFileSync(source))
        assert.deepEqual(readFileSync(fixtureSource), readFileSync(source))
    }

    prepareOpus({ electronPlatformName: "linux" })
    const context = { electronPlatformName: "darwin", arch: Arch.x64, packager: { projectDir: fixtureDir, config: { electronVersion } } }
    copyFileSync(sources.arm64, sources.x64)
    assert.throws(() => prepareOpus(context), /lipo/)
    rmSync(sources.x64)
    assert.throws(() => prepareOpus(context), /lipo/)
    assert.throws(() => prepareOpus({ ...context, arch: Arch.universal }), /Unsupported/)
    console.log("Opus hook: x64/arm64 copy, cache preservation, platform guard, missing/wrong architecture checks passed")
} finally {
    rmSync(fixtureDir, { recursive: true, force: true })
}
