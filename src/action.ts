import * as core from '@actions/core'
import YAML from 'js-yaml'
import fs from 'fs'
import path from 'path'
import {Options} from './options'
import {Octokit} from '@octokit/rest'
import {ChangedFile, createBlobForFile, createNewCommit, createNewTree, currentCommit, repositoryInformation, updateBranch} from './git-commands'

export type YamlNode = {[key: string]: string | number | boolean | YamlNode}

export async function run(options: Options): Promise<void> {
  core.startGroup('YamlUpdateAction')

  const filePath = path.join(process.cwd(), options.workDir, options.valueFile)

  core.info(`FilePath: ${filePath}, Parameter: ${JSON.stringify({cwd: process.cwd(), workDir: options.workDir, valueFile: options.valueFile})}`)

  try {
    const yamlContent: YamlNode = parseFile(filePath)

    core.debug(`Parsed JSON: ${JSON.stringify(yamlContent)}`)

    const result = replace(options.value, options.propertyPath, yamlContent)

    const newYamlContent = convert(result)

    core.info(`Generated updated YAML

${newYamlContent}
`)
    writeTo(newYamlContent, filePath)

    const octokit = new Octokit({auth: options.token})

    const file: ChangedFile = {
      relativePath: options.valueFile,
      absolutePath: filePath,
      content: newYamlContent
    }
    core.endGroup()

    core.startGroup('GitHub Actions')
    await gitProcessing(options.repository, options.branch, file, options.message, octokit)

      await createPullRequest(
        options.repository,
        options.branch,
        options.targetBranch,
        options.labels,
        options.title || `Merge: ${options.message}`,
        options.description,
        octokit
      )
  } catch (error) {
    if (error.message && error.message.includes('A pull request already exists')) {
      core.info(`Pull request already exists. Skipping.`);
    } else {
      core.setFailed(error.message);
    }
  }
}

export async function runTest<T extends YamlNode>(options: Options): Promise<{json: T; yaml: string}> {
  const filePath = path.join(process.cwd(), options.workDir, options.valueFile)

  const yamlContent: T = parseFile<T>(filePath)

  const json = replace<T>(options.value, options.propertyPath, yamlContent)
  const yaml = convert(json)

  return {json, yaml}
}

export function parseFile<T extends YamlNode>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`could not parse file with path: ${filePath}`)
  }

  const result: T = YAML.load(fs.readFileSync(filePath, 'utf8')) as T

  if (typeof result !== 'object') {
    throw new Error(`could not parse content as YAML`)
  }

  return result
}

export function replace<T extends YamlNode>(value: string | number | boolean, valuePath: string, content: YamlNode): T {
  const contentCopy = JSON.parse(JSON.stringify(content))
  let scope: YamlNode = contentCopy
  let level = 0

  const yamlPath = valuePath.split('.')

  for (const key of yamlPath) {
    level++

    if (typeof scope[key] !== 'object' && level !== yamlPath.length) {
      throw new Error(`invalid property path - ${key} is not an object`)
    }

    if (false === scope.hasOwnProperty(key)) {
      scope[key] = {}
    }

    if (level !== yamlPath.length) {
      scope = scope[key] as YamlNode
    }

    if (level === yamlPath.length) {
      scope[key] = value
    }
  }

  return contentCopy
}

export function convert(yamlContent: YamlNode): string {
  return YAML.dump(yamlContent, {lineWidth: -1})
}

export function writeTo(yamlString: string, filePath: string): void {
  fs.writeFile(filePath, yamlString, err => {
    if (!err) return

    core.warning(err.message)
  })
}

export async function gitProcessing(
  repository: string,
  branch: string,
  file: ChangedFile,
  commitMessage: string,
  octokit: Octokit,
): Promise<void> {
  const {owner, repo} = repositoryInformation(repository)
  const {commitSha, treeSha} = await currentCommit(octokit, owner, repo, branch)

  core.debug(JSON.stringify({baseCommit: commitSha, baseTree: treeSha}))

  file.sha = await createBlobForFile(octokit, owner, repo, file)

  core.debug(JSON.stringify({fileBlob: file.sha}))

  const newTreeSha = await createNewTree(octokit, owner, repo, file, treeSha)

  core.debug(JSON.stringify({createdTree: newTreeSha}))

  const newCommitSha = await createNewCommit(octokit, owner, repo, commitMessage, newTreeSha, commitSha)

  core.debug(JSON.stringify({createdCommit: newCommitSha}))
  core.setOutput('commit', newCommitSha)

  await updateBranch(octokit, owner, repo, branch, newCommitSha)

  core.debug(`Complete`)
}

export async function createPullRequest(
  repository: string,
  branch: string,
  targetBranch: string,
  labels: string[],
  title: string,
  description: string,
  octokit: Octokit,
): Promise<void> {
  const {owner, repo} = repositoryInformation(repository)

  const response = await octokit.pulls.create({
    owner,
    repo,
    title,
    head: branch,
    base: targetBranch,
    body: description
  })

  core.info(`Create PR: #${JSON.stringify(response.data.html_url)}`)

  core.setOutput('pull_request', JSON.stringify(response.data))

  octokit.issues.addLabels({
    owner,
    repo,
    issue_number: response.data.number,
    labels
  })

  core.debug(`Add Label: ${labels.join(', ')}`)
}
