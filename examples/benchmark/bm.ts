import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { styleText } from 'node:util'
import { DEV_PORT } from './shared/config'

import { createServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEST_COUNT = 5
const OUT_DIR = resolve(__dirname, './tests/output')

const runTest = async () => {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['playwright', 'test'], {
      stdio: 'inherit', // 继承父进程的 I/O
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' }, // 保持颜色输出
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code)
      }
      else {
        reject(new Error(`Test failed with exit code ${code}`))
      }
    })

    child.on('error', reject)
  })
}

const clearOutputDir = () => {
  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

async function startDevServer() {
  const server = await createServer({
    root: __dirname, // 项目根目录（含 index.html）
    server: {
      port: DEV_PORT,
    },
    // 可选：自定义配置，如 plugins、resolve 等
  })

  await server.listen()

  const { port, host } = server.config.server
  console.log(`Vite dev server running on http://${host || 'localhost'}:${port}`)

  // 将 server 实例暴露出去，便于后续关闭
  return server
}

async function main() {
  console.log(styleText('cyan', `=============== test start ===============`))
  console.log(styleText('cyan', `start server......`))
  const server = await startDevServer()
  clearOutputDir()

  for (let i = 0; i < TEST_COUNT; i++) {
    console.log(styleText('cyan', `--------------- test ${i + 1}/${TEST_COUNT} ---------------`))
    try {
      await runTest()
      console.log(styleText('green', `✅ Test ${i + 1} completed successfully`))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (error: any) {
      server.close()
      console.error(styleText('red', `❌ Test ${i + 1}/${TEST_COUNT} failed:`, error.message))
      // 可以选择继续或停止
      // throw error // 如果想在失败时停止
    }
  }

  console.log(styleText('cyan', `=============== all tests completed ===============`))
  process.stdout.write(styleText('cyan', `=============== build result ===============`))
  execSync(`bun result.ts`)
  process.stdout.write(styleText('cyan', `\r=============== build result success ===============`))
  server.close()
}

main().catch((error) => {
  console.error(styleText('red', 'Fatal error:', error.message))
  process.exit(1)
})
