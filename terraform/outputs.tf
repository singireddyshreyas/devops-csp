output "cluster_name" {
  description = "EKS cluster name for aws eks update-kubeconfig."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS control plane endpoint."
  value       = module.eks.cluster_endpoint
}

output "vpc_id" {
  description = "VPC identifier created for EKS."
  value       = module.vpc.vpc_id
}
