type UnknownMessage = {
  content?: unknown
  text?: unknown
  message?: unknown
  delta?: unknown
  choices?: unknown
}

const stringifyText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(stringifyText).filter(Boolean).join('\n')
  if (typeof value === 'object') return extractMessageText(value as UnknownMessage)
  return String(value)
}

export const extractMessageText = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value
    try {
      return extractMessageText(JSON.parse(trimmed))
    } catch {
      return value
    }
  }

  if (value == null) return ''

  if (Array.isArray(value)) {
    return value.map(extractMessageText).filter(Boolean).join('\n')
  }

  if (typeof value === 'object') {
    const message = value as UnknownMessage
    const direct = stringifyText(message.content) || stringifyText(message.text) || stringifyText(message.message) || stringifyText(message.delta)
    if (direct) return direct

    if (Array.isArray(message.choices)) {
      return message.choices.map(extractMessageText).filter(Boolean).join('\n')
    }

    return ''
  }

  return String(value)
}
