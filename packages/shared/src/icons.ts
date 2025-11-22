/* eslint-disable @stylistic/max-len */
/* eslint-disable @typescript-eslint/no-unused-vars */
interface SvgIcon {
  /**
   * 获取一个正方形svg图标
   * @param d 图标大小, 返回的svg元素宽高为 d * d
   * @param fill 图标填充色 默认 currentColor
   * @param stroke 图标线条色 默认 currentColor
   */
  (d?: number, fill?: string, stroke?: string): SVGElement
}
interface SvgIconHtml {
  /**
   * 获取一个正方形svg图标的html字符串
   * @param d 图标大小, 返回的svg元素宽高为 d * d
   * @param fill 图标填充色 默认 currentColor
   * @param stroke 图标线条色 默认 currentColor
   */
  (d?: number, fill?: string, stroke?: string): string
}

// const XMLNS = `xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`

const createSvgIcon = (html: string) => {
  const df = document.createRange().createContextualFragment(html/** .replaceAll('\n', '').trim() */)
  df.normalize()
  return df.firstElementChild as SVGElement
}
const C = 'currentColor'
export const editIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(editIconHtml(d, fill, stroke))
export const editIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>`
export const copyIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(copyIconHtml(d, fill, stroke))
export const copyIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`
export const gotoIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(gotoIconHtml(d, fill, stroke))
export const gotoIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><path d="m21 3-9 9"/><path d="M15 3h6v6"/></svg>`
export const chevronRightIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(chevronRightIconHtml(d, fill, stroke))
export const chevronRightIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 16 16" fill="none"><path stroke="${stroke}" stroke-width="1.32" stroke-linejoin="round" stroke-linecap="round" d="M6.33331 4L10.3333 8L6.33331 12"></path></svg>`
export const returnIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(returnIconHtml(d, fill, stroke))
export const returnIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/></svg>`
export const uploadIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(uploadIconHtml(d, fill, stroke))
export const uploadIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>`
export const downloadIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(downloadIconHtml(d, fill, stroke))
export const downloadIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>`
export const trashIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(trashIconHtml(d, fill, stroke))
export const trashIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`
export const repeatIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(repeatIconHtml(d, fill, stroke))
export const repeatIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`
export const undoIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(undoIconHtml(d, fill, stroke))
export const undoIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`
export const redoIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(redoIconHtml(d, fill, stroke))
export const redoIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>`
/* -------------------------------------------------------------------------- */
/*                                    popup                                   */
/* -------------------------------------------------------------------------- */
export const markdownIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(`<svg width="${d}" height="${d}" viewBox="0 0 20 20"><path fill="${fill}" d="M2.491 4.046a.75.75 0 0 1 .83.218L7 8.592l3.678-4.328A.75.75 0 0 1 12 4.75v9.5a.75.75 0 0 1-1.5 0V6.79l-2.929 3.446a.75.75 0 0 1-1.142 0L3.5 6.79v7.46a.75.75 0 0 1-1.5 0v-9.5a.75.75 0 0 1 .491-.704M13.22 11.72a.75.75 0 0 1 1.06 0l.72.72V4.75a.75.75 0 0 1 1.5 0v7.69l.72-.72a.75.75 0 1 1 1.06 1.06l-2 2a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 0-1.06"></path></svg>`)
export const copyDocIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(`<svg width="${d}" height="${d}" viewBox="0 0 24 24"><path fill="${fill}" d="M7 6V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3v3c0 .552-.45 1-1.007 1H4.007A1 1 0 0 1 3 21l.003-14c0-.552.45-1 1.006-1zM5.002 8L5 20h10V8zM9 6h8v10h2V4H9zm-2 5h6v2H7zm0 4h6v2H7z"></path></svg>`)
export const clearFormatIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(`<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"/><path d="m5.082 11.09 8.828 8.828"/></svg>`)
export const alignLeftIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(alignLeftIconHtml(d, fill, stroke))
export const alignLeftIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 16 16" fill="none"><rect x="4.82" y="5.66" width="9.32" height="4.66" stroke="${stroke}" stroke-width="1.32" stroke-linejoin="round" ></rect><path stroke="${stroke}" stroke-width="1.32" stroke-linejoin="round" stroke-linecap="round" d="M2.16669 2L2.16669 14"></path></svg>`
export const alignCenterIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(alignCenterIconHtml(d, fill, stroke))
export const alignCenterIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 16 16" fill="none"><rect x="2.32" y="5.66" width="11.32" height="4.66" stroke="${stroke}" stroke-width="1.32" stroke-linejoin="round" ></rect><path stroke="${stroke}" stroke-width="1.32" stroke-linejoin="round" stroke-linecap="round" d="M8 2L8 14"></path></svg>`
export const alignRightIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(alignRightIconHtml(d, fill, stroke))
export const alignRightIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 16 16" fill="none"><rect x="2" y="5.66" width="9.32" height="4.66" stroke="${stroke}" stroke-width="1.32" stroke-linejoin="round" ></rect><path stroke="${stroke}" stroke-width="1.32" stroke-linejoin="round" stroke-linecap="round" d="M14 2L14 14"></path></svg>`
export const fullScreenIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(fullScreenIconHtml(d, fill, stroke))
export const fullScreenIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="8" x="7" y="8" rx="1"/></svg>`
/* -------------------------------------------------------------------------- */
/*                                 rich text                                  */
/* -------------------------------------------------------------------------- */
export const h1Icon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(h1IconHtml(d, fill, stroke))
export const h1IconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`
export const h2Icon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(h2IconHtml(d, fill, stroke))
export const h2IconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`
export const h3Icon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(h3IconHtml(d, fill, stroke))
export const h3IconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>`
export const h4Icon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(h4IconHtml(d, fill, stroke))
export const h4IconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18V6"/><path d="M17 10v3a1 1 0 0 0 1 1h3"/><path d="M21 10v8"/><path d="M4 12h8"/><path d="M4 18V6"/></svg>`
export const h5Icon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(h5IconHtml(d, fill, stroke))
export const h5IconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 13v-3h4"/><path d="M17 17.7c.4.2.8.3 1.3.3 1.5 0 2.7-1.1 2.7-2.5S19.8 13 18.3 13H17"/></svg>`
export const h6Icon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(h6IconHtml(d, fill, stroke))
export const h6IconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><circle cx="19" cy="16" r="2"/><path d="M20 10c-2 2-3 3.5-3 6"/></svg>`
/* ---------------------------------- inline rich ---------------------------------- */
export const italicIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(italicIconHtml(d, fill, stroke))
export const italicIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>`
export const boldIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(boldIconHtml(d, fill, stroke))
export const boldIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/></svg>`
export const strikeThroughIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(strikeThroughIconHtml(d, fill, stroke))
export const strikeThroughIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>`
export const inlineCodeIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(inlineCodeIconHtml(d, fill, stroke))
export const inlineCodeIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>`
export const highlightIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(highlightIconHtml(d, fill, stroke))
export const highlightIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>`
export const linkIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(linkIconHtml(d, fill, stroke))
export const linkIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`
/* ------------------------------- block rich ------------------------------- */
export const orderedListIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(orderedListIconHtml(d, fill, stroke))
export const orderedListIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5h10"/><path d="M11 12h10"/><path d="M11 19h10"/><path d="M4 4h1v5"/><path d="M4 9h2"/><path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"/></svg>`
export const unorderedListIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(unorderedListIconHtml(d, fill, stroke))
export const unorderedListIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/></svg>`
export const checkedListIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(checkedListIconHtml(d, fill, stroke))
export const checkedListIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><rect x="3" y="4" width="6" height="6" rx="1"/></svg>`
export const codeBlockIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(codeBlockIconHtml(d, fill, stroke))
export const codeBlockIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 16 16" fill="none"><path stroke="${stroke}" stroke-width="1.32" stroke-linejoin="round" stroke-linecap="round" d="M5.33331 4.33333L1.33331 8.4774L5.33331 12.3333"></path><path stroke="${stroke}" stroke-width="1.32" stroke-linejoin="round" stroke-linecap="round" d="M10.6667 4.33333L14.6667 8.4774L10.6667 12.3333"></path><path stroke="${stroke}" stroke-width="1.32"  stroke-linecap="round" d="M9.33333 1.33333L7 14.6667"></path></svg>`
export const mathBlockIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(mathBlockIconHtml(d, fill, stroke))
export const mathBlockIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>`
export const quoteBlockIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(quoteBlockIconHtml(d, fill, stroke))
export const quoteBlockIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>`
export const blockIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(blockIconHtml(d, fill, stroke))
export const blockIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg>`
export const imageFileIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(imageFileIconHtml(d, fill, stroke))
export const imageFileIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><circle cx="10" cy="12" r="2"/><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"/></svg>`
export const audioFileIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(audioFileIconHtml(d, fill, stroke))
export const audioFileIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 22h.5a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M2 19a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0"/></svg>`
export const videoFileIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(videoFileIconHtml(d, fill, stroke))
export const videoFileIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><rect width="8" height="6" x="2" y="12" rx="1"/><path d="m10 13.843 3.033-1.755a.645.645 0 0 1 .967.56v4.704a.645.645 0 0 1-.967.56L10 16.157"/></svg>`
export const imageIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(imageIconHtml(d, fill, stroke))
export const imageIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`
export const audioIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(audioIconHtml(d, fill, stroke))
export const audioIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>`
export const videoIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(videoIconHtml(d, fill, stroke))
export const videoIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`
export const tableIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(tableIconHtml(d, fill, stroke))
export const tableIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>`
export const rowInsertTopIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(rowInsertTopIconHtml(d, fill, stroke))
export const rowInsertTopIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24"><path fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 18v-4a1 1 0 011-1h14a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1m8-8V4M9 7h6"></path></svg>`
export const rowInsertBottomIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(rowInsertBottomIconHtml(d, fill, stroke))
export const rowInsertBottomIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24"><path fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 6v4a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h14a1 1 0 011 1m-8 8v6m3-3H9"></path></svg>`
export const colInsertLeftIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(colInsertLeftIconHtml(d, fill, stroke))
export const colInsertLeftIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24"><path fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M14 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V5a1 1 0 011-1M4 12h6M7 9v6"></path></svg>`
export const colInsertRightIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(colInsertRightIconHtml(d, fill, stroke))
export const colInsertRightIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24"><path fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 4h4a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1m8 8h6m-3-3v6"></path></svg>`
export const rowDeleteBottomIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(rowDeleteBottomIconHtml(d, fill, stroke))
export const rowDeleteBottomIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24"><path fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 6v4a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h14a1 1 0 011 1M9 15l6 6m-6 0 6-6"></path></svg>`
export const colDeleteRightIcon: SvgIcon = (d = 16, fill = C, stroke = C) => createSvgIcon(colDeleteRightIconHtml(d, fill, stroke))
export const colDeleteRightIconHtml: SvgIconHtml = (d = 16, fill = C, stroke = C) => `<svg width="${d}" height="${d}" viewBox="0 0 24 24"><path fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 4h4a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1m9 5 6 6m-6 0 6-6"></path></svg>`
