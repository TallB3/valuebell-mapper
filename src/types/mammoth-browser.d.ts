declare module 'mammoth/mammoth.browser' {
  interface RawTextResult {
    value: string
  }

  interface ExtractOptions {
    arrayBuffer: ArrayBuffer
  }

  export function extractRawText(options: ExtractOptions): Promise<RawTextResult>
}
