# Output values for ChordMe infrastructure

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.chordme_vpc.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public_subnets[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private_subnets[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database_subnets[*].id
}

# Load Balancer outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.chordme_alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.chordme_alb.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.chordme_alb.arn
}

# ECS outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.chordme_cluster.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.chordme_cluster.arn
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.chordme_backend.name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = aws_ecs_task_definition.chordme_backend.arn
}

# Database outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.chordme_db.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = aws_db_instance.chordme_db.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.chordme_db.db_name
}

# Frontend outputs
output "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend"
  value       = aws_s3_bucket.frontend_bucket.bucket
}

output "frontend_bucket_arn" {
  description = "ARN of the S3 bucket for frontend"
  value       = aws_s3_bucket.frontend_bucket.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend_distribution.id
}

output "cloudfront_distribution_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend_distribution.domain_name
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend_distribution.arn
}

# Monitoring outputs
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "URL to the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.chordme_dashboard.dashboard_name}"
}

# Security Group outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb_sg.id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs_sg.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds_sg.id
}

# Application URLs
output "application_url" {
  description = "URL to access the application"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend_distribution.domain_name}"
}

output "api_url" {
  description = "URL to access the API"
  value       = var.certificate_arn != "" ? "https://${aws_lb.chordme_alb.dns_name}" : "http://${aws_lb.chordme_alb.dns_name}"
}

# Resource ARNs for permissions
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}