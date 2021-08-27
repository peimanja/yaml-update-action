/* eslint-disable no-console */
import * as core from '@actions/core'

export interface Actions {
  debug(message: string): void
  info(message: string): void
  warning(message: string): void
  startGroup(message: string): void
  endGroup(): void
  setOutput(name: string, output: string): void
  setFailed(message: string): void
}

export class GitHubActions implements Actions {
  debug(message: string): void {
    core.debug(message)
  }

  info(message: string): void {
    core.info(message)
  }

  warning(message: string): void {
    core.warning(message)
  }

  startGroup(message: string): void {
    core.startGroup(message)
  }

  endGroup(): void {
    core.endGroup()
  }

  setOutput(name: string, output: string): void {
    core.setOutput(name, output)
  }

  setFailed(message: string): void {
    core.setFailed(message)
  }
}
