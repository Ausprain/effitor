/* eslint-disable @stylistic/max-statements-per-line */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Et } from '../@types'
import { dom, traversal } from '../utils'

/**
 * 为keydown/keyup事件创建一个按键处理映射器 \
 * 如果其所处的效应器effector是支持inline内联的, 则 \
 * 其中所有执行器(函数) 均不可直接引用外部变量/函数 \
 * 如需引用其他变量, 需使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export const createKeyboardKeySolver = (solver: Et.KeyboardKeySolver) => solver
/**
 * 为beforeinput/input事件创建一个输入处理映射器 \
 * 如果其所处的效应器effector是支持inline内联的, 则 \
 * 其中所有执行器(函数) 均不可直接引用外部变量/函数 \
 * 如需引用其他变量, 需使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export const createInputTypeSolver = (solver: Et.InputTypeSolver) => solver
/**
 * 创建自定义的html事件监听器表, 在effector中, 这些监听器会在编辑器默认监听器注册之后注册 \
 * 如果其所处的效应器effector是支持inline内联的, 则 \
 * 其中所有执行器(函数) 均不可直接引用外部变量/函数 \
 * 如需引用其他变量, 需使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export const createHtmlEventSolver = (solver: Et.HTMLEventSolver) => solver
/**
 * 创建一个effector \
 * 若该effector是支持内联的(inline设置为true) 则 \
 * 其中所有执行器(函数) 均不可直接引用外部变量/函数 \
 * 如需引用其他变量, 需使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export const createEffector = (effector: Et.Effector) => effector

export const effectorContext = {
  /** dom 工具 {@link dom} */
  dom,
  /** dom 树遍历工具 {@link traversal} */
  traversal,
  createKeyboardKeySolver,
  createInputTypeSolver,
  createHtmlEventSolver,
  createEffector: (
    effector: Et.Effector,
  ): Et.EffectorSupportInline => Object.assign(effector, { inline: true as const }),
}

export type IEctx<K extends string, V> = Readonly<Record<K, V>>
export type EffectorContext<E extends IEctx<string, any>> = E & typeof effectorContext

/**
 * 获取携带相关信息的effector上下文对象, 该对象会在effector的solver处理函数和callback中通过第三个参数传入
 * * 仅支持内联的效应器需要此上下文
 * * 效应器上下文(ectx)和插件上下文(ctx.pctx)的区别是, 效应器上下文是全局的(所有编辑器实例共享),
 *   而插件上下文是局部的(每个编辑器实例的上下文 ctx 独有)
 * @example
    ```ts
    // case: mark effector
    import { markState } from './config'
    import { etcode } from '@/effitor/element';
    // _ectx 背后指向的是一个编辑器全局对象
    const _ectx = useEffectorContext('mark', { markState })
    // 通过指定泛型, 让 ts 推断回调函数中参数 ectx 的类型
    const markEffector: Et.EffectorSupportInline<typeof _ectx> = {
        inline: true,
        keydownSolver: {
            Enter: (ev, ctx, ectx) => {
                // 注意此 ectx 是参数列表里的，不要引用当前函数作用域外的 _ectx
                // 此处若调用除此作用域以外的变量, 将导致异常
                // if (markState.temp) {  // error
                if (ectx.mark.markState.temp) {
                    ... // delete this temp mark element
                }
            }
        }
    }
    ```
    * 多个useEffectorContext获取的上下文对象是同一个对象, 后来者相同作用域内的同路径内容会将前者覆盖
    ```ts
    // file1.ts
    const ectx = useEffectorContext('some', { foo, gnn })
    // file2.ts
    const ectx = useEffectorContext('some', { bar, gnn })  // here 'gnn' will override 'gnn' in file1.ts
    ectx.some.foo  // exists, but ts doesn't think so.
    ```
 * @param scope 上下文作用域名
 * @param init 上下文内容
 * @returns effector上下文对象, 可用其创建effector或solver
 */
export const useEffectorContext = <
  N extends string,
  T extends object,
>(scope: N, init: T): EffectorContext<IEctx<N, T>> => {
  const ectx = effectorContext as EffectorContext<IEctx<N, T>>
  const namespace = ectx[scope]
  if (namespace) {
    Object.assign(namespace, init)
  }
  else {
    ectx[scope] = init as EffectorContext<IEctx<N, T>>[N]
  }

  return ectx
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
>(name: N, init: T, caretor: (ectx: EffectorContext<IEctx<N, T>>) => R): R => {
  return caretor(useEffectorContext(name, init))
}

/**
 * 合并多个插件的effector
 * @param effectors 插件注册的effector数组
 * @param inline 是否采用内联方式合并
 * @returns 一个合并之后的Effector
 */
export function solveEffectors(effectors: Et.Effector[], inline: boolean): Et.Effector {
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
    // 启用内联时, 使用 new Function 构造内敛函数
    if (inline) {
      try {
        // 使用 new Function 构造内敛函数
        // callback 返回 true 终止后续插件的同类行为
        const fnstr = `(...A)=>{${(cbs as Function[]).map(f => `if((${f.toString()})(...A)) return true;`).join('\n')}}`
        // singleEffector[name] = eval(fnstr)
        singleEffector[name] = new Function(`return ${fnstr}`)()
      }
      catch (e) {
        throw Error(`启用Effector内联时 其Callback只能使用箭头函数, 并禁止使用 import.meta . ${e}`)
      }
    }
    // 不启用内联, 则使用数组局部变量存储相关回调
    else {
      singleEffector[name] = (...A: any) => { for (const cb of (cbs as Function[])) { if (cb(...A)) return true } }
    }
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

    if (inline) {
      singleEffector[name] = Object.keys(solverFunsMap).reduce((pre, k) => {
        const funs = solverFunsMap[k] as Function[]
        try {
          // 返回 true, 终止后续solver
          const fnstr = `(...A)=>{${funs.map(f => `if((${f.toString()})(...A)) return true;`).join('\n')}}` // jsperf in chrome 多次测试, 此种写法性能最优
          // pre[k] = eval(fnstr)
          pre[k] = new Function(`return ${fnstr}`)()
        }
        catch (e) {
          // console.log(name, k, funs.map(f => `if((${f.toString()})(...A)) return`).join('\n'))
          // console.error(e)
          throw Error(`启用Effector内联时 其Solver只能使用箭头函数, 并禁止使用 import.meta . ${e}`)
        }
        return pre
      }, {} as Record<string, (...A: any[]) => any>)
    }
    else {
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
  }

  effectors = void 0 as any
  solversMap = void 0 as any
  return singleEffector
}
