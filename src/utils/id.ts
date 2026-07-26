import { nanoid } from 'nanoid'

export const createId = (prefix: string) => `${prefix}_${nanoid(12)}`

export const nowIso = () => new Date().toISOString()
