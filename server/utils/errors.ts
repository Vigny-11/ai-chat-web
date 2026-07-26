export const toChineseError = (message: string) => {
  if (/401|unauthorized|invalid api key/i.test(message)) return 'API Key 无效'
  if (/404|model/i.test(message)) return '模型名称不存在或 API 请求路径不正确'
  if (/timeout|aborted/i.test(message)) return '请求超时'
  if (/insufficient|balance|quota/i.test(message)) return 'API 余额不足'
  if (/cors/i.test(message)) return '当前接口不支持跨域，请通过本地代理访问'
  if (/fetch failed|network|getaddrinfo|ECONNREFUSED|ENOTFOUND/i.test(message)) return 'Base URL 无法访问或网络连接失败'
  return message || '未知 API 错误'
}

export const maskSecrets = (value: string) => value.replace(/sk-[A-Za-z0-9_\-]{8,}/g, 'sk-****')
