import { $ } from "bun";

export const handleUpdate = async (
  stack: string,
  composeFile: string,
  doPull: boolean
) => {
  const pwd = `${process.env.HOME_PATH}/${stack}`;

  if (doPull) {
    const pullResult = await $`git pull`.cwd(pwd);
    console.log(pullResult.stderr.toString());
  }

  const upd =
    await $`set -a && source .env && set +a && docker stack config -c ${composeFile} | docker stack deploy -c - ${stack} --prune --with-registry-auth`.cwd(
      pwd
    );

  return upd.stdout.toString();
};
