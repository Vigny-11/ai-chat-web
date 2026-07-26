import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true,
})

export const renderMarkdown = (content: string) => {
  const html = marked.parse(content, { async: false }) as string
  return DOMPurify.sanitize(html)
}
