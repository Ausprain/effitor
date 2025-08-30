import { test } from 'vitest'

import { Effitor } from '../../editor'

const host = document.createElement('div')
document.body.appendChild(host)

const editor = new Effitor()
