---
layout: default
lang: en
title: Infrastructure Deployment Guide
description: Complete guide for deploying ChordMe infrastructure to various cloud platforms including AWS with Terraform and CloudFormation
---

# ChordMe Infrastructure as Code

This documentation contains infrastructure-as-code templates for deploying ChordMe to various cloud platforms.

## AWS Deployment

### Terraform (Recommended)

The Terraform configuration provides a complete AWS infrastructure setup with:

- **VPC**: Secure network with public/private subnets across multiple AZs
- **ECS Fargate**: Containerized backend application with auto-scaling
- **RDS PostgreSQL**: Managed database with automated backups
- **S3 + CloudFront**: Static frontend hosting with global CDN
- **Application Load Balancer**: High availability and SSL termination
- **Monitoring**: CloudWatch dashboards, alarms, and logging
- **Security**: IAM roles, security groups, and encryption at rest

#### Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Terraform** >= 1.0 installed
3. **Docker image** for backend application published to ECR or Docker Hub

#### Deployment Steps

```bash
cd infrastructure/terraform/aws

# Initialize Terraform
terraform init

# Create terraform.tfvars file
cat > terraform.tfvars << EOF
environment = "production"
db_password = "your-secure-database-password"
jwt_secret_key = "your-jwt-secret-key-32-chars-minimum"
flask_secret_key = "your-flask-secret-key-32-chars-minimum"
frontend_bucket_name = "your-unique-bucket-name"
certificate_arn = "arn:aws:acm:us-east-1:account:certificate/cert-id"  # Optional
domain_name = "yourdomain.com"  # Optional
EOF

# Plan the deployment
terraform plan

# Apply the infrastructure
terraform apply
```

#### Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `environment` | Environment name (staging/production) | Yes | - |
| `db_password` | Database password | Yes | - |
| `jwt_secret_key` | JWT signing key | Yes | - |
| `flask_secret_key` | Flask secret key | Yes | - |
| `frontend_bucket_name` | S3 bucket name (globally unique) | Yes | - |
| `certificate_arn` | SSL certificate ARN | No | "" |
| `domain_name` | Custom domain name | No | "" |
| `backend_image_tag` | Docker image tag | No | "latest" |
| `db_instance_class` | RDS instance type | No | "db.t3.micro" |

### CloudFormation (Alternative)

The CloudFormation template provides the basic infrastructure components:

```bash
cd infrastructure/cloudformation

# Deploy the stack
aws cloudformation create-stack \
  --stack-name chordme-production \
  --template-body file://chordme-infrastructure.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production \
               ParameterKey=DbPassword,ParameterValue=your-password \
               ParameterKey=JwtSecretKey,ParameterValue=your-jwt-secret \
               ParameterKey=FlaskSecretKey,ParameterValue=your-flask-secret \
               ParameterKey=FrontendBucketName,ParameterValue=your-bucket-name \
  --capabilities CAPABILITY_IAM

# Monitor deployment progress
aws cloudformation describe-stacks --stack-name chordme-production
```

## Cost Estimation

### Terraform Deployment (Monthly)

**Production Environment:**
- ECS Fargate (2 tasks): ~$30
- RDS PostgreSQL (db.t3.micro): ~$15
- Application Load Balancer: ~$16
- S3 + CloudFront: ~$5-10
- VPC NAT Gateways: ~$32
- **Total: ~$98-103/month**

**Staging Environment:**
- ECS Fargate (1 task): ~$15
- RDS PostgreSQL (db.t3.micro): ~$15
- ALB: ~$16
- S3 + CloudFront: ~$2-5
- VPC NAT Gateway: ~$16
- **Total: ~$64-67/month**

*Note: Costs may vary based on usage, data transfer, and AWS region.*

## Security Considerations

### Infrastructure Security

- **Network**: VPC with private subnets for application and database tiers
- **Encryption**: EBS volumes, RDS, and S3 buckets encrypted at rest
- **Access Control**: IAM roles with least privilege principle
- **Security Groups**: Restrictive rules allowing only necessary traffic
- **SSL/TLS**: HTTPS enforced with proper certificates

### Secrets Management

- **AWS Systems Manager Parameter Store**: Used for application secrets
- **No Hardcoded Secrets**: All sensitive values parameterized
- **Environment Variables**: Secrets injected at runtime

### Monitoring and Alerting

- **CloudWatch Alarms**: CPU, memory, response times, error rates
- **Log Aggregation**: Centralized logging with retention policies
- **Health Checks**: Application and infrastructure health monitoring

## Troubleshooting

### Common Issues

1. **Terraform State Conflicts**
   ```bash
   # If state is locked
   terraform force-unlock LOCK_ID
   ```

2. **ECS Tasks Not Starting**
   - Check CloudWatch logs: `/ecs/chordme-{environment}-backend`
   - Verify image exists and is accessible
   - Check IAM permissions for task execution role

3. **Database Connection Issues**
   - Verify security group rules
   - Check database credentials in Parameter Store
   - Ensure RDS is in the same VPC as ECS

4. **Frontend Not Loading**
   - Check S3 bucket policy for CloudFront access
   - Verify CloudFront distribution settings
   - Check DNS configuration if using custom domain

### Useful Commands

```bash
# View ECS service logs
aws logs describe-log-streams --log-group-name /ecs/chordme-production-backend

# Check RDS status
aws rds describe-db-instances --db-instance-identifier chordme-production-db

# View ALB health
aws elbv2 describe-target-health --target-group-arn TARGET_GROUP_ARN

# CloudFront distribution status
aws cloudfront get-distribution --id DISTRIBUTION_ID
```

## Cleanup

### Terraform

```bash
cd infrastructure/terraform/aws
terraform destroy
```

### CloudFormation

```bash
aws cloudformation delete-stack --stack-name chordme-production
```

**[WARNING] Warning**: This will permanently delete all resources and data. Ensure you have backups before proceeding.

## Next Steps

1. **Monitoring Setup**: Configure CloudWatch dashboards and alarms
2. **Backup Strategy**: Set up automated database backups and retention
3. **CI/CD Integration**: Connect GitHub Actions to deploy to this infrastructure
4. **Custom Domain**: Configure Route 53 for custom domain routing
5. **Multi-Environment**: Deploy separate staging and production environments