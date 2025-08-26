#!/usr/bin/env node
// Minimal PNG->ICO generator embedding a single PNG (256x256 recommended)
// Usage: node scripts/png-to-ico.js <input.png> <output.ico>
import fs from 'node:fs'
import path from 'node:path'

function readPNGDimensions(buf) {
  // PNG signature (8 bytes) + IHDR chunk (length=13, type, data, crc)
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A])
  if (!buf.slice(0, 8).equals(sig)) throw new Error('Not a PNG file')
  // IHDR chunk should start at offset 8
  const ihdrType = buf.slice(12, 16).toString('ascii')
  if (ihdrType !== 'IHDR') throw new Error('PNG missing IHDR')
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  return { width, height }
}

function pngToIco(pngBuf) {
  const { width, height } = readPNGDimensions(pngBuf)
  if (width > 256 || height > 256) {
    throw new Error(`PNG is ${width}x${height}. ICO entries must be ≤256x256. Please downscale first (e.g., macOS: sips -z 256 256 ...)`) 
  }
  const widthByte = width >= 256 ? 0 : width
  const heightByte = height >= 256 ? 0 : height
  const entries = 1
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type 1 = icon
  header.writeUInt16LE(entries, 4) // image count

  const dir = Buffer.alloc(16)
  dir.writeUInt8(widthByte, 0) // width
  dir.writeUInt8(heightByte, 1) // height
  dir.writeUInt8(0, 2) // color count
  dir.writeUInt8(0, 3) // reserved
  dir.writeUInt16LE(1, 4) // planes (1)
  dir.writeUInt16LE(32, 6) // bit count (32)
  dir.writeUInt32LE(pngBuf.length, 8) // bytes in resource
  dir.writeUInt32LE(6 + 16, 12) // offset of image data

  return Buffer.concat([header, dir, pngBuf])
}

function main() {
  const [inp, outp] = process.argv.slice(2)
  if (!inp || !outp) {
    console.error('Usage: node scripts/png-to-ico.js <input.png> <output.ico>')
    process.exit(1)
  }
  const pngBuf = fs.readFileSync(inp)
  const icoBuf = pngToIco(pngBuf)
  fs.mkdirSync(path.dirname(outp), { recursive: true })
  fs.writeFileSync(outp, icoBuf)
  console.log('ICO written:', outp)
}

// ESM equivalent of require.main === module
const isMain = import.meta.url === `file://${path.resolve(process.argv[1])}`
if (isMain) main()
