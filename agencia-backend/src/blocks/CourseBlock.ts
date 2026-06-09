import type { Block } from 'payload'

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
  labels: {
    singular: 'Course',
    plural: 'Course Blocks',
  },
}
