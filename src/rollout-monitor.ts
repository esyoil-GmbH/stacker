import { $ } from "bun";

interface ServiceStatus {
  name: string;
  replicas: string;
  state: string;
}

interface ProgressEvent {
  type: "progress";
  elapsed: number;
  services: ServiceStatus[];
}

interface ResultEvent {
  type: "result";
  ok: boolean;
  elapsed: number;
  services: ServiceStatus[];
  error?: string;
}

export type RolloutEvent = ProgressEvent | ResultEvent;

async function getServiceStatus(service: string): Promise<ServiceStatus> {
  const [inspectResult, lsResult] = await Promise.all([
    $`docker service inspect ${service} --format ${"{{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}-{{end}}"}`.nothrow().quiet(),
    $`docker service ls --filter ${`name=${service}`} --format ${"{{.Replicas}}"}`.nothrow().quiet(),
  ]);

  const state = inspectResult.exitCode === 0
    ? inspectResult.stdout.toString().trim()
    : "unknown";

  const replicas = lsResult.exitCode === 0
    ? lsResult.stdout.toString().trim().split("\n")[0]
    : "0/0";

  return { name: service, replicas, state };
}

export async function* monitorRollout(
  stack: string,
  timeoutSeconds: number = 600,
  intervalSeconds: number = 10
): AsyncGenerator<RolloutEvent> {
  const listResult = await $`docker stack services ${stack} --format ${"{{.Name}}"}`.nothrow().quiet();

  if (listResult.exitCode !== 0) {
    yield {
      type: "result",
      ok: false,
      elapsed: 0,
      services: [],
      error: `Failed to list services: ${listResult.stderr.toString().trim()}`,
    };
    return;
  }

  const serviceNames = listResult.stdout.toString().trim().split("\n").filter(Boolean);

  if (serviceNames.length === 0) {
    yield {
      type: "result",
      ok: false,
      elapsed: 0,
      services: [],
      error: "No services found in stack",
    };
    return;
  }

  const startTime = Date.now();
  let seenUpdating = false;
  const GRACE_PERIOD = 30; // seconds to wait for Swarm to start updating

  while (true) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const statuses = await Promise.all(serviceNames.map(getServiceStatus));

    // Fail-fast on rollback or paused
    for (const svc of statuses) {
      if (svc.state.startsWith("rollback_") || svc.state === "paused") {
        yield { type: "progress", elapsed, services: statuses };
        yield {
          type: "result",
          ok: false,
          elapsed,
          services: statuses,
          error: `Service ${svc.name} entered state: ${svc.state}`,
        };
        return;
      }
    }

    // Track if we've seen any service enter "updating" state
    if (statuses.some((svc) => svc.state === "updating")) {
      seenUpdating = true;
    }

    const allConverged = statuses.every((svc) => {
      const [running, desired] = svc.replicas.split("/");
      return running === desired && svc.state !== "updating";
    });

    // Only declare success if we've seen an update in progress first,
    // or the grace period has passed (handles no-op deploys)
    if (allConverged && (seenUpdating || elapsed >= GRACE_PERIOD)) {
      yield { type: "progress", elapsed, services: statuses };
      yield { type: "result", ok: true, elapsed, services: statuses };
      return;
    }

    yield { type: "progress", elapsed, services: statuses };

    if (elapsed >= timeoutSeconds) {
      yield {
        type: "result",
        ok: false,
        elapsed,
        services: statuses,
        error: `Timed out after ${timeoutSeconds}s`,
      };
      return;
    }

    await Bun.sleep(intervalSeconds * 1000);
  }
}
