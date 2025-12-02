import { hotkey, platform } from 'effitor'
export const KEY_CONNECTOR = '+'
const commonKeymap = {
  [hotkey.create('KeyZ', hotkey.CtrlCmd)]: '撤回',
  [hotkey.create('KeyZ', hotkey.CtrlCmd | hotkey.Mod.Shift)]: '重做',

  ...(platform.isMac
    ? { }
    : { [hotkey.create('KeyY', hotkey.CtrlCmd)]: '重做' }
  ),
}
const defaultKeymap = {
  // [hotkey.create('KeyX', hotkey.CtrlCmd)]: '剪切',
  // [hotkey.create('KeyC', hotkey.CtrlCmd)]: '复制',
  // [hotkey.create('KeyV', hotkey.CtrlCmd)]: '粘贴',

  [hotkey.create('KeyA', hotkey.CtrlCmd)]: '逐级全选',
  ...commonKeymap,

  // 删除相关
  [hotkey.create('Backspace', hotkey.WordModifier)]: '向后删除单词',
  [hotkey.create('Delete', hotkey.WordModifier)]: '向前删除单词',
  [hotkey.create('Backspace', hotkey.LineModifier)]: '删除至行首',
  [hotkey.create('Delete', hotkey.LineModifier)]: '删除至行尾',
  // 插入相关
  [hotkey.create('Enter', hotkey.Mod.Shift)]: '插入换行',
  [hotkey.create('Enter', hotkey.CtrlCmd)]: '追加段落',
  [hotkey.create('Enter', hotkey.CtrlCmd | hotkey.Mod.Shift)]: '追加顶层段落',

  // 光标移动到行首, MacOS: cmd + left, Windows: alt + left
  [hotkey.create('ArrowLeft', hotkey.LineModifier)]: '光标到行首',
  [hotkey.create('ArrowRight', hotkey.LineModifier)]: '光标到行尾',

  [hotkey.create('ArrowUp', hotkey.CtrlCmd)]: '光标到页首',
  [hotkey.create('ArrowDown', hotkey.CtrlCmd)]: '光标到页尾',
  [hotkey.create('ArrowLeft', hotkey.WordModifier)]: '上一个单词',
  [hotkey.create('ArrowRight', hotkey.WordModifier)]: '下一个单词',

  // 选择
  [hotkey.create('ArrowUp', hotkey.Mod.Shift)]: '选择至上一行',
  [hotkey.create('ArrowDown', hotkey.Mod.Shift)]: '选择至下一行',
  [hotkey.create('ArrowUp', hotkey.CtrlCmd | hotkey.Mod.Shift)]: '选择至页首',
  [hotkey.create('ArrowDown', hotkey.CtrlCmd | hotkey.Mod.Shift)]: '选择至页尾',
  [hotkey.create('ArrowLeft', hotkey.WordModifier | hotkey.Mod.Shift)]: '选择至上一个单词',
  [hotkey.create('ArrowRight', hotkey.WordModifier | hotkey.Mod.Shift)]: '选择至下一个单词',
  [hotkey.create('ArrowLeft', hotkey.CtrlCmd | hotkey.Mod.Shift)]: '选择至行首',
  [hotkey.create('ArrowRight', hotkey.CtrlCmd | hotkey.Mod.Shift)]: '选择至行尾',
}
const markKeymap = {
  [hotkey.create('KeyI', hotkey.CtrlCmd)]: 'Italic',
  [hotkey.create('KeyB', hotkey.CtrlCmd)]: 'Bold',
  [hotkey.create('Backquote', hotkey.Mod.Ctrl)]: 'InlineCode',
  [hotkey.create('KeyD', hotkey.CtrlCmd)]: 'Strikethrough',
  [hotkey.create('KeyH', hotkey.CtrlCmd)]: 'Highlight',
}
const taboutKeymap = {
  [hotkey.create('Tab', 0)]: '跳出样式',
  [hotkey.create('Space*2' as 'Space', 0)]: '跳出最外层样式',
}
const keymap = {
  'default': defaultKeymap,
  'et-p': {
    [hotkey.create('/' as 'Slash', hotkey.CtrlCmd)]: '展开菜单',
    [hotkey.create('Tab', 0)]: '转为表格',
    ...markKeymap,
    ...defaultKeymap,
    // 移动相关
    [hotkey.create('ArrowUp', hotkey.Mod.AltOpt)]: '段落上移',
    [hotkey.create('ArrowDown', hotkey.Mod.AltOpt)]: '段落下移',
    // 移动拷贝
    [hotkey.create('ArrowUp', hotkey.Mod.AltOpt | hotkey.Mod.Shift)]: '段落复制上移',
    [hotkey.create('ArrowDown', hotkey.Mod.AltOpt | hotkey.Mod.Shift)]: '段落复制下移',
  },
  'et-mark': {
    ...taboutKeymap,
    ...defaultKeymap,
  },
  'et-tc': {
    [hotkey.create('Tab', 0)]: '下一列',
    ...markKeymap,
    [hotkey.create('ArrowUp', hotkey.Mod.AltOpt)]: '表行上移',
    [hotkey.create('ArrowDown', hotkey.Mod.AltOpt)]: '表行下移',
    // 移动拷贝
    [hotkey.create('ArrowUp', hotkey.Mod.AltOpt | hotkey.Mod.Shift)]: '表行复制上移',
    [hotkey.create('ArrowDown', hotkey.Mod.AltOpt | hotkey.Mod.Shift)]: '表行复制下移',

    [hotkey.create('Enter', hotkey.CtrlCmd)]: '向下插入行',
    [hotkey.create('Enter', hotkey.CtrlCmd | hotkey.Mod.Shift)]: '追加顶层段落',
    [hotkey.create('Tab', hotkey.Mod.Shift)]: '上一列',
    [hotkey.create('ArrowLeft', hotkey.Mod.Ctrl | hotkey.Mod.AltOpt)]: '左移列',
    [hotkey.create('ArrowRight', hotkey.Mod.Ctrl | hotkey.Mod.AltOpt)]: '右移列',
    [hotkey.create('KeyC', hotkey.Mod.AltOpt)]: '表格居中',
    [hotkey.create('KeyR', hotkey.Mod.AltOpt)]: '表格右对齐',
    [hotkey.create('KeyL', hotkey.Mod.AltOpt)]: '表格左对齐',
    [hotkey.create('KeyE', hotkey.Mod.AltOpt)]: '单元格等宽',
    ...commonKeymap,
  },
}

type KeyRoute = Record<string, KeyRouteInfo>
interface KeyRouteInfo {
  nextMods: string[]
  keys: KeyInfo[]
}
export interface KeyInfo {
  key: string
  title: string
}

/**
 * 生成所有可能的子集对
 * @param arr 输入数组
 * @param filter 可选的筛选函数，用于过滤不符合条件的子集对
 * @returns 所有可能的子集对数组
 */
function generateAllPicks<T>(arr: T[], filter?: (pick: T[], rest: T[]) => boolean): [T[], T[]][] {
  const n = arr.length
  const result: [T[], T[]][] = []

  // 遍历所有非空子集（mask 从 1 到 2^n - 1）
  for (let mask = 1; mask < (1 << n); mask++) {
    const pick: T[] = []
    const rest: T[] = []

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        pick.push(arr[i] as T)
      }
      else {
        rest.push(arr[i] as T)
      }
    }
    if (filter && !filter(pick, rest)) {
      continue
    }
    result.push([pick, rest]) // 每一项是 [pick, rest] 元组
  }

  return result
}
const solveKeymap = async (keymap: Record<string, string>) => {
  const routeMap: KeyRoute = {}
  for (const [k, n] of Object.entries(keymap)) {
    const parts = await hotkey.parseHotkey(k)
    const key = parts.pop()
    if (!key) {
      continue
    }
    if (parts.length === 0) {
      const route = routeMap[''] = routeMap[''] || {} as KeyRouteInfo
      route.nextMods = route.nextMods || []
      route.keys = route.keys || []
      route.keys.push({ key, title: n })
      continue
    }
    generateAllPicks(parts, (pick, rest) => {
      const routeName = pick.join(KEY_CONNECTOR)
      const route = routeMap[routeName] = routeMap[routeName] || {} as KeyRouteInfo
      route.nextMods = route.nextMods || []
      route.keys = route.keys || []
      route.nextMods.push(...(
        new Set(rest).difference(new Set(route.nextMods))
      ))
      if (rest.length === 0) {
        route.keys.push({ key, title: n })
      }
      return false
    })
  }
  return routeMap
}
const getKeyRoutes = async (): Promise<Record<string, KeyRoute>> => {
  const routes: Record<string, KeyRoute> = {}
  for (const [k, v] of Object.entries(keymap)) {
    routes[k] = await solveKeymap(v)
  }
  return routes
}

/**
 * @example
 * {
 *    'default': {
 *       'Alt': {
 *           nextMods: ['Shift'],
 *           Keys: [
 *             { key: 'ArrowDown', title: '段落下移' },
 *           ]
 *       },
 *       'Alt+Shift': {
 *           nextMods: [],
 *           Keys: [
 *             { key: 'ArrowDown', title: '段落复制下移' },
 *           ]
 *       }
 *    }
 * }
 */
export const KEY_ROUTES = await getKeyRoutes()
