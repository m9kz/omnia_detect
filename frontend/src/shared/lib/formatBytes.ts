const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 Б'
    }

    const unitIndex = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1,
    )
    const value = bytes / 1024 ** unitIndex
    const formatter = new Intl.NumberFormat('uk-UA', {
        maximumFractionDigits: value >= 10 ? 0 : 1,
    })

    return `${formatter.format(value)} ${units[unitIndex]}`
}
