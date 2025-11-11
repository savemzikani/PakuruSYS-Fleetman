"use client"

import type { ComponentProps, MouseEvent } from "react"

import { Button } from "@/components/ui/button"

import { useDriverModals } from "./driver-modals-provider"

type DriverButtonBaseProps = ComponentProps<typeof Button>

type DriverWithIdProps = DriverButtonBaseProps & {
  driverId: string
}

export function DriverAddButton({ onClick, children = "Add Driver", ...props }: DriverButtonBaseProps) {
  const { openAddModal } = useDriverModals()

  return (
    <Button
      type="button"
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (event.isPropagationStopped()) return
        openAddModal()
      }}
    >
      {children}
    </Button>
  )
}

export function DriverAssignVehicleButton({
  driverId,
  onClick,
  children = "Assign Vehicle",
  ...props
}: DriverWithIdProps) {
  const { openAssignVehicleModal } = useDriverModals()

  return (
    <Button
      type="button"
      {...props}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.isPropagationStopped()) return
        openAssignVehicleModal(driverId)
      }}
    >
      {children}
    </Button>
  )
}

export function DriverEditButton({ driverId, onClick, children = "Edit", ...props }: DriverWithIdProps) {
  const { openEditModal } = useDriverModals()

  return (
    <Button
      type="button"
      {...props}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.isPropagationStopped()) return
        openEditModal(driverId)
      }}
    >
      {children}
    </Button>
  )
}
