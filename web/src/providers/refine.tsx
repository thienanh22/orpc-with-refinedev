'use client'

import { Refine } from '@refinedev/core'
import routerProvider from '@refinedev/nextjs-router'
import { contractClient, createOrpcDataProvider } from '@/orpc/data-provider'
import { notificationProvider } from '@/providers/notification'

// The whole oRPC <-> Refine integration is configuration: one registry entry
// per resource, mapping its Refine name to a conventional contract sub-router.
const dataProvider = createOrpcDataProvider({
  'planets': {
    client: contractClient.v1.planet,
    actions: ['list', 'find', 'create', 'update', 'delete'],
  },
  'planets-v2': {
    client: contractClient.v2.planet,
    actions: ['list', 'find', 'create'],
  },
  'stars': {
    client: contractClient.v3.star,
    actions: ['list', 'find', 'create'],
  },
})

/** Wraps the Refine engine. Must be a Client Component (uses React context). */
export function RefineProviders({ children }: { children: React.ReactNode }) {
  return (
    <Refine
      dataProvider={dataProvider}
      routerProvider={routerProvider}
      notificationProvider={notificationProvider}
      resources={[
        {
          name: 'planets',
          list: '/planets',
          show: '/planets/:id',
          create: '/planets/create',
          edit: '/planets/:id/edit',
          meta: { label: 'Planets (v1)' },
        },
        {
          name: 'planets-v2',
          list: '/planets-v2',
          meta: { label: 'Planets (v2)' },
        },
        {
          name: 'stars',
          list: '/stars',
          meta: { label: 'Stars (v3)' },
        },
      ]}
      options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
    >
      {children}
    </Refine>
  )
}
