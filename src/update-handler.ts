import { $ } from "bun";

export const handleUpdate = async (
  stack: string,
  composeFile: string,
  doPull: boolean
) => {
  const pwd = `${process.env.HOME_PATH}/stacks/${stack}`;

  if (doPull) {
    const pullResult = await $`git pull`.cwd(pwd);
    console.log(pullResult.stderr.toString());
  }

  const upd =
    await $`docker stack deploy -c ${composeFile} ${stack} --prune --with-registry-auth`.cwd(
      pwd
    );

  return upd.stdout.toString();
};
