
export { Et } from "./@types";

import { extentEtElement, builtinEl } from "./element";
import { MainKeydownSolver } from "./effector";
import { MainKeyupSolver } from './effector/keyup';
import { MainBeforeInputTypeSolver } from './effector/beforeinput';
import { MainAfterInputTypeSolver } from './effector/input';
import { createEditor } from './effitor';
import { getMainEffector } from './effector/index';
import { useUndoEffector } from "./plugins/undo";
import { createCommand } from "./handler/cmd";
import { useMarkPlugin } from "./plugins/mark";
import { useCompPlugin } from "./plugins/comp";
import { builtinHandler } from "./handler";

export * as utils from './utils'
export * as handlerUtils from './handler/utils'

const et = {
    /** 创建一个编辑器对象 */
    createEditor,
    /** 创建一个命令 */
    createCommand,
    /** 效应器 */
    effector: {
        /** 获取一个主效应器 */
        getMainEffector,
        /** 继承该类, 以自定义keydown 的按键处理 */
        MainKeydownSolver,
        /** 继承该类, 以自定义keyup 的按键处理 */
        MainKeyupSolver,
        /** 继承该类, 以自定义beforeinput 的inputType处理 */
        MainBeforeInputTypeSolver,
        /** 继承该类, 以自定义input 的inputType */
        MainAfterInputTypeSolver,
    },
    /** 自定义元素 */
    element: {
        ...builtinEl,
    },
    /** 效应处理器 */
    handler: {
        /** 给自定义元素绑定效应处理器 */
        extentEtElement,
        /** 内置handler, 根据inputType处理 beforeinput */
        builtinHandler,
    },
    plugins: {
        /** 撤回效应器（撤回栈插件） */
        useUndoEffector,
        useMarkPlugin,
        useCompPlugin,
    },
}


export default et;