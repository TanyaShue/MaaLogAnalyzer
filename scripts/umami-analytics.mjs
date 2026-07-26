const UMAMI_SCRIPT_SRC = 'https://cloud.umami.is/script.js'
const UMAMI_WEBSITE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export { UMAMI_SCRIPT_SRC }

/**
 * 解析要注入的 Umami website id，未配置时返回 null。
 *
 * 远程脚本只允许出现在浏览器构建里：Tauri 特权 shell 的 CSP 会拦下它，而 webview
 * 中的脚本能触达 IPC 与文件系统命令（见 30fd9bb）。因此这里默认不注入，必须由
 * 部署流程显式提供 id 才启用，并在检测到 Tauri 构建环境时强制跳过。
 */
export const resolveUmamiWebsiteId = (env) => {
  if (env.TAURI_ENV_PLATFORM || env.TAURI_DEV_HOST) return null

  const websiteId = env.MLA_UMAMI_WEBSITE_ID?.trim()
  if (!websiteId) return null
  if (!UMAMI_WEBSITE_ID_PATTERN.test(websiteId)) {
    throw new Error('MLA_UMAMI_WEBSITE_ID must be a UUID')
  }
  return websiteId
}
