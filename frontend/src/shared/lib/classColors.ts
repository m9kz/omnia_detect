const palette = ['#a481ec', '#51d0ff', '#ff8f6b', '#6fe6b4', '#ffd166', '#f26ca7']

export function getClassColor(className: string) {
    const seed = Array.from(className).reduce((sum, character) => sum + character.charCodeAt(0), 0)
    return palette[seed % palette.length]
}
