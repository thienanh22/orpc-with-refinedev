'use client'

import { Refine } from '@refinedev/core'
import routerProvider from '@refinedev/nextjs-router'
import { planetsDataProvider } from '@/orpc/planets-provider'
import { planetsV2DataProvider } from '@/orpc/planets-v2-provider'
import { notificationProvider } from '@/providers/notification'

/** Wraps the Refine engine. Must be a Client Component (uses React context). */
export function RefineProviders({ children }: { children: React.ReactNode }) {
  return (
    <Refine
      dataProvider={{
        default: planetsDataProvider,
        planetsV2: planetsV2DataProvider,
      }}
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
          meta: { label: 'Planets (v2)', dataProviderName: 'planetsV2' },
        },
      ]}
      options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
    >
      {children}
    </Refine>
  )
}
