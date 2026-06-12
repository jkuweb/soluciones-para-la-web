import { Block } from 'payload'
import { defaultLexical } from '@/fields'

export const CourseBlock: Block = {
  slug: 'course',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
      editor: defaultLexical(),
    },
    {
      name: 'price',
      type: 'number',
    },
    {
      name: 'duration',
      type: 'text',
    },
    {
      name: 'lessons',
      type: 'array',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'videoUrl',
          type: 'text',
        },
        {
          name: 'description',
          type: 'textarea',
        },
      ],
    },
  ],
}
