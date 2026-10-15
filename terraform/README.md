# SupportDesk Terraform infrastructure

This folder provisions the AWS VPC and EKS cluster used by the SupportDesk deployment.

The module-based approach keeps the lesson focused on Terraform concepts: providers, variables, modules, state, plan/apply, outputs and dependency graphs.

> Cost warning: an EKS cluster and NAT gateway can incur AWS charges. Destroy classroom infrastructure when finished.

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
aws eks update-kubeconfig --region ap-south-1 --name supportdesk-eks
terraform destroy
```

`terraform apply` creates billable AWS resources, including an EKS control plane,
managed worker nodes, and a NAT gateway. Review the plan before applying and run
`terraform destroy` after the demonstration.

AWS credentials must be provided through the AWS CLI profile or environment;
credentials must never be stored in `terraform.tfvars` or committed to Git.
