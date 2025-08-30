/* eslint-disable @stylistic/max-statements-per-line */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Et } from '~/core/@types'

import { etcode } from '../element/etcode'
import { cr } from '../selection/cr'
import { dom } from '../utils/dom'

/**
 * 为keydown/keyup事件创建一个按键处理映射器 \
 * 如果其所处的效应器effector是支持inline内联的, 则 \
 * 其中所有执行器(函数) 均不可直接引用外部变量/函数, (除了从effitor导出的全局工具: `etcode, dom, cr`), \
 * {@link etcode}, {@link dom}, {@link cr} \
 * 如需引用其他变量, 需使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export const createKeyboardKeySolver = (solver: Et.KeyboardKeySolver) => solver
/**
 * 为beforeinput/input事件创建一个输入处理映射器 \
 * 如果其所处的效应器effector是支持inline内联的, 则 \
 * 其中所有执行器(函数) 均不可直接引用外部变量/函数, (除了从effitor导出的全局工具: `etcode, dom, cr`), \
 * {@link etcode}, {@link dom}, {@link cr} \
 * 如需引用其他变量, 需使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export const createInputTypeSolver = (solver: Et.InputTypeSolver) => solver
/**
 * 创建自定义的html事件监听器表, 在effector中, 这些监听器会在编辑器默认监听器注册之后注册 \
 * 如果其所处的效应器effector是支持inline内联的, 则 \
 * 其中所有执行器(函数) 均不可直接引用外部变量/函数, (除了从effitor导出的全局工具: `etcode, dom, cr`), \
 * {@link etcode}, {@link dom}, {@link cr} \
 * 如需引用其他变量, 需使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export const createHtmlEventSolver = (solver: Et.HTMLEventSolver) => solver
/**
 * 创建一个effector \
 * 若该effector是支持内联的(inline设置为true) 则 \
 * 其中所有执行器(函数) 均不可直接引用外部变量/函数, (除了从effitor导出的全局工具: `etcode, dom, cr`), \
 * {@link etcode}, {@link dom}, {@link cr} \
 * 如需引用其他变量, 需使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export const createEffector = (effector: Et.Effector) => effector

export const effectorContext = {
  createKeyboardKeySolver,
  createInputTypeSolver,
  createHtmlEventSolver,
  createEffector: (
    effector: Et.Effector,
  ): Et.EffectorSupportInline => Object.assign(effector, { inline: true as const }),
}

type EffectorContext<K extends string, V extends object> = Record<K, V> & typeof effectorContext

/**
 * 获取携带相关信息的effector上下文对象, 该对象可在effector的solver和callback
 * 中引用, 但必须使用`ectx`作为其标识符, 使用其他名字将导致异常
 * @example
    ```ts
    // case: mark effector
    import { markState } from './config'
    import { etcode } from '@/effitor/element';
    const ectx = useEffectorContext('mark', { markState })
    const markEffector: Et.Effector = {
        keydownSolver: {
            Enter: (ev, ctx) => {
                // 此处若调用除此作用域以及ectx外的变量, 将导致异常
                // if (markState.temp) {  // error
                if (ectx.mark.markState.temp) {
                    ... // delete this temp mark element
                }
            }
        }
    }
    ```
    多个useEffectorContext获取的上下文对象不相关联, 且后来者会将前者覆盖
    ```ts
    // file1.ts
    const ectx = useEffectorContext('some', { foo })
    // file2.ts
    const ectx = useEffectorContext('some', { bar })
    ectx.some.foo  // error, no foo in ectx;
    // 但实际上只要file1.ts执行了, 那么foo是存在于ectx的some作用域内的
    // 在确定情况下, 可禁用其ts警告; 或者在init对象中重新指定 foo
    ```
 * @param name 上下文作用域名
 * @param init 上下文内容
 * @returns effector上下文对象, 可用其创建effector或solver
 */
export const useEffectorContext = <
  N extends string,
  T extends object,
>(name: N, init: T): EffectorContext<N, T> => {
  const ectx = effectorContext
  const namespace = Reflect.get(ectx, name)
  if (namespace) {
    Object.assign(namespace, init)
  }
  else {
    Reflect.set(ectx, name, init)
  }

  return ectx as EffectorContext<N, T>
}

/**
 * 配置effector上下文, 并使用该上下文创建一个effector或solver
 * @param name 上下文作用域名
 * @param init 上下文内容
 * @param caretor 创建器, 有一个参数(标识符必须是ectx), 可访问该作用域下的内容,
 * 并创建effector或solver; 此方法必须返回一个effector或solver
 * @returns 一个effector或solver, 即creator的返回值
 */
export const withEffectorContext = <
  N extends string,
  T extends object,
  R extends Et.Effector | Et.Solver,
>(name: N, init: T, caretor: (ectx: EffectorContext<N, T>) => R): R => {
  return caretor(useEffectorContext(name, init))
}

/**
 * 合并多个插件的effector
 * @param effectors 插件注册的effector数组
 * @param inline 是否采用内联方式合并
 * @returns 一个合并之后的Effector
 */
export function solveEffectors(effectors: Et.Effector[], inline: boolean): Et.Effector {
  const ectx = effectorContext
  let solversMap = {} as Record<string, {
    solvers: any[]
    keys: Set<string>
  }>
  const singleEffector = {} as any
  // 遍历所有effector, 合并钩子和callback, 提取所有solver的key, 为了正确添加default缺省值
  for (const etor of effectors) {
    for (const [name, val] of Object.entries(etor)) {
      if (typeof val === 'function') {
        if (singleEffector[name]) {
          singleEffector[name].push(val)
        }
        else {
          singleEffector[name] = [val]
        }
      }
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
  for (const [name, cbs] of Object.entries(singleEffector)) {
    if (inline) {
      try {
        // 使用 new Function 构造内敛函数
        const fnstr = name.startsWith('on')
          // onMounted, onBeforeUnmount 没有返回 true终止后续的特性
          ? `(...args)=>{${(cbs as Function[]).map(f => `(${f.toString()})(...args);`).join('\n')}}`
          // 其他 callback 返回 true 终止后续插件的同类行为
          : `(...args)=>{${(cbs as Function[]).map(f => `if((${f.toString()})(...args)) return`).join('\n')}}`
        // singleEffector[name] = eval(fnstr)
        singleEffector[name] = new Function(`return (ectx, cr, dom, etcode) => ${fnstr}`)()(ectx, cr, dom, etcode)
      }
      catch {
        throw Error('启用Effector内联时 其Callback只能使用箭头函数, 并禁止使用 import.meta .')
      }
    }
    else {
      singleEffector[name] = name.startsWith('on')
        ? (...args: any) => { for (const cb of (cbs as Function[])) { cb(...args) } }
        : (...args: any) => { for (const cb of (cbs as Function[])) { if (cb(...args)) return } }
    }
  }
  for (const [name, solver] of Object.entries(solversMap)) {
    const solverFunsMap = solver.solvers.reduce((pre, cur) => {
      for (const key of solver.keys) {
        const fn = cur[key] ?? cur.default // effector自身未配置的key, 若有default, 则其他effector配置了的key, 都要添加这个default
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

    if (inline) {
      singleEffector[name] = Object.keys(solverFunsMap).reduce((pre, k) => {
        const funs = solverFunsMap[k] as Function[]
        try {
          // 返回 true, 终止后续solver
          const fnstr = `(...args)=>{${funs.map(f => `if((${f.toString()})(...args)) return`).join('\n')}}` // jsperf in chrome 多次测试, 此种写法性能最优
          // pre[k] = eval(fnstr)
          pre[k] = new Function(`return (ectx, cr, dom, etcode) => ${fnstr}`)()(ectx, cr, dom, etcode)
        }
        catch (e) {
          // console.log(name, k, funs.map(f => `if((${f.toString()})(...args)) return`).join('\n'))
          // console.error(e)
          throw Error(`启用Effector内联时 其Solver只能使用箭头函数, 并禁止使用 import.meta . ${e}`)
        }
        return pre
      }, {} as Record<string, (...args: any[]) => any>)
    }
    else {
      singleEffector[name] = Object.keys(solverFunsMap).reduce((pre, k) => {
        const funs = solverFunsMap[k] as Function[]
        pre[k] = (...args: any) => {
          for (const fn of funs) {
            if (fn(...args)) {
              return
            }
          }
        }
        return pre
      }, {} as Record<string, (...args: any[]) => any>)
    }
  }

  effectors = void 0 as any
  solversMap = void 0 as any
  return singleEffector
}
