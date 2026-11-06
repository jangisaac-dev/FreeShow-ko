import { beforeEach, describe, expect, it, vi } from "vitest"
import { get } from "svelte/store"

const h = vi.hoisted(() => ({ entries: [] as any[], run: null as any }))
vi.mock("../../stores", async () => {
    const { writable } = await import("svelte/store")
    return { activeShow: writable({}), activeEdit: writable({}), activePage: writable({}), activeFocus: writable({}), focusMode: writable(false), activeProfile: writable(null), profiles: writable({}), showsCache: writable({}), shows: writable({}) }
})
vi.mock("../../../types/IPC/Main", () => ({ Main: vi.fn() }))
vi.mock("../../IPC/main", () => ({ requestMain: vi.fn(), sendMain: vi.fn() }))
vi.mock("../../audio/routing/audioRoutingInit", () => ({ removeOutputAudioChannel: vi.fn() }))
vi.mock("../../converters/project", () => ({ getProjectsInFolder: vi.fn() }))
vi.mock("../../show/slides", () => ({ breakLongLines: vi.fn(), removeItemValues: vi.fn() }))
vi.mock("../../utils/common", () => ({ newToast: vi.fn(), setStatus: vi.fn(), triggerFunction: vi.fn() }))
vi.mock("../../utils/language", () => ({ translateText: vi.fn() }))
vi.mock("../../utils/popup", () => ({ confirmCustom: vi.fn() }))
vi.mock("../../utils/save", () => ({ save: vi.fn() }))
vi.mock("../../utils/shortcutsHelper", () => ({ copyFromTextField: vi.fn(), cutFromTextField: vi.fn(), isFormField: vi.fn() }))
vi.mock("../../values/empty", () => ({ EMPTY_SHOW_SLIDE: vi.fn() }))
vi.mock("../actions/actions", () => ({ customActionActivation: vi.fn() }))
vi.mock("../context/menuClick", () => ({ removeSlide: vi.fn() }))
vi.mock("../drawer/timers/timers", () => ({ deleteTimer: vi.fn() }))
vi.mock("../edit/scripts/itemHelpers", () => ({ updateSortedStageItems: vi.fn() }))
vi.mock("../edit/scripts/textStyle", () => ({ getItemText: vi.fn(), setCaret: vi.fn() }))
vi.mock("./caretHelper", () => ({ pasteText: vi.fn() }))
vi.mock("./dropActions", () => ({ dropActions: vi.fn() }))
vi.mock("./historyHelpers", () => ({ _updaters: vi.fn() }))
vi.mock("./historyStores", () => ({ deleteStore: vi.fn() }))
vi.mock("./media", () => ({ getFileName: vi.fn(), removeExtension: vi.fn() }))
vi.mock("./output", () => ({ getItemsCountByType: vi.fn(), isEmptyOrSpecial: vi.fn(), mergeWithTemplate: vi.fn(), updateActiveSceneOutputs: vi.fn(), updateLayoutsFromTemplate: vi.fn(), updateSlideFromTemplate: vi.fn() }))
vi.mock("./select", () => ({ deselect: vi.fn(), select: vi.fn() }))
vi.mock("./setShow", () => ({ loadShows: vi.fn(), saveTextCache: vi.fn() }))
vi.mock("./showActions", () => ({ getItemWithMostLines: vi.fn() }))
vi.mock("./history", () => ({
    history: (entry: any) => {
        h.run(entry)
        h.entries.push(entry)
    }
}))
vi.mock("./show", async () => {
    const { _show } = await import("./shows")
    return { getLayoutRef: (id = "active") => _show(id).layouts("active").ref()[0] || [], removeTemplatesFromShow: (id: string) => _show(id).set({ key: "settings.template", value: null }) }
})
import { activeShow, activeEdit, activePage, activeFocus, focusMode, activeProfile, profiles, showsCache, shows } from "../../stores"
import { appendShowSlides } from "./clipboard"
import { validateDrop } from "./drop"
import { historyActions } from "./historyActions"
import { _show } from "./shows"
import { loadShows } from "./setShow"

const slide = (group: string | null, notes: string, children?: string[]) => ({ group, notes, children, color: null, settings: {}, items: [{ style: "", lines: [{ text: [{ value: notes }] }] }] })
const show = (slides: any, layout: any[], media = {}, template: string | null = null) => ({ name: "test", category: null, timestamps: { created: 1, modified: null, used: null }, settings: { activeLayout: "main", template }, meta: {}, slides, layouts: { main: { name: "", notes: "", slides: layout } }, media })

beforeEach(() => {
    h.entries.length = 0
    h.run = (obj: any) => historyActions({ obj }).SLIDES()
    activeShow.set({ id: "target" } as any)
    activeEdit.set({} as any)
    activePage.set("show")
    focusMode.set(false)
    activeFocus.set({} as any)
    activeProfile.set(null)
    profiles.set({} as any)
    shows.set({ target: {}, source: {} } as any)
    showsCache.set({
        target: show({ existing: slide("Target", "existing") }, [{ id: "existing" }], { bg: { path: "target.jpg" } }),
        source: show(
            { parent: slide("Verse", "parent notes", ["child"]), child: slide(null, "child notes"), unused: slide("Unused", "unused") },
            [
                { id: "parent", background: "bg", overlays: ["overlay"], children: { child: { background: "bg", audio: ["audio"], actions: { trigger: "action" } } } },
                { id: "parent", background: "bg", children: { child: { audio: ["audio"], disabled: true } } }
            ],
            { bg: { path: "source.jpg" }, audio: { path: "source.mp3" } },
            "source-template"
        )
    } as any)
    vi.mocked(loadShows).mockResolvedValue(undefined)
})

describe("show drawer slide drop", () => {
    it("accepts drawer shows in the slide area and at slide boundaries", () => {
        expect(validateDrop("slides", "show_drawer")).toBe(true)
        expect(validateDrop("slides", "show_drawer", true)).toBe(true)
    })
    it("copies active layout order, groups, notes and media without changing the source, then undoes and redoes once", async () => {
        const beforeSource = structuredClone(get(showsCache).source)
        const beforeTarget = structuredClone(get(showsCache).target)
        await appendShowSlides(["source"])
        const target = get(showsCache).target
        const ref = _show("target").layouts("active").ref()[0]
        expect(ref.map((r: any) => target.slides[r.id].notes)).toEqual(["existing", "parent notes", "child notes", "parent notes", "child notes"])
        expect(target.slides[ref[1].id].children).toEqual([ref[2].id])
        expect(target.slides[ref[3].id].children).toEqual([ref[4].id])
        expect(ref[1].data.overlays).toEqual(["overlay"])
        expect(ref[2].data.actions).toEqual({ trigger: "action" })
        expect(ref[4].data.disabled).toBe(true)
        expect(target.slides[ref[1].id].settings.template).toBeUndefined()
        expect(target.media.bg.path).toBe("target.jpg")
        expect(target.media[ref[1].data.background!].path).toBe("source.jpg")
        expect(target.media[ref[2].data.audio![0]].path).toBe("source.mp3")
        expect(get(showsCache).source).toEqual(beforeSource)
        expect(h.entries).toHaveLength(1)
        const inserted = structuredClone(target)
        const entry = h.entries[0]
        entry.oldData = structuredClone(entry.newData)
        entry.newData = null
        historyActions({ obj: entry, undo: true }).SLIDES()
        expect(get(showsCache).target.slides).toEqual(beforeTarget.slides)
        expect(get(showsCache).target.layouts).toEqual(beforeTarget.layouts)
        expect(get(showsCache).target.media).toEqual(beforeTarget.media)
        entry.newData = entry.oldData
        entry.oldData = null
        historyActions({ obj: entry, undo: false }).SLIDES()
        expect(get(showsCache).target.slides).toEqual(inserted.slides)
        expect(get(showsCache).target.layouts).toEqual(inserted.layouts)
        expect(get(showsCache).target.media).toEqual(inserted.media)
    })
    it("inserts at the requested boundary", async () => {
        await appendShowSlides(["source"], 0)
        expect(_show("target").layouts("active").ref()[0].slice(-1)[0]?.id).toBe("existing")
    })
    it("does nothing for an empty source", async () => {
        showsCache.update((cache) => {
            cache.source = show({}, []) as any
            return cache
        })
        await appendShowSlides(["source"])
        expect(h.entries).toHaveLength(0)
    })
    it("aborts when the target changes while loading", async () => {
        vi.mocked(loadShows).mockImplementationOnce(async () => {
            activeShow.set({ id: "other" } as any)
        })
        await appendShowSlides(["source"])
        expect(h.entries).toHaveLength(0)
    })
    it("copies multiple selected shows with colliding source slide IDs in a single operation", async () => {
        showsCache.update((cache) => {
            cache.second = structuredClone(cache.source)
            cache.second.slides.parent.notes = "second parent"
            cache.second.media.bg.path = "second.jpg"
            return cache
        })
        await appendShowSlides(["source", "second"])
        const target = get(showsCache).target
        const ref = _show("target").layouts("active").ref()[0]
        expect(ref.map((r) => target.slides[r.id].notes)).toEqual(["existing", "parent notes", "child notes", "parent notes", "child notes", "second parent", "child notes", "second parent", "child notes"])
        expect(target.media[ref[5].data.background!].path).toBe("second.jpg")
        expect(new Set(ref.map((r) => r.id)).size).toBe(9)
        expect(h.entries).toHaveLength(1)
    })
    it("allows copying a show into itself", async () => {
        await appendShowSlides(["target"])
        const ref = _show("target").layouts("active").ref()[0]
        expect(ref).toHaveLength(2)
        expect(ref[0].id).not.toBe(ref[1].id)
    })
    it("preserves an empty target's template and restores its content on undo", async () => {
        showsCache.update((cache) => {
            cache.target = show({}, [], {}, "target-template") as any
            return cache
        })
        await appendShowSlides(["source"])
        expect(get(showsCache).target.settings.template).toBe("target-template")
        const entry = h.entries[0]
        entry.oldData = entry.newData
        entry.newData = null
        historyActions({ obj: entry, undo: true }).SLIDES()
        expect(get(showsCache).target.slides).toEqual({})
        expect(get(showsCache).target.layouts.main.slides).toEqual([])
        expect(get(showsCache).target.media).toEqual({})
        expect(get(showsCache).target.settings.template).toBe("target-template")
    })
    it("adds independent groups after a target group when dropped between its children", async () => {
        showsCache.update((cache) => {
            cache.target.slides.existing.children = ["targetChild"]
            cache.target.slides.targetChild = slide(null, "target child")
            return cache
        })
        await appendShowSlides(["source"], 1)
        const ref = _show("target").layouts("active").ref()[0]
        expect(ref.slice(0, 2).map((r) => r.id)).toEqual(["existing", "targetChild"])
        expect(ref[2].type).toBe("parent")
    })
    it("aborts when the target layout changes while loading", async () => {
        vi.mocked(loadShows).mockImplementationOnce(async () => {
            showsCache.update((cache) => {
                cache.target.settings.activeLayout = "other"
                return cache
            })
        })
        await appendShowSlides(["source"])
        expect(h.entries).toHaveLength(0)
    })
    it("aborts when the target is locked while loading", async () => {
        vi.mocked(loadShows).mockImplementationOnce(async () => {
            showsCache.update((cache) => {
                cache.target.locked = true
                return cache
            })
        })
        await appendShowSlides(["source"])
        expect(h.entries).toHaveLength(0)
    })
    it("keeps explicit slide templates without promoting the source default above group or cover templates", async () => {
        showsCache.update((cache) => {
            cache.source.slides.parent.globalGroup = "verse"
            cache.source.slides.child.settings.template = "explicit-child-template"
            return cache
        })
        await appendShowSlides(["source"])
        const target = get(showsCache).target
        const ref = _show("target").layouts("active").ref()[0]
        expect(target.slides[ref[1].id].settings.template).toBeUndefined()
        expect(target.slides[ref[1].id].globalGroup).toBe("verse")
        expect(target.slides[ref[2].id].settings.template).toBe("explicit-child-template")
        expect(target.settings.template).toBeNull()
    })
    it.each(["global", "category"])("aborts when %s access becomes read-only while loading", async (level) => {
        showsCache.update((cache) => {
            cache.target.category = "target-category"
            return cache
        })
        profiles.set({ reader: { access: { shows: { [level === "global" ? "global" : "target-category"]: "read" } } } } as any)
        vi.mocked(loadShows).mockImplementationOnce(async () => {
            activeProfile.set("reader")
        })
        const before = structuredClone(get(showsCache).target)
        await appendShowSlides(["source"])
        expect(h.entries).toHaveLength(0)
        expect(get(showsCache).target).toEqual(before)
    })
    it("aborts when focus switches to a different show with the same layout name while loading", async () => {
        const before = structuredClone(get(showsCache))
        vi.mocked(loadShows).mockImplementationOnce(async () => {
            activeFocus.set({ id: "source" } as any)
            focusMode.set(true)
        })
        await appendShowSlides(["source"])
        expect(h.entries).toHaveLength(0)
        expect(get(showsCache)).toEqual(before)
    })
    it("does not append to activeShow when focus already displays another show", async () => {
        activeFocus.set({ id: "source" } as any)
        focusMode.set(true)
        await appendShowSlides(["source"])
        expect(h.entries).toHaveLength(0)
    })
})
