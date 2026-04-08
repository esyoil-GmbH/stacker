import { $ } from "bun";
import { expect, test, describe } from "bun:test";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const dotenv = require("dotenv");

async function createTempEnv(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "stacker-test-"));
  await writeFile(join(dir, ".env"), content);
  return dir;
}

describe("env loading: dotenv + Bun .env()", () => {
  test("simple key=value", async () => {
    const dir = await createTempEnv("FOO=bar\n");
    const parsed = dotenv.parse(await Bun.file(join(dir, ".env")).text());
    const result = await $`echo $FOO`.env({ ...process.env, ...parsed }).text();
    expect(result.trim()).toBe("bar");
    await rm(dir, { recursive: true });
  });

  test("quoted values with spaces", async () => {
    const dir = await createTempEnv('GREETING="hello world"\n');
    const parsed = dotenv.parse(await Bun.file(join(dir, ".env")).text());
    const result = await $`echo $GREETING`.env({ ...process.env, ...parsed }).text();
    expect(result.trim()).toBe("hello world");
    await rm(dir, { recursive: true });
  });

  test("single-quoted values", async () => {
    const dir = await createTempEnv("SECRET='s3cr3t!@#'\n");
    const parsed = dotenv.parse(await Bun.file(join(dir, ".env")).text());
    const result = await $`echo $SECRET`.env({ ...process.env, ...parsed }).text();
    expect(result.trim()).toBe("s3cr3t!@#");
    await rm(dir, { recursive: true });
  });

  test("values with equals signs", async () => {
    const dir = await createTempEnv("CONN=postgres://user:pass@host/db?opt=1\n");
    const parsed = dotenv.parse(await Bun.file(join(dir, ".env")).text());
    const result = await $`echo $CONN`.env({ ...process.env, ...parsed }).text();
    expect(result.trim()).toBe("postgres://user:pass@host/db?opt=1");
    await rm(dir, { recursive: true });
  });

  test("comments and blank lines are ignored", async () => {
    const dir = await createTempEnv("# comment\nA=1\n\n# another\nB=2\n");
    const parsed = dotenv.parse(await Bun.file(join(dir, ".env")).text());
    const result = await $`echo $A $B`.env({ ...process.env, ...parsed }).text();
    expect(result.trim()).toBe("1 2");
    await rm(dir, { recursive: true });
  });

  test("multiple vars available to a single command", async () => {
    const dir = await createTempEnv("HOST=localhost\nPORT=5432\nDB=mydb\n");
    const parsed = dotenv.parse(await Bun.file(join(dir, ".env")).text());
    const result = await $`echo $HOST:$PORT/$DB`.env({ ...process.env, ...parsed }).text();
    expect(result.trim()).toBe("localhost:5432/mydb");
    await rm(dir, { recursive: true });
  });

  test("overrides process.env", async () => {
    const dir = await createTempEnv("PATH=/custom/path\n");
    const parsed = dotenv.parse(await Bun.file(join(dir, ".env")).text());
    const result = await $`echo $PATH`.env({ ...process.env, ...parsed }).text();
    expect(result.trim()).toBe("/custom/path");
    await rm(dir, { recursive: true });
  });

  test("preserves process.env when not overridden", async () => {
    const dir = await createTempEnv("CUSTOM=value\n");
    const parsed = dotenv.parse(await Bun.file(join(dir, ".env")).text());
    const result = await $`echo $HOME`.env({ ...process.env, ...parsed }).text();
    expect(result.trim()).toBe(process.env.HOME);
    await rm(dir, { recursive: true });
  });
});

describe("parity: dotenv vs bash source", () => {
  const envContent = [
    'APP_PORT=3000',
    'DB_HOST="db.example.com"',
    'DB_PASSWORD=CrD7sgGsd1Phd4jM',
    'REDIS_HOST=redis',
    'NODE_ENV=development',
    'TRACE_DSN=https://cfa66f7e@trace.example.de/3',
    'STRAPI_APP_KEYS=yKj0l3h9yF2j509t1Q3IEg==,boMEAbQeXBeKAe0sdKLqpg==',
    '# this is a comment',
    '',
    'TZ=Europe/Berlin',
  ].join("\n") + "\n";

  const vars = ["APP_PORT", "DB_HOST", "DB_PASSWORD", "REDIS_HOST", "NODE_ENV", "TRACE_DSN", "STRAPI_APP_KEYS", "TZ"];

  test("both approaches produce the same values", async () => {
    const dir = await createTempEnv(envContent);
    const printCmd = vars.map((v) => `echo "${v}=$${v}"`).join(" && ");

    const parsed = dotenv.parse(await Bun.file(join(dir, ".env")).text());
    const dotenvResult = await $`bash -c ${printCmd}`.env({ ...process.env, ...parsed }).text();
    const sourceResult = await $`bash -c ${"set -a && source " + dir + "/.env && set +a && " + printCmd}`.text();

    expect(dotenvResult.trim()).toBe(sourceResult.trim());
    await rm(dir, { recursive: true });
  });
});
