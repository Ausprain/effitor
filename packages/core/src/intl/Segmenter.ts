/**
 * Text 文本分词器
 */
export class Segmenter {
  // 使用本地语言字符串分词器, 用于计算光标位置要删除的字符/单词的长度
  private _locale: string
  private _graphemeSegmenter: Intl.Segmenter
  private _wordSegmenter: Intl.Segmenter
  constructor(
    locale = 'en-US',
  ) {
    this._locale = locale
    try {
      this._locale = locale
      this._graphemeSegmenter = new Intl.Segmenter(this._locale, { granularity: 'grapheme' })
      this._wordSegmenter = new Intl.Segmenter(this._locale, { granularity: 'word' })
    }
    catch (_e) {
      this._locale = 'en-US'
      this._graphemeSegmenter = new Intl.Segmenter(this._locale, { granularity: 'grapheme' })
      this._wordSegmenter = new Intl.Segmenter(this._locale, { granularity: 'word' })
    }
  }

  /**
   * 设置地区(语言)
   * @param locale 一个符合BCP 47规范的语言编码, 若不合法, 将不做改变(继续使用 platform.locale )
   * @returns 是否设置成功
   */
  setLocale(locale: string) {
    try {
      const graphemeSeg = new Intl.Segmenter(locale, { granularity: 'grapheme' })
      const wordSeg = new Intl.Segmenter(locale, { granularity: 'word' })
      this._graphemeSegmenter = graphemeSeg
      this._wordSegmenter = wordSeg
      this._locale = locale
      return true
    }
    catch (_e) {
      return false
    }
  }

  /**
   * 获取当前光标左侧(Backspace方向)的第一个“视觉字符” (双码点字符会视为一个视觉字符, 四码点字符会被视为两个视觉字符)
   * @returns 若anchorText为空, 或anchorOffset=0, 返回 undefined
   */
  precedingChar(data: string, offset: number): string | undefined {
    if (offset === 0) {
      return void 0
    }
    // return [
    //   ...text.data.slice(Math.max(0, offset - 4), offset),
    // ].pop()
    const segs = this._graphemeSegmenter.segment(data.slice(0, offset))
    return segs.containing(offset - 1)?.segment
  }

  /**
   * 获取当前光标右侧(Delete方向)的第一个“视觉字符”
   * @returns 若anchorText为空, 或anchorOffset=anchorText.length, 返回 undefined
   */
  followingChar(data: string, offset: number): string | undefined {
    if (length === offset) {
      return void 0
    }
    // return [
    //   ...text.data.slice(offset, offset + 4),
    // ].shift()
    const segs = this._graphemeSegmenter.segment(data.slice(offset))
    return segs.containing(0)?.segment
  }

  /**
   * 获取当前光标左侧(Backspace方向)的1个单词; 使用当前`locale`语言分词\
   * 后续空白符会被当做单词的一部分, 如 `" 123|4"`, `" 123"`被视为一个单词,
   * `"123 |"` `|`前视`"123 "`也被视为一个单词; `"AA BB |"` 被视为两个单词,
   * 即 `"AA "`和`"BB "`
   */
  precedingWord(data: string, offset: number): string | undefined {
    if (offset === 0) {
      return void 0
    }
    const segs = this._wordSegmenter.segment(data.slice(0, offset))
    let prev = segs.containing(offset - 1)
    if (!prev) {
      return void 0
    }
    let word = prev.segment
    prev = segs.containing(prev.index - 1)
    while (prev) {
      // 将空白符与当前单词合并; Intl 分词默认将空白符单独为一个word
      // 在按住`Ctrl+Backspace`快速连续删除单词时, 会在删除`空白符word`时明显感觉到卡顿
      // 于是将空白符与附近的真实 word 合并一齐删除, 以获取视觉连贯性, 同时缩减连续删除的总耗时
      // 事实上, 在浏览器原生的deleteWordBackward 行为会在遇到空白符时, 连同空白符的左侧单词
      // 视为一个word并一齐删除; 以下代码就是模拟这一行为, 不过我们更激进一些, 不仅考虑近端空白符,
      // 也考虑远端空白符, 对连续递增的相同 word 也进行合并删除, 如 "空白 删除删除|", 在`|`
      // 位置向左删除一个word, 会将"删除删除"一齐删除, 得到 "空白|".
      // `hello world  |` -> `hello |`  // 近端有空白符, 远端的不会被一起删除
      // `hello  world|`  -> `hello|`  // 近端无空白符, 远端的被一起删除
      if (/\s+/.test(prev.segment) || prev.segment === word) {
        word = prev.segment + word
        prev = segs.containing(prev.index - 1)
        continue
      }
      // 删除连续空白符及其左侧第一个单词
      if (/^\s+$/.test(word)) {
        word = prev.segment + word
      }
      break
    }
    return word
  }

  /**
   * 获取当前光标右侧(Delete方向)的1个单词; 使用当前`locale`语言分词\
   * 类似 {@link precedingWord}, 后续空白符会被当做单词的一部分,
   * 如 `"123|45 "`, `"45 "`被视为一个单词
   */
  followingWord(data: string, offset: number): string | undefined {
    if (length === offset) {
      return void 0
    }
    const segs = this._wordSegmenter.segment(data.slice(offset))
    let next = segs.containing(0)
    if (!next) {
      return void 0
    }
    let word = next.segment
    next = segs.containing(next.index + next.segment.length)
    while (next) {
      if (/\s+/.test(next.segment) || next.segment === word) {
        word += next.segment
        next = segs.containing(next.index + next.segment.length)
        continue
      }
      // 删除连续空白符及其右侧第一个单词
      if (/^\s+$/.test(word)) {
        word += next.segment
      }
      break
    }
    return word
  }
}
