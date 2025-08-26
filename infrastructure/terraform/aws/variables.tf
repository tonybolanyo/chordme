# Variables for ChordMe Terraform configuration

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either staging or production."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.30.0/24", "10.0.40.0/24"]
}

# Application Configuration
variable "backend_image_tag" {
  description = "Docker image tag for backend application"
  type        = string
  default     = "latest"
}

variable "backend_port" {
  description = "Port for backend application"
  type        = number
  default     = 5000
}

variable "backend_cpu" {
  description = "CPU units for backend tasks (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory for backend tasks (in MB)"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 2
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "chordme"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "chordme_user"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "db_backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

# Application Environment Variables
variable "jwt_secret_key" {
  description = "JWT secret key for authentication"
  type        = string
  sensitive   = true
}

variable "flask_secret_key" {
  description = "Flask secret key for sessions"
  type        = string
  sensitive   = true
}

# Frontend Configuration
variable "frontend_bucket_name" {
  description = "S3 bucket name for frontend static files"
  type        = string
}

variable "cloudfront_distribution_comment" {
  description = "Comment for CloudFront distribution"
  type        = string
  default     = "ChordMe Frontend Distribution"
}

# SSL Certificate
variable "certificate_arn" {
  description = "ARN of SSL certificate for HTTPS"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}