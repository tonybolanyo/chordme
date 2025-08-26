# RDS Subnet Group
resource "aws_db_subnet_group" "chordme_db_subnet_group" {
  name       = "chordme-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.database_subnets[*].id

  tags = {
    Name = "chordme-${var.environment}-db-subnet-group"
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "chordme_db_params" {
  family = "postgres15"
  name   = "chordme-${var.environment}-db-params"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Name = "chordme-${var.environment}-db-params"
  }
}

# RDS Instance
resource "aws_db_instance" "chordme_db" {
  identifier = "chordme-${var.environment}-db"

  # Engine configuration
  engine         = "postgres"
  engine_version = "15.8"
  instance_class = var.db_instance_class

  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_type          = "gp2"
  storage_encrypted     = true

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.chordme_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = var.db_backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Parameter group
  parameter_group_name = aws_db_parameter_group.chordme_db_params.name

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  # Performance Insights
  performance_insights_enabled = var.environment == "production" ? true : false

  # Deletion configuration
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "chordme-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  deletion_protection       = var.environment == "production" ? true : false

  tags = {
    Name = "chordme-${var.environment}-db"
  }
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "chordme-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Alarms for Database
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "chordme-${var.environment}-db-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.chordme_db.id
  }

  tags = {
    Name = "chordme-${var.environment}-db-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "chordme-${var.environment}-db-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "50"
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.chordme_db.id
  }

  tags = {
    Name = "chordme-${var.environment}-db-connections-alarm"
  }
}