variable "aws_region" {
  description = "AWS region for the SupportDesk infrastructure."
  type        = string
  default     = "ap-south-1"
}

variable "cluster_name" {
  description = "Name of the EKS cluster."
  type        = string
  default     = "supportdesk-eks"
}

variable "environment" {
  description = "Environment label used for future infrastructure extensions."
  type        = string
  default     = "dev"
}
