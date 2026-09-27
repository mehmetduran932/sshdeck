import type { ChildProcess, SpawnOptions } from "node:child_process";

export interface SSHProcessSpawner {
  spawn(command: string, args: string[], options: SpawnOptions): ChildProcess;
}

export interface SSHConnectResult {
  exitCode: number;
}
