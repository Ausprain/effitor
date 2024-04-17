import { Et } from "@/effitor";
import { MarkElName, MarkStatus, MarkType } from "./@type.mark";

const enum M {
    N = MarkElName,
    C = MarkType.CODE,
    B = MarkType.BOLD,
    D = MarkType.DELETE,
    I = MarkType.ITALIC,
    H = MarkType.HIGHLIGHT,
    HINT = MarkStatus.HINTING,
    TEMP = MarkStatus.MARKING,
}

export const markerMap = {
    [`${M.C}`]: { type: M.C, char: '`', marker: '`' },
    [`${M.I}`]: { type: M.I, char: '*', marker: '*' },
    [`${M.B}`]: { type: M.B, char: '*', marker: '**' },
    [`${M.D}`]: { type: M.D, char: '~', marker: '~~' },
    [`${M.H}`]: { type: M.H, char: '=', marker: '==' },
} as const;
export type Marker = typeof markerMap[keyof typeof markerMap];

export const markState = {
    /** 
     * 构造标记节点（临时节点）阶段  
     * 新插入标记节点时设置为2, 第一次selectionchange时设置为1, 标记节点内input内容后设置为0
     * ```
     * 0: 不是临时节点
     * 1: 是临时节点
     * 2: 刚刚创建的临时节点
     * ```
     */
    phase: 0 as | 0 | 1 | 2,
    markingType: null as MarkType | null,
    startMarking(markType: MarkType) {
        this.phase = 2
        this.markingType = markType
    },
    endMarking() {
        this.phase = 0
        this.markingType = null
    }
}


export const markCssText = `
${M.N} {
    display: inline;
    /* 
        margin: 0px 2px; 
        padding: 0 3px;
    */
    border-radius: 2px;
    word-break: break-all;
}
${M.N}.${M.HINT} {
    padding: 0;
}

${M.N}::after, ${M.N}::before {
    display: none;
    color: #79d;
    font-family: Consolas;
    font-weight: normal;
}
${M.N}::after {
    padding-left: 1px;
    padding-right: 3px;
}
${M.N}::before {
    padding-left: 3px;
    padding-right: 1px;
}
${M.N}.${M.HINT}::after, ${M.N}.${M.HINT}::before {
    display: inline;
}
${M.N}.${M.TEMP}::after {
    color: #dde
}

.${Et.CssClass.SelectionRange} ${M.N}::before,
.${Et.CssClass.SelectionRange} ${M.N}::after {
    display: none;
}


${M.N}.${M.C} {
    margin: 0px 2px; 
    padding: 4px 3px 2px;
    background-color: #f7f7ff;
    color: #ec3639;
    font-size: 14px;
    font-family: "Cascadia Code";
}
${M.N}.${M.C}.${M.HINT} {
    padding: 4px 0 2px;
}
${M.N}.${M.C}::after, ${M.N}.${M.C}::before {
    content: "${markerMap.code.marker}";
}


${M.N}.${M.B} {
    font-weight: bold;
}
${M.N}.${M.B}::after, ${M.N}.${M.B}::before {
    content: "${markerMap.bold.marker}";
}


${M.N}.${M.I} {
    font-style: italic;
}
${M.N}.${M.I}::after, ${M.N}.${M.I}::before {
    content: "${markerMap.italic.marker}";
}


${M.N}.${M.D} {
    text-decoration: line-through;
}
${M.N}.${M.D}::after, ${M.N}.${M.D}::before {
    content: "${markerMap.delete.marker}";
}


${M.N}.${M.H} {
    background-color: #fcd13c;
    padding: 1px 0;
}
${M.N}.${M.H}::after, ${M.N}.${M.H}::before {
    content: "${markerMap.highlight.marker}";
}
`