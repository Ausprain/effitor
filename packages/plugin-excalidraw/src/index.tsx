import { render } from 'preact'

import App from './app'

export const renderExcalidraw = (el: HTMLDivElement) => {
  if (el.offsetHeight === 0) {
    el.style.height = '500px'
  }
  render(<App />, el)
}
