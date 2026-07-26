type UnknownMessage = {
  id?: unknown
  role?: unknown
  content?: unknown
  text?: unknown
  message?: unknown
  delta?: unknown
  choices?: unknown
  messages?: unknown
  candidates?: unknown
  parts?: unknown
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

    if (Array.isArray(message.messages)) {
      return message.messages.map(extractMessageText).filter(Boolean).join('\n')
    }

    return ''
  }

  return String(value)
}

export const extractAIContent = (response: unknown): string => {
  if (typeof response === 'string') {
    const trimmed = response.trim()
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return response
    try {
      return extractAIContent(JSON.parse(trimmed))
    } catch {
      return response
    }
  }

  if (response == null) return ''

  if (Array.isArray(response)) {
    return response.map(extractAIContent).filter(Boolean).join('\n')
  }

  if (typeof response === 'object') {
    const payload = response as UnknownMessage & {
      choices?: Array<{ message?: unknown; delta?: unknown; text?: unknown }>
      content?: unknown
      message?: unknown
      delta?: unknown
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>
      parts?: Array<{ text?: unknown }>
    }

    const openAI = payload.choices?.map((choice) => extractAIContent(choice.message ?? choice.delta ?? choice.text)).filter(Boolean).join('\n')
    if (openAI) return openAI

    const anthropic = Array.isArray(payload.content) ? payload.content.map(extractAIContent).filter(Boolean).join('\n') : ''
    if (anthropic) return anthropic

    const gemini = payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => extractAIContent(part.text))
      .filter(Boolean)
      .join('\n')
    if (gemini) return gemini

    const parts = payload.parts?.map((part) => extractAIContent(part.text)).filter(Boolean).join('\n')
    if (parts) return parts

    const direct = extractAIContent(payload.content) || extractAIContent(payload.message) || extractAIContent(payload.delta) || extractMessageText(payload)
    return direct
  }

  return String(response)
}
