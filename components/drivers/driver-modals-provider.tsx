"use client"

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { DriverForm } from "@/components/drivers/driver-form"
import { DriverAssignVehicleForm } from "@/components/drivers/driver-assign-vehicle-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type DriverModalType = "add-driver" | "edit-driver" | "assign-vehicle" | null

type DriverModalsContextValue = {
  openAddModal: () => void
  openEditModal: (driverId: string) => void
  openAssignVehicleModal: (driverId: string) => void
  closeModal: () => void
  activeModal: DriverModalType
  activeDriverId: string | null
}

const DriverModalsContext = createContext<DriverModalsContextValue | undefined>(undefined)

function useUrlParamUpdater() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  return useCallback(
    (updater: (params: URLSearchParams) => void, options: { replace?: boolean } = {}) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)
      const query = params.toString()
      const href = query ? `${pathname}?${query}` : pathname

      startTransition(() => {
        if (options.replace) {
          router.replace(href, { scroll: false })
        } else {
          router.push(href, { scroll: false })
        }
      })
    },
    [pathname, router, searchParams],
  )
}

export function DriverModalsProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const updateUrl = useUrlParamUpdater()

  const activeModal = (searchParams.get("modal") as DriverModalType) ?? null
  const activeDriverId = searchParams.get("driverId")

  const openAddModal = useCallback(() => {
    updateUrl((params) => {
      params.set("modal", "add-driver")
      params.delete("driverId")
    })
  }, [updateUrl])

  const openEditModal = useCallback(
    (driverId: string) => {
      updateUrl((params) => {
        params.set("modal", "edit-driver")
        params.set("driverId", driverId)
      })
    },
    [updateUrl],
  )

  const openAssignVehicleModal = useCallback(
    (driverId: string) => {
      updateUrl((params) => {
        params.set("modal", "assign-vehicle")
        params.set("driverId", driverId)
      })
    },
    [updateUrl],
  )

  const closeModal = useCallback(() => {
    updateUrl((params) => {
      params.delete("modal")
      params.delete("driverId")
    }, { replace: true })
  }, [updateUrl])

  const contextValue = useMemo<DriverModalsContextValue>(
    () => ({ openAddModal, openEditModal, openAssignVehicleModal, closeModal, activeModal, activeDriverId }),
    [activeDriverId, activeModal, closeModal, openAddModal, openAssignVehicleModal, openEditModal],
  )

  const addModalOpen = activeModal === "add-driver"
  const editModalOpen = activeModal === "edit-driver" && !!activeDriverId
  const assignModalOpen = activeModal === "assign-vehicle" && !!activeDriverId

  return (
    <DriverModalsContext.Provider value={contextValue}>
      {children}

      <Dialog
        open={addModalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      >
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
            <DialogDescription>Create a new driver profile for your fleet.</DialogDescription>
          </DialogHeader>
          {addModalOpen ? <DriverForm mode="create" onSuccess={closeModal} onCancel={closeModal} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editModalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      >
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>Update driver contact information and credentials.</DialogDescription>
          </DialogHeader>
          {editModalOpen && activeDriverId ? (
            <DriverForm mode="edit" driverId={activeDriverId} onSuccess={closeModal} onCancel={closeModal} />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignModalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      >
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Vehicle</DialogTitle>
            <DialogDescription>Link this driver to a vehicle and maintain history.</DialogDescription>
          </DialogHeader>

          {assignModalOpen && activeDriverId ? (
            <DriverAssignVehicleForm driverId={activeDriverId} onSuccess={closeModal} onCancel={closeModal} />
          ) : null}
        </DialogContent>
      </Dialog>
    </DriverModalsContext.Provider>
  )
}

export function useDriverModals() {
  const context = useContext(DriverModalsContext)
  if (!context) {
    throw new Error("useDriverModals must be used within a DriverModalsProvider")
  }
  return context
}
