import { $ } from "bun";

export const handleUpdate = async (stack: string, composeFile: string) => {
  return (
    await $`docker stack deploy -c ${composeFile} ${stack} --prune --with-registry-auth`.cwd(
      `/home/${process.env.HOME_PATH}/stacks/${stack}`
    )
  ).stderr.toString();
};
