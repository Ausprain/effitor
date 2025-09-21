import { defineConfig } from 'tsup'

import sharedConfig from '../tsup.shared'

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...(sharedConfig as any),
  dts: {
    ...(typeof sharedConfig.dts === 'object' ? sharedConfig.dts : {}),
    banner: undefined,
  },
  entry: ['./src'],
})
