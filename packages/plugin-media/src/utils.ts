import { MediaEnum, MediaUrlMetadata } from './config'

/** 解析媒体内容的src */
export const parseMediaUrl = (url: string) => {
  if (url.startsWith('data:')) {
    const ext = url.split('/')[1].split(';')[0]
    return {
      path: url,
      fileName: '',
      ext: ext ?? '',
      query: '',
      hash: '',
    }
  }
  const [path, queryAndHash] = url.split('?')
  const [query, hash] = queryAndHash?.split('#') ?? ['', '']
  const fileName = path?.split('/').pop()
  return {
    path: path ?? '',
    fileName: fileName ?? '',
    ext: fileName?.split('.').pop() ?? '',
    query,
    hash,
  }
}
/** 解析url中的?参数, 返回键值对 */
const parseQuery = (queryString: string) => {
  return queryString.split('&').reduce((acc, cur) => {
    const [key, value] = cur.split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)
}
/** 从url中查询指定query参数的值, 不存在返回undefined */
// const getQueryFromUrl = (url: string, queryName: string) => {
//   const query = parseMediaUrl(url).query
//   if (query) {
//     return parseQuery(query)[queryName]
//   }
//   return void 0
// }
/** 添加一个query键值对到url, 并返回新的url */
const addQueryToUrl = (url: string, query: Record<string, string>) => {
  const [path, queryAndHash] = url.split('?')
  let hash = ''
  if (queryAndHash) {
    const [queryString, hashString] = queryAndHash.split('#')
    const newQuery = queryAndHash ? parseQuery(queryString) : {}
    query = Object.assign(newQuery, query)
    if (hashString) {
      hash = '#' + hashString
    }
  }
  return path + '?' + Object.entries(query).map(([key, value]) => key + '=' + value).join('&') + hash
}
export const getMediaSrcWithMetadata = (url: string, data: MediaUrlMetadata, encode = true) => {
  if (url.startsWith('data:')) {
    return url
  }
  return encode
    ? encodeURI(addQueryToUrl(url, {
        [MediaEnum.UrlMeta]: encodeURIComponent(JSON.stringify(data)),
      }))
    : addQueryToUrl(url, {
        [MediaEnum.UrlMeta]: encodeURIComponent(JSON.stringify(data)),
      })
}

export const initMediaElementSrc = (
  el: HTMLImageElement | HTMLAudioElement | HTMLVideoElement,
  src: string | Promise<string>,
  meta: MediaUrlMetadata,
) => {
  if (typeof src === 'string') {
    el.src = getMediaSrcWithMetadata(src, meta)
  }
  else {
    src.then((src) => {
      el.src = getMediaSrcWithMetadata(src, meta)
    })
  }
}
