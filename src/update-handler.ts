import { $ } from "bun";
import { monitorRollout, type RolloutEvent } from "./rollout-monitor";
const dotenv = require("dotenv");

export const handleUpdate = async (
  stack: string,
  composeFile: string,
  doPull: boolean,
  monitorTimeout: number = 600
): Promise<Response> => {
  const pwd = `${process.env.HOME_PATH}/${stack}`;

  if (doPull) {
    const pullResult = await $`git pull`.cwd(pwd);
    console.log(pullResult.stderr.toString());
  }

  let confs = {};
  try {
    const file = await Bun.file(`${pwd}/.env`).text();
    confs = dotenv.parse(file);
  } catch (e) {
    //
  }

  const upd =
    await $`docker stack deploy -c ${composeFile} ${stack} --prune --with-registry-auth`
      .cwd(pwd)
      .env({ ...process.env, ...confs });

  const deployOutput = upd.stdout.toString();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      write({ type: "deploy", output: deployOutput });

      for await (const event of monitorRollout(stack, monitorTimeout)) {
        write(event);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
};
