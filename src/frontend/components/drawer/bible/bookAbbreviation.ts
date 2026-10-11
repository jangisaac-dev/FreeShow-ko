type Book = { number: number | string; name: string; abbreviation?: string }

// json-bible can't resolve Korean abbreviations ("창 1", "요일1:9") or book names with a digit inside ("요한1서 1:1"),
// so search those by the standard book id (or full name), and show the full book name in the search box
export function withKoreanBookSearch<T extends { autocompleted: string }>(search: (value: string) => T, books: Book[], ids: string[]) {
    return (value: string): T => {
        const match = findBook(value.normalize("NFC"), books)
        if (!match) return search(value)

        const id = books.length === 66 ? ids[Number(match.book.number) - 1] : ""
        const result = search(`${id || match.book.name} ${match.rest}`)
        if (id) result.autocompleted = result.autocompleted.replace(id, match.book.name)
        return result
    }
}

function findBook(value: string, books: Book[]) {
    // only when a chapter follows, so typing "요" is not replaced before the user reaches "요일"
    const abbreviation = value.match(/^\s*([가-힣]+)\s*(\d.*)$/)
    if (abbreviation) {
        const matching = books.filter((a) => a.abbreviation?.normalize("NFC") === abbreviation[1] && a.name !== abbreviation[1])
        if (matching.length === 1) return { book: matching[0], rest: abbreviation[2] }
    }

    value = value.trimStart()
    const book = books.find((a) => /\p{L}\d/u.test(a.name) && value.startsWith(a.name) && /^\s*\d/.test(value.slice(a.name.length)))
    return book ? { book, rest: value.slice(book.name.length).trimStart() } : null
}
