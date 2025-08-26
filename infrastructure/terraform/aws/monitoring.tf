# SSM Parameters for Secrets
resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/chordme/${var.environment}/jwt-secret-key"
  type  = "SecureString"
  value = var.jwt_secret_key

  tags = {
    Name = "chordme-${var.environment}-jwt-secret"
  }
}

resource "aws_ssm_parameter" "flask_secret" {
  name  = "/chordme/${var.environment}/flask-secret-key"
  type  = "SecureString"
  value = var.flask_secret_key

  tags = {
    Name = "chordme-${var.environment}-flask-secret"
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "chordme-${var.environment}-alerts"

  tags = {
    Name = "chordme-${var.environment}-alerts"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "alb_target_response_time" {
  alarm_name          = "chordme-${var.environment}-alb-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.chordme_alb.arn_suffix
  }

  tags = {
    Name = "chordme-${var.environment}-alb-response-time"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_service_cpu" {
  alarm_name          = "chordme-${var.environment}-ecs-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS service CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.chordme_backend.name
    ClusterName = aws_ecs_cluster.chordme_cluster.name
  }

  tags = {
    Name = "chordme-${var.environment}-ecs-cpu"
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_service_memory" {
  alarm_name          = "chordme-${var.environment}-ecs-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS service memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.chordme_backend.name
    ClusterName = aws_ecs_cluster.chordme_cluster.name
  }

  tags = {
    Name = "chordme-${var.environment}-ecs-memory"
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "chordme_dashboard" {
  dashboard_name = "ChordMe-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.chordme_alb.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "ALB Metrics"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.chordme_backend.name, "ClusterName", aws_ecs_cluster.chordme_cluster.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Service Metrics"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.chordme_db.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Metrics"
        }
      }
    ]
  })
}