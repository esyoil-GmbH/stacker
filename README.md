<br/>
<p align="center">
  <a href="https://github.com/esyoil-gmbh/stacker">
    <img src="https://agital.online/_nuxt/agital-online-logo.8b5e0ebf.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Stacker</h3>

  <p align="center">
    Bun project to remotely update docker stacks
    <br/>
    <br/>
    <a href="https://github.com/esyoil-gmbh/stacker"><strong>Explore the docs »</strong></a>
    <br/>
    <br/>
    <a href="https://github.com/esyoil-gmbh/stacker/issues">Report Bug</a>
    .
    <a href="https://github.com/esyoil-gmbh/stacker/issues">Request Feature</a>
  </p>
</p>

## About The Project

This project provides a docker container that updates your docker swarm stacks via Webhook. You can specify the name of the stack and the compose file that's going to be used. After deploying, it monitors the rollout progress and streams live status updates as NDJSON until all services converge (or a failure/timeout is detected).

## Built With

This project wouldn't be possible without:

- [Bun](https://bun.sh/)
- [Elysia](https://elysiajs.com/)
- [Docker Swarm](https://docs.docker.com/engine/swarm/)

## Usage

Have a look at the `docker-compose.yml` file, it should tell you everything needed to get started.

### Environment variables

`WEBHOOK_SECRET`: This value is used to make access to the API secure. It needs to match exactly. Make sure your toolchain (curl, proxy, etc) support transport of letter-caseing.
`HOME_PATH`: The directory where all the compose-files are located.

### Sending a request

By default, the service starts on port 3000, see the `ports` binding in the compose file. You can of course proxy it to get SSL.

```sh
curl -N \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"stack": "my-project", "composeFile": "docker-compose.dev.yml", "gitPull": true}' \
  http://1.2.3.4:3000/update/super-secret-value
```

#### Request body

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `stack` | string | yes | | Name of the stack (matches the directory name) |
| `composeFile` | string | yes | | Compose file to use for deployment |
| `gitPull` | boolean | yes | | Whether to `git pull` before deploying |
| `monitorTimeout` | number | no | `600` | Rollout monitoring timeout in seconds |

#### Response

The response is streamed as [NDJSON](https://github.com/ndjson/ndjson-spec) (`application/x-ndjson`) — one JSON object per line. Use `curl -N` to see lines as they arrive.

```jsonl
{"type":"deploy","output":"Creating service app_web\n"}
{"type":"progress","elapsed":0,"services":[{"name":"app_web","replicas":"1/3","state":"updating"}]}
{"type":"progress","elapsed":10,"services":[{"name":"app_web","replicas":"2/3","state":"updating"}]}
{"type":"progress","elapsed":20,"services":[{"name":"app_web","replicas":"3/3","state":"completed"}]}
{"type":"result","ok":true,"elapsed":20,"services":[{"name":"app_web","replicas":"3/3","state":"completed"}]}
```

The last line is always a `result` event. Check `ok` to determine if the rollout succeeded. On failure, an `error` field describes the reason (rollback, timeout, etc.).

### Directory structure

You simply send a post-request to the service, the secret being in the path. The directory structure is assumed to be like the following graph (all the values are configurable via the `volumes` and `environment` variable `HOME_PATH`):

```
/home/ops/
└── stacks/
    ├── my-project/
    │   ├── docker-compose.dev.yml
    │   └── docker-compose.prod.yml
    └── my-other-project/
        ├── docker-compose.staging.yml
        └── docker-compose.local.yml
```
