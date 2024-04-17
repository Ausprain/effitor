import { EffectElement, extentEtElement } from "@/effitor/element";
import { CompCode, type EtComponent } from "../@types.comp";
import { EtListElement } from "./EtListElement";
import { listHandler, overrideHandler } from "./handler";


export const listComp: EtComponent = {
    code: CompCode.LIST,
    element: EtListElement,
    registry(pCtor) {
        extentEtElement(pCtor, listHandler)
        extentEtElement(EffectElement, overrideHandler)
    },
}