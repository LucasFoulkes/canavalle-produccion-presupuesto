/*
  Usage:
    1) Create a schema.json at the project root, following schema.example.json
    2) Run: npm run generate:services
*/

import fs from 'node:fs'
import path from 'node:path'

type Column = {
  column_name: string
  data_type: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
}

type TableSchema = {
  table_name: string
  columns: Column[]
}

const ROOT = path.resolve(__dirname, '..')
const SCHEMA_PATH = path.join(ROOT, 'schema.json')
const SERVICES_DIR = path.join(ROOT, 'src', 'services')

function readSchema(): TableSchema[] {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Missing schema.json at project root. Create it based on schema.example.json`)
    process.exit(1)
  }
  const txt = fs.readFileSync(SCHEMA_PATH, 'utf-8')
  return JSON.parse(txt)
}

function pgTypeToTs(data_type: string): string {
  const t = data_type.toLowerCase()
  if (t.includes('bigint')) return 'number' // switch to 'string' if your IDs exceed JS safe integers
  if (t.includes('integer') || t === 'int4' || t === 'int8' || t === 'numeric' || t === 'double precision' || t === 'real') return 'number'
  if (t.includes('timestamp')) return 'string' // ISO string
  if (t === 'date' || t === 'time' || t === 'timetz' || t === 'timestamptz') return 'string'
  if (t.includes('bool')) return 'boolean'
  if (t.includes('json')) return 'any'
  if (t.includes('uuid')) return 'string'
  // text, character varying, varchar, char
  return 'string'
}

function buildRowType(table: TableSchema): string {
  const fields = table.columns
    .map((c) => {
      const tsType = pgTypeToTs(c.data_type)
      const optional = c.is_nullable === 'YES' ? ' | null' : ''
      return `  ${c.column_name}: ${tsType}${optional}`
    })
    .join('\n')
  return `export type ${pascal(table.table_name)} = {\n${fields}\n}`
}

function buildInsertUpdateTypes(table: TableSchema): string {
  // Omit id_* columns and columns that default to now() from insert by default
  const omitCols = table.columns
    .filter((c) => c.column_name.startsWith('id_') || (c.column_default && c.column_default.toLowerCase().includes('now()')))
    .map((c) => `'${c.column_name}'`)
  const omitUnion = omitCols.length ? omitCols.join(' | ') : 'never'
  const RowName = pascal(table.table_name)
  return [
    `export type ${RowName}Insert = Partial<Omit<${RowName}, ${omitUnion}>>`,
    `export type ${RowName}Update = Partial<${RowName}Insert>`,
  ].join('\n')
}

function detectIdColumn(table: TableSchema): string | null {
  const byName = table.columns.find((c) => c.column_name.startsWith('id_'))
  return byName ? byName.column_name : null
}

function pascal(name: string): string {
  return name
    .split(/[_-]/g)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

function buildService(table: TableSchema): string {
  const RowName = pascal(table.table_name)
  const idCol = detectIdColumn(table)
  const hasId = Boolean(idCol)
  const convenience = hasId
    ? `\n  getById: (id: number | string, columns: string = '*') => base.selectById(id, '${idCol}', columns),\n  updateById: (id: number | string, patch: ${RowName}Update) => base.updateById(id, patch, '${idCol}'),\n  deleteById: (id: number | string) => base.deleteById(id, '${idCol}'),\n`
    : ''

  return `import { makeTableService } from './db'\n\nexport { ${RowName} } from './${table.table_name}' // if you split types; here we inline types below\n\n${buildRowType(table)}\n${buildInsertUpdateTypes(table)}\n\nconst base = makeTableService<${RowName}, ${RowName}Insert, ${RowName}Update>('${table.table_name}')\n\nexport const ${table.table_name}Service = {\n  ...base,${convenience}}\n`
}

function writeServiceFile(table: TableSchema) {
  const filePath = path.join(SERVICES_DIR, `${table.table_name}.ts`)
  const content = buildService(table)
  fs.mkdirSync(SERVICES_DIR, { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`Generated: ${path.relative(ROOT, filePath)}`)
}

function main() {
  const schema = readSchema()
  schema.forEach(writeServiceFile)
}

main()
