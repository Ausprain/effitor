import { BuiltinElName } from "@/effitor/@types/constant";
import { EtComponentElement } from "@/effitor/element";

const enum C {
    TAG = BuiltinElName.ET_CODE
}

const cssText = `

`

export class EtCodeElement extends EtComponentElement {
    static elName = C.TAG
    static cssText = cssText;

}