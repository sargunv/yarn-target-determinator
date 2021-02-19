import * as exec from '@actions/exec'

export interface YarnWorkspacesListItem {
  location: string
  name: string
  workspaceDependencies: string[]
}

const listYarnWorkspaces = async (): Promise<YarnWorkspacesListItem[]> => {
  const buf: Buffer[] = []
  await exec.exec('yarn workspaces', ['list', '-v', '--json'], {
    silent: true,
    listeners: {
      stdout: data => {
        buf.push(data)
      }
    }
  })
  return buf
    .join('')
    .trim()
    .split('\n')
    .map(str => JSON.parse(str))
}

export default listYarnWorkspaces
