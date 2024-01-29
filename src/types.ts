declare module "bun" {
  interface Env {
    WEBHOOK_SECRET: string;
    HOME_PATH: string;
  }
}
