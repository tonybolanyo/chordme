# ChordMe Infrastructure as Code - AWS Terraform Configuration
# Provides production-ready infrastructure for deploying ChordMe application

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ChordMe"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Configuration
resource "aws_vpc" "chordme_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "chordme-${var.environment}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "chordme_igw" {
  vpc_id = aws_vpc.chordme_vpc.id

  tags = {
    Name = "chordme-${var.environment}-igw"
  }
}

# Public Subnets for Load Balancer
resource "aws_subnet" "public_subnets" {
  count             = 2
  vpc_id            = aws_vpc.chordme_vpc.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "chordme-${var.environment}-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}

# Private Subnets for Application
resource "aws_subnet" "private_subnets" {
  count             = 2
  vpc_id            = aws_vpc.chordme_vpc.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "chordme-${var.environment}-private-subnet-${count.index + 1}"
    Type = "Private"
  }
}

# Database Subnets
resource "aws_subnet" "database_subnets" {
  count             = 2
  vpc_id            = aws_vpc.chordme_vpc.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "chordme-${var.environment}-database-subnet-${count.index + 1}"
    Type = "Database"
  }
}

# Route Table for Public Subnets
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.chordme_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.chordme_igw.id
  }

  tags = {
    Name = "chordme-${var.environment}-public-rt"
  }
}

# Associate Public Subnets with Route Table
resource "aws_route_table_association" "public_subnet_associations" {
  count          = length(aws_subnet.public_subnets)
  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

# NAT Gateway for Private Subnets
resource "aws_eip" "nat_gateway_eips" {
  count  = 2
  domain = "vpc"

  tags = {
    Name = "chordme-${var.environment}-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "nat_gateways" {
  count         = 2
  allocation_id = aws_eip.nat_gateway_eips[count.index].id
  subnet_id     = aws_subnet.public_subnets[count.index].id

  tags = {
    Name = "chordme-${var.environment}-nat-gw-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.chordme_igw]
}

# Route Tables for Private Subnets
resource "aws_route_table" "private_rts" {
  count  = 2
  vpc_id = aws_vpc.chordme_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateways[count.index].id
  }

  tags = {
    Name = "chordme-${var.environment}-private-rt-${count.index + 1}"
  }
}

# Associate Private Subnets with Route Tables
resource "aws_route_table_association" "private_subnet_associations" {
  count          = length(aws_subnet.private_subnets)
  subnet_id      = aws_subnet.private_subnets[count.index].id
  route_table_id = aws_route_table.private_rts[count.index].id
}

# Security Groups
resource "aws_security_group" "alb_sg" {
  name_prefix = "chordme-${var.environment}-alb-"
  vpc_id      = aws_vpc.chordme_vpc.id
  description = "Security group for Application Load Balancer"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "chordme-${var.environment}-alb-sg"
  }
}

resource "aws_security_group" "ecs_sg" {
  name_prefix = "chordme-${var.environment}-ecs-"
  vpc_id      = aws_vpc.chordme_vpc.id
  description = "Security group for ECS tasks"

  ingress {
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "chordme-${var.environment}-ecs-sg"
  }
}

resource "aws_security_group" "rds_sg" {
  name_prefix = "chordme-${var.environment}-rds-"
  vpc_id      = aws_vpc.chordme_vpc.id
  description = "Security group for RDS database"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }

  tags = {
    Name = "chordme-${var.environment}-rds-sg"
  }
}