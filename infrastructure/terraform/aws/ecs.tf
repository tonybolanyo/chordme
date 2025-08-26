# ECS Cluster for Backend Application
resource "aws_ecs_cluster" "chordme_cluster" {
  name = "chordme-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "chordme-${var.environment}-cluster"
  }
}

resource "aws_ecs_cluster_capacity_providers" "chordme_cluster_providers" {
  cluster_name = aws_ecs_cluster.chordme_cluster.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "chordme-${var.environment}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Task
resource "aws_iam_role" "ecs_task_role" {
  name = "chordme-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "chordme_backend_logs" {
  name              = "/ecs/chordme-${var.environment}-backend"
  retention_in_days = 7

  tags = {
    Name = "chordme-${var.environment}-backend-logs"
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "chordme_backend" {
  family                   = "chordme-${var.environment}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "chordme-backend"
      image = "chordme/backend:${var.backend_image_tag}"
      
      portMappings = [
        {
          containerPort = var.backend_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "FLASK_ENV"
          value = var.environment
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.chordme_db.endpoint}:5432/${var.db_name}"
        }
      ]

      secrets = [
        {
          name      = "JWT_SECRET_KEY"
          valueFrom = aws_ssm_parameter.jwt_secret.arn
        },
        {
          name      = "SECRET_KEY"
          valueFrom = aws_ssm_parameter.flask_secret.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.chordme_backend_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command = [
          "CMD-SHELL",
          "curl -f http://localhost:${var.backend_port}/api/v1/health || exit 1"
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "chordme-${var.environment}-backend-task"
  }
}

# Application Load Balancer
resource "aws_lb" "chordme_alb" {
  name               = "chordme-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = aws_subnet.public_subnets[*].id

  enable_deletion_protection = var.environment == "production" ? true : false

  tags = {
    Name = "chordme-${var.environment}-alb"
  }
}

# Target Group for Backend
resource "aws_lb_target_group" "chordme_backend_tg" {
  name        = "chordme-${var.environment}-backend-tg"
  port        = var.backend_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.chordme_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/api/v1/health"
    matcher             = "200"
    port                = "traffic-port"
    protocol            = "HTTP"
  }

  tags = {
    Name = "chordme-${var.environment}-backend-tg"
  }
}

# ALB Listener
resource "aws_lb_listener" "chordme_alb_listener" {
  load_balancer_arn = aws_lb.chordme_alb.arn
  port              = var.certificate_arn != "" ? "443" : "80"
  protocol          = var.certificate_arn != "" ? "HTTPS" : "HTTP"
  ssl_policy        = var.certificate_arn != "" ? "ELBSecurityPolicy-TLS-1-2-2017-01" : null
  certificate_arn   = var.certificate_arn != "" ? var.certificate_arn : null

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.chordme_backend_tg.arn
  }
}

# Redirect HTTP to HTTPS (if certificate is provided)
resource "aws_lb_listener" "chordme_alb_redirect" {
  count             = var.certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.chordme_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ECS Service
resource "aws_ecs_service" "chordme_backend" {
  name            = "chordme-${var.environment}-backend"
  cluster         = aws_ecs_cluster.chordme_cluster.id
  task_definition = aws_ecs_task_definition.chordme_backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private_subnets[*].id
    security_groups  = [aws_security_group.ecs_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.chordme_backend_tg.arn
    container_name   = "chordme-backend"
    container_port   = var.backend_port
  }

  # Enable deployment circuit breaker for rollback
  deployment_configuration {
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
    maximum_percent         = 200
    minimum_healthy_percent = 50
  }

  # Wait for load balancer to be ready
  depends_on = [aws_lb_listener.chordme_alb_listener]

  tags = {
    Name = "chordme-${var.environment}-backend-service"
  }
}

# Auto Scaling for ECS Service
resource "aws_appautoscaling_target" "chordme_backend_target" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.chordme_cluster.name}/${aws_ecs_service.chordme_backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "chordme_backend_cpu_policy" {
  name               = "chordme-${var.environment}-backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.chordme_backend_target.resource_id
  scalable_dimension = aws_appautoscaling_target.chordme_backend_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.chordme_backend_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}