type Book = { number: number | string; name: string; abbreviation?: string }

// json-bible can't resolve Korean abbreviations ("창 1", "요일1:9") or book names with a digit inside ("요한1서 1:1"),
// so search those by the standard book id (or full name), and show the full book name in the search box
export function withKoreanBookSearch<T extends { autocompleted: string }>(search: (value: string) => T, books: Book[], ids: string[]) {
    return (value: string): T => {
        const match = findBook(value, books)
        if (!match) return search(value)

        const id = books.length === 66 ? ids[Number(match.book.number) - 1] : ""
        const result = search(`${id || match.book.name} ${match.rest}`)
        if (id) result.autocompleted = result.autocompleted.replace(id, match.book.name)
        return result
    }
}

// the reference with the full book name, for code that parses the search text itself (multi chapter references)
export function expandKoreanBook(value: string, books: Book[]) {
    const match = findBook(value, books)
    return match ? `${match.book.name} ${match.rest}` : value
}

function findBook(value: string, books: Book[]) {
    value = value.normalize("NFC")
    let match: { book: Book; rest: string } | null = null

    // only when a chapter follows, so typing "요" is not replaced before the user reaches "요일"
    const abbreviation = value.match(/^\s*([가-힣]+)\s*(\d.*)$/)
    const matching = abbreviation ? books.filter((a) => a.abbreviation?.normalize("NFC") === abbreviation[1] && a.name !== abbreviation[1]) : []
    if (abbreviation && matching.length === 1) match = { book: matching[0], rest: abbreviation[2] }

    value = value.trimStart()
    const book = match ? null : books.find((a) => /\p{L}\d/u.test(a.name) && value.startsWith(a.name) && /^\s*\d/.test(value.slice(a.name.length)))
    if (book) match = { book, rest: value.slice(book.name.length).trimStart() }

    // json-bible only finds a name with a digit ("요한1서") by its standard id, which it only allows with all 66 books
    if (match && /\d/.test(match.book.name) && books.length !== 66) return null
    return match
}
