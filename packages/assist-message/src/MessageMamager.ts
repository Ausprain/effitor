/**
 * 消息助手, 只提供接口, 不提供view
 * 使用`ctx.assist.msg.info/warn/error/success`方法来显示特定类型的消息
 */

interface AddMessage {
  /**
   * 显示消息
   * @param msg 消息内容
   */
  (msg: string): MessageManager
}
interface MessageRender {
  (msg: string, type: MessageType): void
}
export interface MessageManager {
  /** 显示消息 */
  info: AddMessage
  /** 显示成功消息 */
  success: AddMessage
  /** 显示警告消息 */
  warn: AddMessage
  /** 显示错误或失败消息 */
  error: AddMessage
}

type MessageType = 'info' | 'success' | 'warn' | 'error'
export interface MessageAssistOptions {
  /** 消息持续时间, 默认1500ms, 范围[1000, 5000] */
  duration?: number
  /** 消息列表, 对于vue等框架, 可以传入一个响应式对象; 消息时间到期时, 会从中shift */
  msgList?: string[]
  /** 渲染函数, 用于渲染消息到页面上, 渲染出来的dom由函数提供者维护; 未提供则使用内置函数 */
  render?: MessageRender
  onRemove?: undefined | ((msg?: string) => void)
}

const defaultOptions: MessageAssistOptions = {
  duration: 1500,
  msgList: [],
  render: (msg: string, type: MessageType) => {
    switch (type) {
      case 'info':
      case 'success':
        console.log(`[${type}]: ${msg}`)
        break
      case 'warn':
        console.warn(`[warn]: ${msg}`)
        break
      case 'error':
        console.error(`[error]: ${msg}`)
        break
    }
  },
}
export const getMessageManager = (_options?: MessageAssistOptions): MessageManager => {
  if (_options) {
    _options = Object.fromEntries(Object.entries(_options).filter(([_, v]) => v !== undefined))
  }
  const options = { ...defaultOptions, ..._options } as Required<MessageAssistOptions>
  if (options.duration < 1000 || options.duration > 5000) {
    options.duration = 1500
  }
  const renderMsg: MessageRender = (msg, type) => {
    options.msgList.push(msg)
    options.render(msg, type)
    // 到期自动移除
    window.setTimeout(() => {
      options.onRemove?.(options.msgList.shift())
    }, options.duration)
  }

  return {
    info(msg: string) {
      renderMsg(msg, 'info')
      return this
    },
    success(msg: string) {
      renderMsg(msg, 'success')
      return this
    },
    warn(msg: string) {
      renderMsg(msg, 'warn')
      return this
    },
    error(msg: string) {
      renderMsg(msg, 'error')
      return this
    },
  }
}
