# SupportDesk

SupportDesk is a small helpdesk ticket-management platform built to demonstrate
an end-to-end DevSecOps delivery workflow. A support team can create tickets,
assign ownership, move tickets through a resolution lifecycle, and monitor the
health of the API.

The application is intentionally small enough to understand during a live demo,
but includes the same delivery controls used by a production-style service:

```text
React + Nginx → FastAPI → PostgreSQL
       │           │
       └────── Docker Compose (local)

GitHub → Actions → pytest/frontend build → Docker → Trivy → GHCR
                                           │
                         Terraform → AWS VPC + EKS
                                           │
                         Helm → Kubernetes → Ingress/HPA
                                           │
                              Prometheus + Grafana
```

## Technology stack

- **Frontend:** React, Vite, responsive CSS, Nginx
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Pydantic
- **Database:** PostgreSQL 16, Alembic migrations
- **Quality:** Pytest, isolated SQLite test database
- **Packaging:** Docker and Docker Compose
- **CI/CD:** GitHub Actions, GitHub Container Registry
- **Security:** Trivy image scanning for HIGH and CRITICAL vulnerabilities
- **Infrastructure:** Terraform, AWS VPC, Amazon EKS
- **Platform:** Kubernetes, Helm, Ingress, HPA
- **Observability:** Prometheus, Grafana, Prometheus ServiceMonitor
- **GitOps:** ArgoCD application manifest

## Repository structure

```text
backend/                 FastAPI service, migrations, and pytest tests
frontend/                React application and unprivileged Nginx image
helm/taskboard/          SupportDesk Helm chart
k8s/                     Kubernetes bootstrap namespace
terraform/               AWS VPC and EKS infrastructure
monitoring/              Prometheus values and Grafana dashboard
argocd/                  ArgoCD Application manifest
troubleshooting/         Deliberately broken Kubernetes examples
scripts/                 Small traffic generator for metrics demos
demo/                    Presentation and evidence checklist
.github/workflows/       CI/CD workflow
docker-compose.yml       Full local stack
```

## Application flow

Support agents work with tickets using these states:

```text
OPEN → IN_PROGRESS → WAITING → RESOLVED
```

The dashboard supports filtering, ticket creation, status advancement, ticket
deletion, priority/category labels, loading states, and an API error state.

## REST API

When the backend is running, Swagger is available at `http://localhost:8000/docs`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Service metadata |
| GET | `/health` | Liveness check |
| GET | `/ready` | Database readiness check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/tickets` | List tickets |
| GET | `/api/tickets/{id}` | Read one ticket |
| POST | `/api/tickets` | Create a ticket |
| PUT | `/api/tickets/{id}` | Partially update a ticket |
| DELETE | `/api/tickets/{id}` | Delete a ticket |
| GET | `/api/tickets/stats` | Ticket counts by lifecycle state |

Example ticket payload:

```json
{
  "subject": "Cannot access the customer portal",
  "description": "The portal returns a blank page after sign in.",
  "priority": "HIGH",
  "category": "TECHNICAL",
  "requester": "Asha Customer",
  "assignee": "Support Team"
}
```

## Run locally with Docker Compose

Requirements:

- Docker Desktop or Docker Engine with Compose

Start the complete stack:

```bash
docker compose up --build
```

Open the application at <http://localhost:3000>. The API is available at:

- <http://localhost:8000/docs>
- <http://localhost:8000/health>
- <http://localhost:8000/ready>
- <http://localhost:8000/metrics>

The backend waits for PostgreSQL to become healthy, runs Alembic migrations,
and then starts Uvicorn. Both application containers run as non-root users.

Stop the stack:

```bash
docker compose down
```

Delete the local PostgreSQL volume as well:

```bash
docker compose down -v
```

## Run backend tests

The tests do not use the production PostgreSQL database. They override the
FastAPI database dependency with an isolated in-memory SQLite database.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -v
```

The test suite covers health and readiness checks, ticket creation, listing,
reading, updating, statistics, deletion, validation, and not-found behavior.

## Run the frontend directly

```bash
cd frontend
npm ci
npm run dev
```

The Vite development server runs on port `5173` and proxies `/api` to a
backend on `http://localhost:8000`.

Build the production bundle:

```bash
npm run build
```

## CI/CD pipeline

`.github/workflows/ci-cd.yml` runs for pull requests and pushes to `main`.

```text
test
 ├─ pytest -v
 └─ npm install && npm run build
       ↓
build-scan-push
 ├─ build SupportDesk backend image
 ├─ build SupportDesk frontend image
 ├─ Trivy backend scan
 ├─ Trivy frontend scan
 └─ push SHA-tagged images to GHCR on main
       ↓
deploy (opt-in)
 └─ helm upgrade --install against EKS
```

Images are tagged with the Git commit SHA, for example:

```text
ghcr.io/singireddyshreyas/supportdesk-backend:<commit-sha>
ghcr.io/singireddyshreyas/supportdesk-frontend:<commit-sha>
```

The Trivy steps scan both images and use `exit-code: "1"` for HIGH or CRITICAL
findings with an upstream fix available. Unfixed findings remain visible in the
scan output but do not block promotion because there is no remediation to apply.
The deploy job is intentionally opt-in: set the
repository variable `ENABLE_EKS_DEPLOY=true` and add a base64-encoded
`KUBE_CONFIG_DATA` secret only after the EKS cluster is ready.

## Docker images

Build locally:

```bash
docker build -t supportdesk-backend:local ./backend
docker build -t supportdesk-frontend:local ./frontend
```

The backend uses a Python slim image and a non-root `appuser`. The frontend is
a multi-stage Node build served by `nginxinc/nginx-unprivileged` on port 8080.

## Terraform and AWS

Terraform provisions:

- A VPC with two public and two private subnets.
- A single NAT gateway for the private subnets.
- An EKS control plane in the private subnets.
- A managed node group with two desired `t3.medium` worker nodes.

Terraform is not executed automatically because it creates billable resources.
Install Terraform and configure AWS credentials outside the repository first.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
aws eks update-kubeconfig --region ap-south-1 --name supportdesk-eks
```

When the demonstration is complete, remove the infrastructure:

```bash
terraform destroy
```

Never commit AWS access keys, secret keys, kubeconfigs, or a real
`terraform.tfvars` file.

## Kubernetes and Helm

The Helm chart is the canonical application deployment. It creates PostgreSQL,
backend and frontend Deployments, ClusterIP Services, a PVC, an Ingress, an
HPA, and (when enabled) a Prometheus ServiceMonitor.

The cluster must have the platform dependencies installed before the production
values are used:

```bash
# Local Minikube option
minikube addons enable ingress
minikube addons enable metrics-server

# Generic Kubernetes / EKS option for NGINX Ingress and Metrics Server
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
helm upgrade --install metrics-server metrics-server/metrics-server \
  --namespace kube-system
```

For EKS, configure the AWS Load Balancer Controller or the NGINX controller
according to the cluster networking choice. The chart uses
`ingressClassName: nginx`. The HPA requires Metrics Server, and PostgreSQL's
PVC requires a default StorageClass. On EKS, install the EBS CSI driver and
set `postgres.storageClass` to the approved StorageClass such as `gp3`.

For an AWS-independent local rehearsal, Minikube can provide the same
Kubernetes interfaces:

```bash
minikube start --driver=docker --memory=4096 --cpus=2
minikube addons enable ingress
minikube addons enable metrics-server
minikube image load supportdesk-backend:local
minikube image load supportdesk-frontend:local
helm upgrade --install supportdesk ./helm/taskboard \
  --namespace supportdesk --create-namespace \
  -f helm/taskboard/values-dev.yaml \
  --set-string backend.image=supportdesk-backend \
  --set-string backend.tag=local \
  --set-string frontend.image=supportdesk-frontend \
  --set-string frontend.tag=local \
  --wait
```

Render and validate the chart without a cluster:

```bash
helm template supportdesk ./helm/taskboard \
  --namespace supportdesk \
  -f helm/taskboard/values-dev.yaml \
  | kubeconform -strict -summary -ignore-missing-schemas
```

Install the namespace and chart:

```bash
kubectl apply -f k8s/namespace.yaml
helm lint ./helm/taskboard
helm upgrade --install supportdesk ./helm/taskboard \
  --namespace supportdesk \
  --create-namespace \
  -f helm/taskboard/values-dev.yaml \
  --wait
```

The development values intentionally disable the ServiceMonitor so the chart
can be installed before Prometheus Operator CRDs exist. Install Prometheus
first and use `values-prod.yaml` when the ServiceMonitor should be created:

```bash
helm upgrade --install supportdesk ./helm/taskboard \
  --namespace supportdesk \
  --create-namespace \
  -f helm/taskboard/values-prod.yaml \
  --wait
```

Inspect the release:

```bash
kubectl get pods -n supportdesk
kubectl get svc -n supportdesk
kubectl get ingress -n supportdesk
kubectl get hpa -n supportdesk
helm list -n supportdesk
```

The development Ingress host is `supportdesk.local`. Add the Ingress controller
address to `/etc/hosts` when using a local cluster, or use the external address
provided by the controller in EKS.

The HPA requires a metrics provider such as Metrics Server. Normal health
requests may not create enough CPU load to scale; use the helper below for a
controlled demonstration:

```bash
URL=http://supportdesk.local/api/tickets ./scripts/load-test.sh
```

## ArgoCD GitOps

`argocd/supportdesk-application.yaml` points ArgoCD at the production Helm
values on the `main` branch. Install Prometheus Operator before syncing so the
ServiceMonitor CRD exists:

```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl wait --for=condition=available deployment/argocd-server \
  -n argocd --timeout=5m
kubectl apply -f argocd/supportdesk-application.yaml
argocd app get supportdesk
argocd app sync supportdesk
```

`values.yaml` keeps `dev` image tags as local placeholders. The checked-in
ArgoCD Application pins both images to the same published commit SHA for the
current demonstration. After each successful GHCR publish, update both
ArgoCD parameters to the new SHA before syncing. CI publishes only SHA-tagged
images, so ArgoCD must reference a real SHA before it can start the
application. If GHCR packages are private, configure an image pull secret in
the `supportdesk` namespace without committing the token.

## Prometheus and Grafana

Install the Prometheus/Grafana stack using the supplied values:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f monitoring/prometheus-values.yaml
```

Apply the dashboard ConfigMap after the monitoring namespace exists:

```bash
kubectl apply -f monitoring/grafana-dashboard-configmap.yaml
```

The SupportDesk backend ServiceMonitor scrapes `/metrics`. Verify the endpoint
and Prometheus target:

```bash
curl http://<backend-address>/metrics
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
```

The dashboard source is also stored in `monitoring/supportdesk-dashboard.json`.
It includes request rate, error rate, p95 latency, and recent request count
panels.

## Troubleshooting exercises

The deliberately broken manifests are safe teaching exercises:

```bash
kubectl apply -f troubleshooting/broken-image.yaml
kubectl get pods -n supportdesk
kubectl describe pod -n supportdesk <pod-name>
kubectl get events -n supportdesk --sort-by=.lastTimestamp
```

For the broken Service exercise:

```bash
kubectl apply -f troubleshooting/broken-service.yaml
kubectl get svc -n supportdesk
kubectl get endpoints -n supportdesk
kubectl get pods -n supportdesk --show-labels
```

The expected lessons are `ImagePullBackOff` caused by an invalid image/tag and
an empty Service endpoint set caused by a selector that matches no Pods.

## Known limitations

- PostgreSQL is deployed inside Kubernetes for the classroom demonstration. A
  production AWS architecture should normally use Amazon RDS or another
  managed database.
- The example Terraform stack uses one NAT gateway to reduce cost; production
  high availability would normally use one NAT gateway per availability zone.
- The demo dashboard is intentionally small and does not provide authentication
  or role-based access control.
- The ArgoCD manifest requires the GHCR images to exist and may need image pull
  credentials depending on package visibility.
- AWS resources are not created by CI automatically; this keeps cloud spending
  and credentials under the operator's control.

## Evidence checklist

The rubric evidence should include:

- Browser screenshot showing SupportDesk and a created ticket.
- `pytest -v` with all tests passing.
- `docker compose up --build` and the browser at port 3000.
- A green GitHub Actions run and GHCR packages with SHA tags.
- Trivy output for both images.
- Terraform plan, AWS VPC/EKS, and `terraform destroy` output.
- Kubernetes Pods, Services, Ingress, HPA, and Helm release.
- `/metrics`, Prometheus target `UP`, and a populated Grafana panel.
- The final presentation video and at least eight-slide deck under `demo/`.
