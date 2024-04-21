import type { Effitor } from "@/effitor/@types";
import { imageComp } from "./image";
import { pasteImage } from "./image/imageEffector";
import { linkComp } from "./link";
import { pasteLink } from "./link/linkEffector";
import { listComp } from "./list";
import { listKeydownEnterCallback, listKeydownSpaceCallback } from "./list/listEffector";


export const getCompEffector = (codeSum: number): Effitor.Effector => {
    const effector: Effitor.Effector = {
        keydownSolver: {
            ' ': (ev, ctx) => {
                console.error('comp keydown solve')
                return !!(
                    (codeSum & listComp.code) && listKeydownSpaceCallback(ev, ctx)
                )
            },
            Enter: (ev, ctx) => {
                return !!(
                    (codeSum & listComp.code) && listKeydownEnterCallback(ev, ctx)
                )
            }
        },
        pasteCallback: (ev, ctx) => {
            // console.error('comp paste callback')
            return !!(
                (codeSum & imageComp.code) && pasteImage(ev, ctx)
                ||
                (codeSum & linkComp.code) && pasteLink(ev, ctx)
            )
        }
    }

    return effector
}