import { $ } from "bun";
const dotenv = require("dotenv");

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

  let confs = {};
  try {
    const file = await Bun.file(`${pwd}/.env`).text();
    confs = dotenv.parse(file);
  } catch (e) {
    //
  }

  const upd =
    await $`env $(cat .env | xargs) && docker stack deploy -c ${composeFile} ${stack} --prune --with-registry-auth`
      .cwd(pwd)
      .env({ ...confs });

  return upd.stdout.toString();
};
