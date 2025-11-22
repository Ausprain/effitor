/* eslint-disable @stylistic/max-statements-per-line */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Et } from '../@types'

/**
 * 为keydown/keyup事件创建一个按键处理映射器 \
 */
export const createKeyboardKeySolver = (solver: Et.KeyboardKeySolver) => solver
/**
 * 为beforeinput/input事件创建一个输入处理映射器 \
 */
export const createInputTypeSolver = (solver: Et.InputTypeSolver) => solver
/**
 * 创建自定义的html事件监听器表, 在effector中, 这些监听器会在编辑器默认监听器注册***之前***注册 \
 */
export const createHtmlEventSolver = (solver: Et.HTMLEventSolver) => solver
/**
 * 创建一个effector \
 */
export const createEffector = (effector: Et.Effector) => effector

/**
 * 合并多个插件的effector
 * @param effectors 插件注册的effector数组
 * @returns 一个合并之后的Effector
 */
export function solveEffectors(effectors: Et.Effector[]): Et.Effector {
  let solversMap = {} as Record<string, {
    solvers: any[]
    keys: Set<string>
  }>
  const singleEffector = {} as any
  // 遍历所有effector, 合并钩子和callback, 提取所有solver的key以正确添加default缺省值
  for (const etor of effectors) {
    for (const [name, val] of Object.entries(etor)) {
      // callback 直接添加到对应数组
      if (typeof val === 'function') {
        if (name in singleEffector) {
          singleEffector[name].push(val)
        }
        else {
          singleEffector[name] = [val]
        }
      }
      // solver 进行预解析, 将同类型的 Solver 的所有 key 提取出来
      else if (typeof val === 'object') {
        let solver
        if (!(solver = solversMap[name])) {
          solver = solversMap[name] = { solvers: [], keys: new Set() }
        }
        solver.solvers.push(val)
        Object.keys(val).forEach(k => solver.keys.add(k))
      }
    }
  }
  // 处理 callback 合并
  for (const [name, cbs] of Object.entries(singleEffector)) {
    singleEffector[name] = (...A: any) => { for (const cb of (cbs as Function[])) { if (cb(...A)) return true } }
  }
  // 处理 solver 合并
  for (const [name, solver] of Object.entries(solversMap)) {
    // Record<keyof Solver, Function[]>
    const solverFunsMap = solver.solvers.reduce((pre, cur) => {
      for (const key of solver.keys) {
        // effector自身未配置的key, 若有default, 则其他effector配置了的key, 都要添加这个default
        // 但效应元素特有 key 除外
        let fn = cur[key]
        if (!fn && !key.startsWith('et-')) {
          fn = cur.default
        }
        if (fn) {
          if (key in pre) {
            pre[key].push(fn)
          }
          else {
            pre[key] = [fn]
          }
        }
      }
      return pre
    }, {} as any)

    singleEffector[name] = Object.keys(solverFunsMap).reduce((pre, k) => {
      const funs = solverFunsMap[k] as Function[]
      pre[k] = (...A: any) => {
        for (const fn of funs) {
          if (fn(...A)) {
            return true
          }
        }
      }
      return pre
    }, {} as Record<string, (...A: any[]) => any>)
  }

  effectors = void 0 as any
  solversMap = void 0 as any
  return singleEffector
}
