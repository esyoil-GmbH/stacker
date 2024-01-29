import { Elysia, t } from "elysia";
import { handleUpdate } from "./update-handler";

const app = new Elysia();

app.get("/", () => "Hello Elysia");
app.post(
  "/update/:secret",
  ({ set, params: { secret }, body: { stack, composeFile, gitPull } }) => {
    if (secret !== process.env.WEBHOOK_SECRET) {
      set.status = 401;
      throw new Error("Unauthorized");
    }
    return handleUpdate(stack, composeFile, gitPull!);
  },
  {
    body: t.Object({
      stack: t.String(),
      composeFile: t.String(),
      gitPull: t.Boolean(),
    }),
  }
);

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
