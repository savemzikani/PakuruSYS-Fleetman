import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

describe("cn utility", () => {
  it("combines class names and removes duplicates", () => {
    const result = cn("px-2", "py-1", "px-2", { "text-sm": true, "hidden": false })

    const classes = result.split(" ")
    expect(new Set(classes)).toEqual(new Set(["px-2", "py-1", "text-sm"]))
    expect(classes.includes("hidden")).toBe(false)
  })
})
