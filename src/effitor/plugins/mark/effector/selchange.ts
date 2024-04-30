import type * as Et from "@/effitor/@types";
import { markState } from "../config";


export const selChange: Et.SelChangeAction = (ev, ctx) => {
    if (markState.phase) {
        // phase == 2 时为刚刚插入标记节点导致的selectionchange
        // phase == 1 时说明刚刚插入的标记节点没有输入任何内容就又触发了selectionchange, 此时标记节点为空，应当撤销
        if ((markState.phase--) === 1) {
            // console.log('撤销临时节点插入')
            ctx.commandHandler.discard()
        }
    }
}
