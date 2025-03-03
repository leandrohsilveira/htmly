export type Namespaces = Record<string, NamespaceOptions>

export type NamespaceOptions = {
  scanDir: string
}

export type HtmlyConfig = {
  /**
   * The current working directory, defaults to process.cwd()
   */
  cwd?: string

  /**
   * Namespaces are a map of components prefixes to its scan directory
   * @default { app: { scanDir: "./src" } }
   */
  namespaces?: Namespaces
}

type RequiredConfigs = Required<Pick<HtmlyConfig, "namespaces" | "cwd">>

export type ResolvedHtmlyConfig = RequiredConfigs &
  Omit<HtmlyConfig, keyof RequiredConfigs>
