#!/usr/bin/env node
/**
 * Genera JSON en formato Lexical para Payload CMS
 * Uso: node lexical-json.js <texto>
 */
const text = process.argv[2] || ''
const json = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: text,
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}
process.stdout.write(JSON.stringify(json))
