const assert = require("assert/strict")
const { readFileSync } = require("fs")
const { join, resolve } = require("path")
const yaml = require("js-yaml")
const { doMergeConfigs } = require("app-builder-lib/out/util/config/config")
const { getMainFileMatchers, getNodeModuleFileMatcher } = require("app-builder-lib/out/fileMatcher")
const { AppFileWalker } = require("app-builder-lib/out/util/AppFileWalker")

const projectDir = resolve(__dirname, "../..")
const rawConfig = yaml.load(readFileSync(join(projectDir, "config/building/electron-builder.yaml"), "utf8"))
const outDir = join(projectDir, "dist")
const destination = join(outDir, "matcher-test")
const stat = { isDirectory: () => false }

for (const platform of ["mac", "win", "linux"]) {
    const config = doMergeConfigs([structuredClone(rawConfig)])
    const packager = { projectDir, config, buildResourcesDir: "build", debugLogger: { isEnabled: false } }
    const matchers = getMainFileMatchers(projectDir, destination, (value) => value, config[platform], { info: packager }, outDir, false)
    const walkers = matchers.map((matcher) => new AppFileWalker(matcher, packager))
    const includes = (file) => walkers.some((walker) => walker.filter(join(projectDir, file), stat))

    for (const file of ["package.json", "LICENSE", "build/electron/index.js", "build/types/IPC/Main.js", "public/index.html", "public/build/bundle.js"]) {
        assert.equal(includes(file), true, `${platform}: missing runtime file ${file}`)
    }
    for (const file of ["handoff-20261015-163351.md", "old_handoff.md", "test-output/previous-dist-20261107/mac/FreeShow.app/private.txt", "test-output/ship-1.6.7/partial-dist-before-opus-fix/private.txt", "src/frontend/main.ts", "scripts/fork/release-mac.sh", "config/building/electron-builder.yaml", ".vscode/settings.json", "FORK.md", "README.md", "SKILL.md", "AGENTS.md", ".agents/skills/private/SKILL.md", "makesnap"]) {
        assert.equal(includes(file), false, `${platform}: leaked project file ${file}`)
    }

    // Production dependencies use a separate matcher; the root allowlist must preserve it.
    const moduleMatcher = getNodeModuleFileMatcher(projectDir, destination, (value) => value, config[platform], packager)
    const moduleFilter = moduleMatcher.createFilter()
    const includesModule = (file) => {
        const parts = file.split("/")
        return parts.every((_, index) => moduleFilter(join(projectDir, "node_modules", ...parts.slice(0, index + 1)), { isDirectory: () => index < parts.length - 1 }))
    }
    for (const file of ["@discordjs/opus/lib/index.js", "@discordjs/opus/prebuild/electron-v37.10-napi-v3-darwin-x64-unknown-unknown/opus.node", "better-sqlite3/build/Release/better_sqlite3.node", "socket.io/dist/index.js"]) {
        assert.equal(includesModule(file), true, `${platform}: missing dependency ${file}`)
    }
    assert.equal(includesModule("@discordjs/opus/prebuild/node-v127-napi-v3-darwin-x64-unknown-unknown/opus.node"), false)
    const nativeLibrary = { mac: "macos", win: "win-x64", linux: "linux-x64" }
    for (const target of ["mac", "win", "linux"]) {
        assert.equal(includesModule(`openmediatransport/lib/${nativeLibrary[target]}/native.node`), target === platform, `${platform}: incorrect ${target} native dependency filter`)
    }
}

console.log("Package matchers: mac/win/linux runtime allowlist, project exclusions and native dependency filters passed")
