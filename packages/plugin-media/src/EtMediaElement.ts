import { dom, EditorContext, EtEmbedment, ToNativeHTMLPrefers } from '@effitor/core'

import { MediaEnum, MediaState, MediaType } from './config'

export abstract class EtMediaElement extends EtEmbedment {
  abstract mediaState: MediaState
  abstract mediaType: MediaType

  toNativeElement(_ctx: EditorContext, prefers: ToNativeHTMLPrefers = 'style'): null | HTMLElement | (() => HTMLElement) {
    const media = this.firstElementChild
    if (!media || media.localName !== this.nativeTag) {
      return null
    }
    if (prefers === 'style') {
      return () => media.cloneNode() as HTMLElement
    }
    const el = dom.elWithAttrs('span', this.attributes)
    el.classList.add(MediaEnum.Class_Media)
    el.appendChild(media.cloneNode())
    return () => el
  }
}
