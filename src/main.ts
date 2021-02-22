import * as core from "@actions/core";

import listYarnWorkspaces from "./listYarnWorkspaces";
import YarnGraph from "./YarnGraph";

const main = async (): Promise<void> => {
  try {
    const files: string[] = JSON.parse(
      core.getInput("files", { required: true })
    );

    core.info("Building worktree dependency graph");
    const graph = new YarnGraph(await listYarnWorkspaces());

    core.startGroup("Identifying directly modified workspaces");
    const changedWorkspaces = await graph.getWorkspacesForFiles(...files);
    core.endGroup();
    core.info(`Affected workspaces [${changedWorkspaces.join(", ")}]`);

    core.startGroup("Identifying dependent workspaces");
    const targetWorkspaces = graph.getRecursiveDependents(...changedWorkspaces);
    core.endGroup();
    core.info(`Target workspaces [${targetWorkspaces.join(", ")}]`);

    core.setOutput("targets", targetWorkspaces);
  } catch (err) {
    core.setFailed(err);
  }
};

main();
