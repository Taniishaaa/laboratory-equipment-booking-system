# Server Configuration Specification

Target node: Ubuntu 24.04 (WSL2) managed by Ansible (`inventory.ini`, `playbook.yml`).

| Item | Requirement | Ansible module |
|---|---|---|
| Packages | docker.io, git, curl, python3-docker | apt |
| User | `labbook` (system user, no login shell, member of `docker` group) | user |
| Folders | `/opt/labbook` (application home), `/opt/labbook/src` (source checkout) | file, git |
| Files | `/opt/labbook/app.env` (DATABASE_URL, JWT_SECRET, PORT), mode 0600 | copy |
| Services | `docker` enabled and running | service |
| Containers | `lab-db` (postgres:16, volume `lab-db-data`), `lab-booking` (app image) on network `lab-net` | docker_network, docker_container |
| Ports | 3000/tcp published for the application; 5432 internal to `lab-net` only | docker_container |
| Database | Prisma migrations applied, test data seeded | command |
| Verification | `GET /health` returns HTTP 200 | wait_for, uri |
| Version control | `app_version` variable selects the git branch/tag and image tag | git, docker_image |