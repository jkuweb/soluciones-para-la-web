import { Block } from 'payload'
import { linkGroup } from '@/fields/linkGroup'
import { superAdminOnly } from '@/access/superAdminOnly'

export const HeroBlock: Block = {
  slug: 'hero',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'enableSubtitle',
      type: 'checkbox',
      label: 'Enable Subtitle',
      defaultValue: false,
      access: {
        read: () => true,
        create: superAdminOnly,
        update: superAdminOnly,
      },
      admin: {
        condition: (_data, _siblingData, { user }) =>
          user?.roles?.includes('super-admin') ?? false,
      },
    },
    {
      name: 'subtitle',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.enableSubtitle,
      },
    },
    {
      name: 'enableBackgroundImage',
      type: 'checkbox',
      label: 'Enable Background Image',
      defaultValue: false,
      access: {
        read: () => true,
        create: superAdminOnly,
        update: superAdminOnly,
      },
      admin: {
        condition: (_data, _siblingData, { user }) =>
          user?.roles?.includes('super-admin') ?? false,
      },
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_, siblingData) => siblingData?.enableBackgroundImage,
      },
    },
    {
      name: 'enableImages',
      type: 'checkbox',
      label: 'Enable Additional Images',
      defaultValue: false,
      access: {
        read: () => true,
        create: superAdminOnly,
        update: superAdminOnly,
      },
      admin: {
        condition: (_data, _siblingData, { user }) =>
          user?.roles?.includes('super-admin') ?? false,
      },
    },
    {
      name: 'images',
      type: 'array',
      label: 'Additional Images',
      admin: {
        condition: (_, siblingData) => siblingData?.enableImages,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'enableInformation',
      type: 'checkbox',
      label: 'Enable Information',
      defaultValue: false,
      access: {
        read: () => true,
        create: superAdminOnly,
        update: superAdminOnly,
      },
      admin: {
        condition: (_data, _siblingData, { user }) =>
          user?.roles?.includes('super-admin') ?? false,
      },
    },
    {
      name: 'information',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) => siblingData?.enableInformation,
      },
    },
    {
      name: 'enableCta',
      type: 'checkbox',
      label: 'Enable Call to Action',
      defaultValue: false,
      access: {
        read: () => true,
        create: superAdminOnly,
        update: superAdminOnly,
      },
      admin: {
        condition: (_data, _siblingData, { user }) =>
          user?.roles?.includes('super-admin') ?? false,
      },
    },
    linkGroup({
      overrides: {
        name: 'cta',
        label: 'Call to Action Links',
        admin: {
          condition: (_, siblingData) => siblingData?.enableCta,
        },
      },
    }),
  ],
}
