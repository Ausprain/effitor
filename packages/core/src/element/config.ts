export const elseCssText = `
.etp {
    /* 段落不定位, 若定位, 会影响其后代的position-anchor定位 */
    /* position: relative; */
    display: block;
    padding-block: 0.2em;
    line-height: 1.5;
    hyphens: auto;  /* 末尾单词自动连接符 */
    white-space: pre-wrap;
    /* 两端对齐需要时, 设置在et-body上, 而非段落 */
    /* text-align: justify; */
    /* 分栏在需要时, 设置在段落上 */
    /* column-count: 2; */
}
`
