// system-info.js
import os from 'os'

export function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    totalMemory: Math.round(os.totalmem() / (1024 ** 3)), // GB
    freeMemory: Math.round(os.freemem() / (1024 ** 3)), // GB
    nodeVersion: process.version,
    osRelease: os.release(),
  }
}

// 简短格式
export function getSystemInfoShort() {
  const info = getSystemInfo()
  const os = info.platform === 'darwin' ? 'macOS' : info.platform === 'win32' ? 'Windows' : info.platform
  return `${os}: ${info.cpus}x[${info.cpuModel.split('@')[0].trim()}] ${info.totalMemory}GB, nodejs: ${info.nodeVersion}`
}

// console.log(getSystemInfo())
// console.log(getSystemInfoShort())
