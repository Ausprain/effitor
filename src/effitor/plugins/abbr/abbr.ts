import type { LowerLetter } from "@/effitor/@types"
import type { EtAbbrElement } from "./element"
import type { NotNullContext } from "./handler";
import { prefixTriggerChars, suffixTriggerChars, abbrContext, prefixAbbrDisplay, suffixAbbrDisplay } from './config';

type Letters = `${LowerLetter | Uppercase<LowerLetter>}`
export type AbbrName = `${Letters}${string}`

/**
 * 缩写符类型  
 * - 1: 前缀符
 * - 2: 后缀符
 * - 4: 块级符
 */
type AbbrType = 1 | 2 | 4

/**
 * 缩写符触发器, 若符合插入条件, 则添加插入命令并返回将会插入DOM的缩写符元素; 否则返回`null`  
 */
export type AbbrTrigger = (ctx: NotNullContext) => EtAbbrElement | null
/**
 * 缩写符触发回调, 由用户定义回调行为
 */
type AbbrTriggerHandler = (ctx: NotNullContext, trigger: AbbrTrigger) => void

/**
 * 缩写符的信息
 */
export type AbbrInfo = {
    display?: string
    description?: string
    onTrigger?: AbbrTriggerHandler
}

/**
 * 缩写符配置, 三个属性（1，2，4）分别对应（前缀，后缀，行级符）的信息  
 */
export type AbbrConfig = {
    1?: AbbrInfo,
    2?: AbbrInfo,
    4?: AbbrInfo,
}

type CreateAbbrOptions = {
    name: AbbrName,
    type: AbbrType,
    display: string,
    description: string
}

const triggerCharsCreators: Record<AbbrType, (name: AbbrName) => string> = {
    1: prefixTriggerChars,
    2: suffixTriggerChars,
    4: prefixTriggerChars
}

const abbrDisplayGetters: Record<AbbrType, (name: AbbrName) => string> = {
    1: prefixAbbrDisplay,
    2: suffixAbbrDisplay,
    4: prefixAbbrDisplay
}

export class Abbr implements CreateAbbrOptions {
    public readonly name: AbbrName
    public readonly type: AbbrType
    /**
     * 获取已经输入到DOM的触发字符串,  
     * 由于缩写符触发时仍在keydown里, 最后一个字符尚未且也不会被插入到DOM, 因此要排除触发串最后一个字符
     */
    public readonly inputedTriggerString: string
    public display: string
    public description: string
    public onTrigger: AbbrTriggerHandler

    constructor(options: CreateAbbrOptions, triggerHandler?: AbbrTriggerHandler) {
        this.name = options.name
        this.type = options.type
        this.display = options.display
        this.description = options.description
        this.inputedTriggerString = triggerCharsCreators[options.type](options.name).slice(0, -1)
        this.onTrigger = triggerHandler || ((ctx, trigger) => {
            trigger(ctx)
        })
    }
}

export const createAbbrs = (name: AbbrName, config: AbbrConfig): Abbr[] => {
    const abbrs: Abbr[] = [];
    ; ([1, 2, 4] as AbbrType[]).forEach(t => {
        const info = config[t]
        if (info) {
            abbrs.push(new Abbr({
                name,
                type: t,
                display: info.display || abbrDisplayGetters[t](name),
                description: info.description || name
            }, info.onTrigger))
        }
    })
    return abbrs
}

export class AbbrJudge {
    public readonly chars: string[]
    public readonly abbr: Abbr
    public pos: number = 0
    /**
     * 创建一个缩写符Judge, 输入时判断触发串是否匹配
     * @param triggerString 完整的缩写符触发串
     */
    constructor(abbr: Abbr, triggerString: string) {
        this.abbr = abbr
        this.chars = triggerString.split('')
    }
    /** 
     * 判断input的data是否匹配 当前字符 
     * @returns 仅当返回true时, 终止后续其他缩写符判断
     */
    judge(char: string, resetNeeded: boolean) {
        // 是否需要先reset, 避免跳跃匹配
        if (resetNeeded) {
            this.pos = 0
        }
        if (this.chars[this.pos] === char) {
            this.pos++
        }
        else {
            this.pos = this.chars[0] === char ? 1 : 0   // 匹配失败时继续判断第一个字符是否匹配，避免出现类似 pps. 不匹配 ps. 的情况
        }
        if (this.pos === this.chars.length) {
            // to remove
            // console.warn('judge success', this.abbr.name, this.abbr.type)
            this.pos = 0
            abbrContext.readyAbbr = this.abbr
            return true
        }
    }
    /** 重置游标 */
    reset() {
        this.pos = 0
    }
}

export const abbrListener = (() => {
    const abbrJudgeMap = new Map<string, AbbrJudge>()
    let _resetNeeded = false
    return {
        /** 标记下次listen时, 需要先将当前judge reset; 以代替abbrListener.reset(), 避免每次都要重新遍历一次所有judge */
        needResetBeforeJudge: () => { _resetNeeded = true },
        unNeedResetBeforeJudge: () => { _resetNeeded = false },

        clear: () => {
            abbrJudgeMap.clear()
        },
        // /** 重置所有缩写符judge的游标 */
        // reset: () => {
        //     for (const judge of abbrJudgeMap.values()) {
        //         judge.reset()
        //     }
        // },
        /** 监听一个输入data 判断是否匹配缩写符; 仅当有一个缩写符匹配完全时 返回true */
        listen: (char: string) => {
            let flag: boolean = false
            for (const judge of abbrJudgeMap.values()) {
                if (judge.judge(char, _resetNeeded)) {
                    flag = true
                    break
                }
            }
            _resetNeeded = false
            // 匹配成功, 重置监听
            if (flag) _resetNeeded = true
            return flag
        },
        registerAbbrs: (abbrs: Abbr[]) => {
            for (const abbr of abbrs) {
                // todo remove
                console.log('reigster abbr', abbr.display)
                if (abbr.type & 4) {
                    // 块级符不参与judge
                    abbrContext.blockAbbrs.push(abbr)
                    continue
                }
                const triggerString = triggerCharsCreators[abbr.type](abbr.name)
                if (!abbrJudgeMap.has(triggerString)) {
                    abbrJudgeMap.set(triggerString, new AbbrJudge(abbr, triggerString))
                }
            }
        }
    }
})()