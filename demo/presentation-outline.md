# SupportDesk presentation outline

Use this outline for the slide deck and video introduction. The video should
present the slides first, then perform the live walkthrough in the same order.

## Slides

1. **Project overview** — the helpdesk problem, SupportDesk workflow, and key user flow.
2. **Technology stack** — React, FastAPI, PostgreSQL, Docker, GitHub Actions, AWS, Kubernetes, Helm, Prometheus, Grafana, and ArgoCD.
3. **Architecture** — browser, Nginx, FastAPI, PostgreSQL, metrics, and the AWS/EKS boundary.
4. **CI/CD flow** — commit, tests, frontend build, image build, Trivy, GHCR, and optional Helm deployment.
5. **Infrastructure as Code** — Terraform VPC, subnets, NAT gateway, EKS, and managed nodes.
6. **Kubernetes and Helm** — namespaces, Deployments, Services, PostgreSQL PVC, Ingress, and HPA.
7. **Observability** — `/metrics`, ServiceMonitor, Prometheus target, and Grafana panels.
8. **Security, reliability, and learnings** — non-root images, Trivy gate, health/readiness probes, troubleshooting, and AWS cleanup.

## Live walkthrough order

1. Show the repository structure and explain the SupportDesk domain.
2. Open the browser, create a ticket, advance its status, and show the statistics.
3. Open Swagger and demonstrate the ticket CRUD API.
4. Show `pytest -v` and the isolated test database setup.
5. Trigger a small commit push and show the GitHub Actions run.
6. Show the Docker images, Trivy scans, and GHCR SHA-tagged packages.
7. Show Terraform plan and the AWS VPC/EKS resources, without exposing credentials.
8. Show the ArgoCD SupportDesk application and its sync state.
9. Show Kubernetes Pods, Services, Ingress, HPA, and the Helm release.
10. Show the Prometheus target as `UP` and the populated Grafana dashboard.
11. Apply one troubleshooting manifest, explain the failure, and remove it.
12. Finish by showing `terraform destroy` or explaining that the infrastructure was destroyed after recording.
