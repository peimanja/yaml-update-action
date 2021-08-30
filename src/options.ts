import * as core from '@actions/core'
import * as process from 'process'

export interface Options {
  workDir: string
  valueFile: string
  propertyPath: string
  value: string | number | boolean
  token: string
  branch: string
  message: string
  title: string
  description: string
  labels: string[]
  targetBranch: string
  repository: string
}

export class GitHubOptions implements Options {
  get workDir(): string {
    return core.getInput('workDir')
  }

  get valueFile(): string {
    return core.getInput('valueFile')
  }

  get propertyPath(): string {
    return core.getInput('propertyPath')
  }

  get value(): string {
    return core.getInput('value')
  }

  get branch(): string {
    return core.getInput('branch')
  }

  get targetBranch(): string {
    return core.getInput('targetBranch')
  }

  get repository(): string {
    return core.getInput('repository')
  }

  get token(): string {
    return core.getInput('token')
  }

  get message(): string {
    return core.getInput('message')
  }

  get title(): string {
    return core.getInput('title')
  }

  get description(): string {
    return core.getInput('description')
  }

  get labels(): string[] {
    let labels = []
    if (core.getInput('automerge') === 'true') {
      labels.push('auto-merge')
    }

    if (!core.getInput('labels')) return labels

    labels = labels.concat(core
      .getInput('labels')
      .split(',')
      .map(label => label.trim())
      .filter(label => !!label)
    )
    return labels
  }
}

export class EnvOptions implements Options {
  get workDir(): string {
    return process.env.WORK_DIR || '.'
  }

  get valueFile(): string {
    return process.env.VALUE_FILE || ''
  }

  get propertyPath(): string {
    return process.env.VALUE_PATH || ''
  }

  get value(): string {
    return process.env.VALUE || ''
  }

  get branch(): string {
    return process.env.BRANCH || ''
  }

  get targetBranch(): string {
    return process.env.TARGET_BRANCH || ''
  }

  get token(): string {
    return process.env.TOKEN || ''
  }

  get message(): string {
    return process.env.MESSAGE || ''
  }

  get title(): string {
    return process.env.TITLE || ''
  }

  get description(): string {
    return process.env.DESCRIPTION || ''
  }

  get labels(): string[] {
    let labels = []
    if (process.env.AUTOMERGE === 'true') {
      labels.push('auto-merge')
    }
    return labels.concat((process.env.LABELS || '')
      .split(',')
      .map(label => label.trim())
      .filter(label => !!label), labels)
  }

  get repository(): string {
    return process.env.REPOSITORY || ''
  }
}
