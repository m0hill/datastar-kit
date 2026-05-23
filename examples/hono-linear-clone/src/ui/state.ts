import { ds } from "datastar-kit"
import { appSignals, authSignals } from "../features/validation.js"

export const authState = ds.state(authSignals)
export const appState = ds.state(appSignals)
