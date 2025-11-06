"use client"

import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"

import { useLoadModals } from "@/components/loads/load-modals-provider"

type ButtonComponentProps = ComponentProps<typeof Button>

interface LoadModalButtonProps extends ButtonComponentProps {
  loadId: string
}

export function LoadEditButton({ loadId, children = "Edit Load", onClick, ...props }: LoadModalButtonProps) {
  const { openEditModal } = useLoadModals()

  return (
    <Button
      type="button"
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (event.isPropagationStopped()) return
        openEditModal(loadId)
      }}
    >
      {children}
    </Button>
  )
}

export function LoadAssignButton({ loadId, children = "Assign", onClick, ...props }: LoadModalButtonProps) {
  const { openAssignModal } = useLoadModals()

  return (
    <Button
      type="button"
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (event.isPropagationStopped()) return
        openAssignModal(loadId)
      }}
    >
      {children}
    </Button>
  )
}
