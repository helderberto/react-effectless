#!/usr/bin/env tsx
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SECTION_MARKER = '<!-- react-effectless -->'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const templatesDir = resolve(__dirname, '..', 'agent-skills')

function readTemplate(name: string): string {
  return readFileSync(join(templatesDir, name), 'utf8')
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function appendSection(filePath: string, content: string): void {
  ensureDir(filePath)

  if (existsSync(filePath)) {
    const existing = readFileSync(filePath, 'utf8')
    if (existing.includes(SECTION_MARKER)) {
      console.log(`  skipped  ${filePath} (already has react-effectless section)`)
      return
    }
    const separator = existing.endsWith('\n') ? '\n' : '\n\n'
    writeFileSync(filePath, existing + separator + SECTION_MARKER + '\n' + content)
  } else {
    writeFileSync(filePath, SECTION_MARKER + '\n' + content)
  }

  console.log(`  updated  ${filePath}`)
}

function writeFile(filePath: string, content: string): void {
  ensureDir(filePath)

  if (existsSync(filePath)) {
    console.log(`  skipped  ${filePath} (already exists)`)
    return
  }

  writeFileSync(filePath, content)
  console.log(`  created  ${filePath}`)
}

function run(): void {
  const cwd = process.cwd()

  console.log('react-effectless init\n')

  appendSection(join(cwd, 'CLAUDE.md'), readTemplate('CLAUDE.md'))
  appendSection(join(cwd, 'AGENTS.md'), readTemplate('AGENTS.md'))
  appendSection(
    join(cwd, '.github', 'copilot-instructions.md'),
    readTemplate('copilot-instructions.md'),
  )

  writeFile(join(cwd, '.cursor', 'rules', 'react-effectless.md'), readTemplate('cursor-rules.md'))

  const pathScopedContent =
    '---\napplyTo: "**/*.ts,**/*.tsx"\n---\n\n' + readTemplate('copilot-instructions.md')
  writeFile(
    join(cwd, '.github', 'instructions', 'react-effectless.instructions.md'),
    pathScopedContent,
  )

  console.log('\ndone.')
}

run()
