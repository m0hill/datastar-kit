import { read } from "datastar-kit"

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const readSignals = async <T extends Record<string, unknown>>(request: Request): Promise<T> =>
  (await read.signals(request)) as T
