import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

export default function App() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Excalidraw />
      <style>
        {`
        div.Island.App-menu__left {
          translate: -90% 0;
          transition: translate 0.2s ease-out;

          &>div {
            opacity: 0;
            transition: opacity 0.2s ease-out;
          }

          &:hover {
            translate: -10% 0;
            &>div {
              opacity: 1;
            }
          }
        }
        `}
      </style>
    </div>
  )
}
