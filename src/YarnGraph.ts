import {assert} from 'console'
import path from 'path'

import * as core from '@actions/core'
import pkgDir from 'pkg-dir'

import {YarnWorkspacesListItem} from './listYarnWorkspaces'

interface GraphNodes {
  workspaceId: string
  workspaceDir: string
  dependencies: string[]
  dependents: string[]
}

type Graph = Record<string, GraphNodes>
type Graphs = {byId: Graph; byDir: Graph}

export default class YarnGraph {
  graph: Graphs

  constructor(workspaceList: YarnWorkspacesListItem[]) {
    this.graph = this.buildGraph(workspaceList)
  }

  getRecursiveDependents(...initialIds: string[]): string[] {
    const resultSet = new Set<string>()

    // standard depth-first search
    const queue = [...initialIds]
    for (const id of queue) {
      if (!resultSet.has(id)) {
        const node = this.graph.byId[id]
        if (node == null) {
          throw new Error(`Workspace '${id}' not registered in root worktree`)
        }
        resultSet.add(id)
        for (const dependent of node.dependents) {
          core.info(`${dependent} depends on ${node.workspaceId}`)
        }
        queue.push(...node.dependents)
      }
    }

    return [...resultSet]
  }

  async getWorkspacesForFiles(...files: string[]): Promise<string[]> {
    const resultSet = new Set<string>()

    const workspaceDirs = new Set(
      await Promise.all(
        files.map(async file => {
          const workspaceDir = await pkgDir(path.dirname(path.resolve(file)))
          if (workspaceDir !== undefined) {
            core.info(`Found workspace '${workspaceDir}' for file '${file}'`)
          } else {
            core.warning(`Workspace not found for file '${file}'`)
          }
          return workspaceDir
        })
      )
    )

    for (const workspaceDir of workspaceDirs) {
      if (workspaceDir === undefined) continue
      const workspaceId = this.getWorkspaceId(workspaceDir)
      core.info(`Workspace '${workspaceDir}' identified as ${workspaceId}`)
      resultSet.add(workspaceId)
    }

    return [...resultSet]
  }

  private getWorkspaceId(dir: string): string {
    const id = this.graph.byDir[path.resolve(dir)]?.workspaceId
    if (id == null) {
      throw new Error(`Workspace at '${dir}' not registered in root worktree`)
    }
    return id
  }

  private buildGraph(items: YarnWorkspacesListItem[]): Graphs {
    const graphById: Graph = {}
    const dirToId: Record<string, string> = {}

    // build initial graph with dependency links
    for (const item of items) {
      const node = (graphById[item.name] = {
        workspaceId: item.name,
        workspaceDir: path.resolve(item.location),
        dependencies: item.workspaceDependencies,
        dependents: []
      })
      dirToId[node.workspaceDir] = node.workspaceId
    }

    // build the reverse dependency links
    for (const item of items) {
      const name = item.name
      for (const depLocation of item.workspaceDependencies) {
        graphById[dirToId[path.resolve(depLocation)]].dependents.push(name)
      }
    }

    // populate the graph with directory lookup too
    const graphByDir: Graph = {}
    for (const id in graphById) {
      const node = graphById[id]
      graphByDir[node.workspaceDir] = node
    }

    return {byId: graphById, byDir: graphByDir}
  }
}
