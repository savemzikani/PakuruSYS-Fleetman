declare module "vitest/config" {
  export function defineConfig(config: unknown): unknown
}

declare module "@vitejs/plugin-react" {
  const plugin: (...args: unknown[]) => unknown
  export default plugin
}
