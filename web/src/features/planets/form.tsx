'use client'

import { useForm } from '@refinedev/react-hook-form'
import { useNavigation, type HttpError } from '@refinedev/core'
import type { FieldValues } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type PlanetFormValues = {
  name: string
  description?: string | null
}

/** Shared create/edit form. `action` drives whether useForm fetches + updates. */
export function PlanetForm({ action }: { action: 'create' | 'edit' }) {
  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlanetFormValues, HttpError, PlanetFormValues>({
    refineCoreProps: { resource: 'planets', action, redirect: 'list' },
  })
  const { list } = useNavigation()

  const submit = (values: FieldValues) =>
    onFinish({
      name: values.name,
      // Normalize empty string -> null so the contract gets a clean value.
      description: values.description?.trim() ? values.description : null,
    })

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{action === 'create' ? 'New planet' : 'Edit planet'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g. Neptune"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} placeholder="Optional" />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={formLoading || isSubmitting}>
              {action === 'create' ? 'Create' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={() => list('planets')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
