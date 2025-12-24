import { type Et, etcode } from '@effitor/core'
import { EtTypeEnum } from '@effitor/shared'

import type { HeadingPluginOptions } from '..'
import { HeadingEnum } from '../config'

export interface HeadingItem {
  el: Et.EtHeading
  /** 标题id，若对应元素无 id，则为空串 */
  id: string
  /** 标题内容，去掉零宽字符和前后空白 */
  name: string
  level: number
  /** 是否活跃（在当前标题链中） */
  active: boolean
}

export const getHeadingListenEffector = (options?: HeadingPluginOptions): Et.Effector => {
  const checkHideMarker = (ctx: Et.EditorContext) => {
    if (options?.hiddenHeadingLevelMarker) {
      ctx.bodyEl.classList.add(HeadingEnum.Class_HiddenMarker)
    }
  }

  const { onHeadingChainUpdated, onHeadingTreeUpdated } = options || {}

  if (!onHeadingChainUpdated && !onHeadingTreeUpdated) {
    return {
      onMounted: (ctx) => {
        checkHideMarker(ctx)
      },
    }
  }

  const enum Em {
    delay = 500,
  }
  let chainTimer = 0, treeTimer = 0, nameTimer = 0,
    focusHeading = false, needQuery = false, headingOb: IntersectionObserver
  const headingMap = new WeakMap<Et.EtHeading, HeadingItem>()
  const chainSet = new Set<Et.EtHeading>()
  let chainItems: HeadingItem[] = []
  let treeItems: HeadingItem[] = []

  const getLevel = (el: Et.EtHeading) => el.headingLevel || 1
  const getName = (el: Et.EtHeading) => el.textContent?.trim().replaceAll('\u200B', '') || ''
  const headingItem = (el: Et.EtHeading, active = false) => ({
    id: el.id || '',
    el,
    name: getName(el),
    level: getLevel(el),
    active: active || chainSet.has(el),
  })
  const updateHeadingChain = (ctx: Et.EditorContext, topEl: Et.Paragraph) => {
    clearTimeout(chainTimer)
    chainTimer = window.setTimeout(() => {
      chainSet.clear()
      let currLevel = 7
      while (topEl) {
        if (etcode.check(topEl, EtTypeEnum.Heading)) {
          const level = topEl.headingLevel
          if (level < currLevel) {
            chainSet.add(topEl)
            currLevel = level
          }
          if (level === 1) {
            break
          }
        }
        topEl = topEl.previousSibling as Et.Paragraph
      }
      if (onHeadingChainUpdated) {
        chainItems = [...chainSet.values()].reverse().map((el) => {
          const item = headingItem(el, true)
          headingMap.set(el, item)
          return item
        })
        onHeadingChainUpdated(chainItems)
      }
      updateHeadingTree(ctx)
    }, Em.delay)
  }
  const updateHeadingTree = (ctx: Et.EditorContext) => {
    if (!onHeadingTreeUpdated) {
      return
    }
    clearTimeout(treeTimer)
    treeTimer = window.setTimeout(() => {
      if (!needQuery) {
        onHeadingTreeUpdated(treeItems = treeItems.map(item => ({ ...item, active: chainSet.has(item.el) })))
        return
      }
      needQuery = false
      const items: HeadingItem[] = []
      for (const el of ctx.bodyEl.querySelectorAll(ctx.schema.heading.elName) as NodeListOf<Et.EtHeading>) {
        let active = true
        if (chainSet.has(el)) {
          const item = headingMap.get(el)
          if (item) {
            items.push(item)
            continue
          }
        }
        else {
          active = false
        }
        const item = headingItem(el, active)
        items.push(item)
        headingMap.set(el, item)
      }
      treeItems = items
      onHeadingTreeUpdated(items)
    }, Em.delay)
  }
  const updateHeadingName = (ctx: Et.EditorContext, hEl: Et.EtHeading) => {
    clearTimeout(nameTimer)
    nameTimer = window.setTimeout(() => {
      const item = headingMap.get(hEl)
      if (item) {
        item.name = getName(hEl)
        onHeadingChainUpdated?.(chainItems)
        onHeadingTreeUpdated?.(treeItems)
      }
      else {
        updateHeadingChain(ctx, hEl)
      }
    }, Em.delay)
  }

  return {
    afterInputSolver: {
      [HeadingEnum.ElName]: (_ev, ctx) => {
        updateHeadingName(ctx, ctx.commonEtElement)
      },
    },
    onTopElementChanged: (el, _, ctx) => {
      if (el && etcode.check(el, EtTypeEnum.Heading)) {
        focusHeading = true
        updateHeadingChain(ctx, el)
      }
      else {
        focusHeading = false
      }
    },
    onMounted: (ctx) => {
      checkHideMarker(ctx)

      headingOb = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !focusHeading) {
            updateHeadingChain(ctx, entry.target as Et.Paragraph)
          }
        }
      }, {
        root: ctx.body.scrollContainer === document.documentElement ? null : ctx.body.scrollContainer,
        // 在前 1/5 的位置划一横线, 与该横线相交的段落触发回调
        // 从该段落开始向上找标题, 构建标题链
        rootMargin: '-19.9% 0px -80% 0px',
      })
      const paragraphMutationObserver = new MutationObserver((records) => {
        for (const rd of records) {
          for (const nod of rd.addedNodes) {
            if (etcode.check(nod, EtTypeEnum.Paragraph)) {
              // console.log('heading added', nod)
              headingOb.observe(nod)
              if (etcode.check(nod, EtTypeEnum.Heading)) {
                needQuery = true
                updateHeadingTree(ctx)
              }
            }
          }
          for (const nod of rd.removedNodes) {
            if (etcode.check(nod, EtTypeEnum.Paragraph)) {
              // console.log('heading removed', nod)
              headingOb.unobserve(nod)
              if (etcode.check(nod, EtTypeEnum.Heading)) {
                needQuery = true
                updateHeadingTree(ctx)
              }
            }
          }
        }
      })
      paragraphMutationObserver.observe(ctx.bodyEl, {
        childList: true,
      })
    },
    onBeforeUnmount: () => {
      headingOb?.disconnect()
    },
  }
}
