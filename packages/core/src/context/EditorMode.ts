import type { Et } from '../@types'

/**
 * 编辑器模式
 */
export class EditorMode {
  constructor(private _ctx: Et.EditorContext) {}

  /**
   * 控制模式(用于多光标多选区)
   * @todo
   */
  control() {
    // todo
  }

  /**
   * 编辑模式(常规模式)
   * @todo
   */
  edit() {
    // todo
  }

  /**
   * 只读模式
   * @todo
   */
  readonly() {
    // todo
  }

  /**
   * 选择模式; 如表格中选择多个单元格, 可能并入控制模式统一处理
   * @todo
   */
  select() {
    // todo
  }
}
