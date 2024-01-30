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

This project provides a docker container that - put simply - updates your docker swarm stacks via Webhook. You can specify the name of the stack and the compose file that's going to be used.

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
curl \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"stack": "my-project", "composeFile": "docker-compose.dev.yml", "gitPull": true}' \
  http://1.2.3.4:3000/update/super-secret-value
```

You simply send a post-request to the service, the secret being in the path. The directory structure is assumes to be like the following graph (all the values are configurable via the `volumes` and `environment` variable `HOME_PATH`):

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
