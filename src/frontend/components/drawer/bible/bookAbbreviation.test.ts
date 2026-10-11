import JsonBible from "json-bible"
import { getDefaultBooks } from "json-bible/lib/defaults"
import { describe, expect, it } from "vitest"
import { expandKoreanBook, withKoreanBookSearch } from "./bookAbbreviation"

const korean: { [number: number]: [string, string] } = { 1: ["창세기", "창"], 43: ["요한복음", "요"], 45: ["로마서", "롬"], 62: ["요한1서", "요일"] }
const verses = [1, 2, 3].map((number) => ({ number, text: "-" }))
const books = getDefaultBooks()
    .names.slice(0, 66)
    .map((name, i) => ({
        number: i + 1,
        name: korean[i + 1]?.[0] || name,
        abbreviation: korean[i + 1]?.[1],
        chapters: [1, 2].map((number) => ({ number, verses }))
    }))

describe("withKoreanBookSearch", async () => {
    const bible = await JsonBible({ name: "test", metadata: {}, books } as any)
    const search = withKoreanBookSearch(bible.bookSearch, books, getDefaultBooks().ids)

    it("finds a book by its Korean abbreviation", () => {
        expect(search("창 1")).toMatchObject({ book: 1, chapter: 1, autocompleted: "창세기 1" })
        expect(search("창 1:1-3")).toMatchObject({ book: 1, chapter: 1, verses: [1, 2, 3], autocompleted: "창세기 1:1-3" })
        expect(search("창1:2")).toMatchObject({ book: 1, chapter: 1, verses: [2] })
        expect(search("요 2:3")).toMatchObject({ book: 43, chapter: 2, verses: [3] })
        expect(search("롬 2")).toMatchObject({ book: 45, chapter: 2 })
    })

    it("finds books with a digit inside the name", () => {
        expect(search("요일 1:2")).toMatchObject({ book: 62, chapter: 1, verses: [2], autocompleted: "요한1서 1:2" })
        expect(search("요한1서 2:1")).toMatchObject({ book: 62, chapter: 2, verses: [1], autocompleted: "요한1서 2:1" })
    })

    it("leaves other searches to json-bible", () => {
        expect(search("요")).toMatchObject({ autocompleted: "요" })
        expect(search("Exodus 2:1")).toMatchObject({ book: 2, chapter: 2, verses: [1] })
    })

    // json-bible can only find "요한1서" by its standard id, which needs all 66 books, so select nothing instead of 요한복음
    it("does not pick another book in a bible without all 66 books", async () => {
        const newTestament = books.slice(39)
        const nt = await JsonBible({ name: "nt", metadata: {}, books: newTestament } as any)
        const ntSearch = withKoreanBookSearch(nt.bookSearch, newTestament, getDefaultBooks().ids)

        expect(ntSearch("롬 2")).toMatchObject({ book: 45, chapter: 2 })
        expect(ntSearch("요일 1:1")).toMatchObject({ book: 0, chapter: 0, verses: [] })
    })
})

describe("expandKoreanBook", () => {
    it("writes the full book name for multi chapter references", () => {
        expect(expandKoreanBook("요일 1:1;2:1", books)).toBe("요한1서 1:1;2:1")
        expect(expandKoreanBook("Genesis 1:1;2:1", books)).toBe("Genesis 1:1;2:1")
    })
})
