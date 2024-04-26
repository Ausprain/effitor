import type { Abbr, AbbrName } from "./abbr"

export const enum AbbrConfigEnum {
    ABBR_TRIGGER_CHAR = '.',
    EL_NAME = 'et-abbr',
}

const ABBR_TRIGGER_CHAR = AbbrConfigEnum.ABBR_TRIGGER_CHAR

export type AbbrContext = {
    triggerChar: string,
    readyAbbr: Abbr | null
}
export const abbrContext: AbbrContext = {
    triggerChar: ABBR_TRIGGER_CHAR,
    readyAbbr: null,
}

export const prefixTriggerChars = (name: AbbrName) => `${name}${abbrContext.triggerChar} ` 
export const suffixTriggerChars = (name: AbbrName) => `${abbrContext.triggerChar}${name} ` 
export const blockTriggerChars = (name: AbbrName) => `${name}${abbrContext.triggerChar}\n`

export const prefixAbbrDisplay = (name: AbbrName) => `${name}${abbrContext.triggerChar}`
export const suffixAbbrDisplay = (name: AbbrName) => `${abbrContext.triggerChar}${name}`
export const blockAbbrDisplay = (name: AbbrName) => `${name}${abbrContext.triggerChar}\n`
