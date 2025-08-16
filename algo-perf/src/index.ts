import { expect, test } from 'vitest'

const app = document.getElementById('app')

test('app', () => {
  console.log(app)
  expect(app).toBeTruthy()
})
