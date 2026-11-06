import { _electron as electron, type ElectronApplication } from "playwright"
import { expect, test } from "@playwright/test"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

test("search result show drops into the current show and undoes once", async ({}, testInfo) => {
    const root = mkdtempSync(path.join(tmpdir(), "freeshow-show-drop-"))
    const project = process.cwd()
    const appRoot = process.env.FS_E2E_APP_ROOT || project
    const store = path.join(root, "store")
    const data = path.join(root, "Data")
    const shows = path.join(data, "Shows")
    mkdirSync(store, { recursive: true })
    mkdirSync(shows, { recursive: true })
    mkdirSync(path.join(root, "temp"))
    const json = (file: string, value: unknown) => writeFileSync(file, JSON.stringify(value))
    json(path.join(store, "config.json"), { dataPath: data, autoErrorReporting: false })
    json(path.join(store, "settings.json"), {
        initialized: true,
        language: "en",
        alertUpdates: false,
        outputs: { default: { enabled: false, active: false } },
        disabledServers: { remote: true, stage: true, controller: true, output_stream: true },
        autosave: "never"
    })
    for (const [id, name, text] of [
        ["drop-target", "Drop Target", "Target original"],
        ["drop-source", "Drop Source", "Source inserted"]
    ]) {
        json(path.join(shows, `${name}.show`), [
            id,
            {
                name,
                category: "song",
                timestamps: { created: 1, modified: null, used: null },
                settings: { activeLayout: "main", template: null },
                meta: {},
                quickAccess: {},
                slides: {
                    first: {
                        group: "Verse",
                        color: null,
                        settings: {},
                        notes: text,
                        items: [{ type: "text", style: "left:0px;top:0px;width:1920px;height:1080px;", lines: [{ align: "center", text: [{ value: text, style: "font-size:80px;" }] }] }]
                    }
                },
                layouts: { main: { name: "Default", notes: "", slides: [{ id: "first" }] } },
                media: {}
            }
        ])
    }

    const sourceFile = path.join(shows, "Drop Source.show")
    const sourceFixture = JSON.parse(readFileSync(sourceFile, "utf8"))
    sourceFixture[1].slides.second = structuredClone(sourceFixture[1].slides.first)
    sourceFixture[1].slides.second.notes = "Source second"
    sourceFixture[1].slides.second.items[0].lines[0].text[0].value = "Source second"
    sourceFixture[1].layouts.main.slides.push({ id: "second" })
    json(sourceFile, sourceFixture)

    // Set Electron paths before loading any product module, including its import-time stores.
    const launcher = path.join(root, "launch.cjs")
    writeFileSync(
        launcher,
        `const { app, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = ${JSON.stringify(root)};
for (const key of ['appData', 'userData', 'sessionData', 'documents', 'downloads', 'temp', 'logs', 'crashDumps', 'pictures', 'videos', 'music']) {
  const directory = path.join(root, key); fs.mkdirSync(directory, { recursive: true }); app.setPath(key, directory);
}
app.setAppPath(${JSON.stringify(appRoot)});
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
global.fetch = async () => { throw new Error('E2E network disabled'); };
const bonjourPath = require.resolve(${JSON.stringify(path.join(appRoot, "node_modules/bonjour-service"))});
require.cache[bonjourPath] = { id: bonjourPath, filename: bonjourPath, loaded: true, exports: class { find() { return { stop() {} }; } unpublishAll() {} destroy() {} } };
for (const protocol of ['node:http', 'node:https']) {
  require(protocol).globalAgent.createConnection = () => {
    const socket = new (require('node:net').Socket)();
    process.nextTick(() => socket.destroy(new Error('E2E network disabled')));
    return socket;
  };
}
require(${JSON.stringify(path.join(appRoot, "node_modules/electron-updater"))}).autoUpdater.checkForUpdatesAndNotify = async () => null;
app.on('ready', () => session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (_, callback) => callback({ cancel: true })));
require(${JSON.stringify(path.join(appRoot, "build/electron/index.js"))});
`
    )

    let app: ElectronApplication | undefined
    try {
        app = await electron.launch({
            args: [launcher, "--no-sandbox"],
            cwd: project,
            timeout: 30_000,
            env: { ...process.env, NODE_ENV: "production", FS_MOCK_STORE_PATH: store, TMPDIR: path.join(root, "temp") }
        })
        await expect.poll(() => app!.windows().find((window) => window.url().includes("index.html")), { timeout: 30_000 }).toBeTruthy()
        const window = app.windows().find((window) => window.url().includes("index.html"))!
        window.on("console", (message) => console.log("renderer:", message.text()))
        await expect(window.locator("#show_drawer").filter({ hasText: "Drop Target" })).toBeVisible({ timeout: 20_000 })
        const paths = await app.evaluate(({ app }) => ["userData", "sessionData", "documents", "downloads", "temp"].map((key) => app.getPath(key as any)))
        expect(paths.every((directory) => directory.startsWith(root + path.sep))).toBe(true)
        await window.locator("#show_drawer").filter({ hasText: "Drop Target" }).click()
        const slides = window.locator('#showArea .selectElem[id="slide"]')
        await expect(slides).toHaveCount(1)
        await window.locator("button.search").first().click()
        await window.locator("input.drawer_search").fill("Drop Source")
        const source = window.locator("#show_drawer").filter({ hasText: "Drop Source" })
        await expect(source).toHaveCount(1)
        // Start away from its button to keep the currently open target show selected.
        const from = (await source.boundingBox())!
        const to = (await window.locator("#showArea .droparea").last().boundingBox())!
        console.log(
            "E2E main:",
            window.url(),
            "drop target:",
            await window
                .locator("#showArea .droparea")
                .last()
                .evaluate((element) => ({ className: element.className, ancestors: element.parentElement?.className })),
            "bounds:",
            to
        )
        await window.mouse.move(from.x + 5, from.y + 5)
        await window.mouse.down()
        await window.mouse.move(to.x + to.width - 30, to.y + to.height - 80, { steps: 12 })
        await window.mouse.move(to.x + to.width - 20, to.y + to.height - 80)
        await window.mouse.up()
        await expect(slides).toHaveCount(3)
        await expect(slides.locator("button.notes span")).toHaveText(["Target original", "Source inserted", "Source second"])
        await window.screenshot({ path: testInfo.outputPath("show-inserted.png") })
        await window.locator("#showArea").click({ position: { x: 10, y: 10 } })
        await window.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z")
        await expect(slides).toHaveCount(1)
        expect(JSON.parse(readFileSync(sourceFile, "utf8"))).toEqual(sourceFixture)
    } finally {
        if (app) {
            const child = app.process()
            await Promise.race([app.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 5_000))])
            if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL")
        }
        rmSync(root, { recursive: true, force: true })
    }
})
