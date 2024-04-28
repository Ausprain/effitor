import { EtBodyElement, EtComponentElement, EtEditorElement, EtParagraphElement, EtPlainTextElement, EtRichTextElement, extentEtElement } from "./element";
import { MainKeydownKeySolver } from "./effector";
import { MainKeyupKeySolver } from './effector/keyup';
import { MainBeforeInputTypeSolver } from './effector/beforeinput';
import { MainAfterInputTypeSolver } from './effector/input';
import { createEditor } from './effitor';
import { getMainEffector } from './effector/index';
import { createCommand } from "./handler/cmd";
import { useMarkPlugin } from "./plugins/mark";
import { useCompPlugin } from "./plugins/comp";
import { builtinHandler } from "./handler";
import { useAbbrPlugin } from "./plugins/abbr";
import { EtAbbrElement } from "./plugins/abbr/element";
import { EtImageElement } from "./plugins/comp/image/EtImageElement";
import { EtLinkElement } from "./plugins/comp/link/EtLinkElement";
import { EtListElement } from "./plugins/comp/list/EtListElement";
import { EtMarkElement } from "./plugins/mark/element";

const et = {
    /** 创建一个编辑器对象 */
    createEditor,
    /** 创建一个命令 */
    createCommand,
    /** 效应器 */
    effector: {
        /** 获取一个主效应器 */
        getMainEffector,
        /** 继承该类, 以自定义keydown 的默认按键处理 */
        MainKeydownKeySolver,
        /** 继承该类, 以自定义keyup 的默认按键处理 */
        MainKeyupKeySolver,
        /** 继承该类, 以自定义beforeinput 的默认inputType处理 */
        MainBeforeInputTypeSolver,
        /** 继承该类, 以自定义input 的默认inputType处理 */
        MainAfterInputTypeSolver,
    },
    /** 自定义元素 */
    element: {
        EtEditorElement,
        EtBodyElement,
        EtParagraphElement,
        EtPlainTextElement,
        EtRichTextElement,
        EtComponentElement,

        EtAbbrElement,
        EtImageElement,
        EtLinkElement,
        EtListElement,
        EtMarkElement,
    },
    /** 效应处理器 */
    handler: {
        /** 给自定义元素绑定效应处理器 */
        extentEtElement,
        /** 内置handler, 根据inputType处理 beforeinput */
        builtinHandler,
    },
    plugins: {
        useAbbrPlugin,
        useCompPlugin,
        useMarkPlugin,
    },
}

export default et;
export * from './@types/export';
export * as Et from "./@types/export";
export * as utils from './utils'
export * as handlerUtils from './handler/utils'