const { execFileSync } = require("child_process")
const { copyFileSync, mkdirSync } = require("fs")
const { dirname, join } = require("path")
const { find } = require("@discordjs/node-pre-gyp")
const { Arch } = require("builder-util")

exports.default = function prepareOpus(context) {
    if (context.electronPlatformName !== "darwin") return

    const arch = Arch[context.arch]
    if (arch !== "x64" && arch !== "arm64") throw new Error(`Unsupported macOS Opus architecture: ${arch}`)
    const packagePath = join(context.packager.projectDir, "node_modules", "@discordjs", "opus", "package.json")
    const options = { target_arch: arch, target_platform: "darwin" }
    const source = find(packagePath, { ...options, runtime: "node" })
    const destination = find(packagePath, { ...options, runtime: "electron", target: context.packager.config.electronVersion })

    // N-API rebuilds use Node paths, while Opus resolves an Electron-specific path at runtime.
    execFileSync("lipo", ["-verify_arch", arch === "x64" ? "x86_64" : arch, source])
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(source, destination)
}
