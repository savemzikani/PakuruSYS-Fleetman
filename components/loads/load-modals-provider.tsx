"use client"

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { LoadForm } from "@/components/loads/load-form"
import { AssignLoadForm } from "@/components/loads/assign-load-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ModalType = "edit-load" | "assign-load" | null

type LoadModalsContextValue = {
  openEditModal: (loadId: string) => void
  openAssignModal: (loadId: string) => void
  closeModal: () => void
  activeModal: ModalType
  activeLoadId: string | null
}

const LoadModalsContext = createContext<LoadModalsContextValue | undefined>(undefined)

function useUrlParamUpdater() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [_, startTransition] = useTransition()

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

export function LoadModalsProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const updateUrl = useUrlParamUpdater()

  const activeModal = (searchParams.get("modal") as ModalType) ?? null
  const activeLoadId = searchParams.get("loadId")

  const openEditModal = useCallback(
    (loadId: string) => {
      updateUrl((params) => {
        params.set("modal", "edit-load")
        params.set("loadId", loadId)
      })
    },
    [updateUrl],
  )

  const openAssignModal = useCallback(
    (loadId: string) => {
      updateUrl((params) => {
        params.set("modal", "assign-load")
        params.set("loadId", loadId)
      })
    },
    [updateUrl],
  )

  const closeModal = useCallback(() => {
    updateUrl((params) => {
      params.delete("modal")
      params.delete("loadId")
    }, { replace: true })
  }, [updateUrl])

  const contextValue = useMemo<LoadModalsContextValue>(
    () => ({ openEditModal, openAssignModal, closeModal, activeModal, activeLoadId }),
    [activeLoadId, activeModal, closeModal, openAssignModal, openEditModal],
  )

  const editModalOpen = activeModal === "edit-load" && !!activeLoadId
  const assignModalOpen = activeModal === "assign-load" && !!activeLoadId

  return (
    <LoadModalsContext.Provider value={contextValue}>
      {children}

      <Dialog
        open={editModalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      >
        <DialogContent className="max-w-3xl sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Load</DialogTitle>
            <DialogDescription>Update load details and status information.</DialogDescription>
          </DialogHeader>

          {editModalOpen && activeLoadId ? (
            <LoadForm mode="edit" loadId={activeLoadId} onSuccess={closeModal} onCancel={closeModal} />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignModalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      >
        <DialogContent className="max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Vehicle & Driver</DialogTitle>
            <DialogDescription>
              Select an available vehicle and driver to keep your load on schedule.
            </DialogDescription>
          </DialogHeader>

          {assignModalOpen && activeLoadId ? (
            <AssignLoadForm loadId={activeLoadId} onSuccess={closeModal} onCancel={closeModal} />
          ) : null}
        </DialogContent>
      </Dialog>
    </LoadModalsContext.Provider>
  )
}

export function useLoadModals() {
  const context = useContext(LoadModalsContext)
  if (!context) {
    throw new Error("useLoadModals must be used within a LoadModalsProvider")
  }
  return context
}
