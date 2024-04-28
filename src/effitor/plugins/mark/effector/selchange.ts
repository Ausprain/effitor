import type * as Et from "@/effitor/@types";
import { markState } from "../config";


export const selChange: Et.SelChangeAction = (ev, ctx) => {
    if (markState.phase) {
        // phase == 2 时为刚刚插入标记节点导致的selectionchange
        if ((markState.phase--) === 1) {
            // console.log('撤销临时节点插入')
            ctx.commandHandler.discard()
        }
    }
}
