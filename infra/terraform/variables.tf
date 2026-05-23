variable "compartment_id" {
  description = "OCI compartment OCID"
  type        = string
}

variable "region" {
  description = "OCI region identifier"
  type        = string
  default     = "us-phoenix-1"
}

variable "availability_domain" {
  description = "OCI availability domain"
  type        = string
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "site_domain" {
  description = "Primary domain for this deployment"
  type        = string
  default     = "alreadyherellc.com"
}

variable "instance_shape" {
  description = "OCI compute shape"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "Number of OCPUs for the compute instance"
  type        = number
  default     = 1
}

variable "instance_memory_gb" {
  description = "Memory in GB for the compute instance"
  type        = number
  default     = 6
}

variable "data_volume_gb" {
  description = "Size of the persistent data volume in GB"
  type        = number
  default     = 50
}

variable "ssh_public_key" {
  description = "SSH public key for instance access"
  type        = string
  sensitive   = true
}

variable "repo_url" {
  description = "Git repository URL to clone on the instance"
  type        = string
  default     = "https://github.com/quantam101/already-here-llc.git"
}

variable "compose_branch" {
  description = "Git branch to checkout for docker-compose deployment"
  type        = string
  default     = "main"
}
