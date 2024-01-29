import { Elysia, t } from "elysia";
import { handleUpdate } from "./update-handler";

const app = new Elysia();

app.get("/", () => "Hello Elysia");
app.post(
  "/update/:secret",
  ({ set, params: { secret }, body: { stack, composeFile } }) => {
    console.log(123, process.env.WEBHOOK_SECRET, secret);

    if (secret !== process.env.WEBHOOK_SECRET) {
      set.status = 401;
      throw new Error("Unauthorized");
    }
    return handleUpdate(stack, composeFile);
  },
  {
    body: t.Object({
      stack: t.String(),
      composeFile: t.String(),
    }),
  }
);

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
