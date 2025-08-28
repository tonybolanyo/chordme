---
layout: default
lang: es
title: Guía de despliegue de infraestructura
description: Guía completa para desplegar la infraestructura de ChordMe en varias plataformas de nube incluyendo AWS con Terraform y CloudFormation
---

# Infraestructura como código de ChordMe

Esta documentación contiene plantillas de infraestructura como código para desplegar ChordMe en varias plataformas de nube.

## Despliegue en AWS

### Terraform (Recomendado)

La configuración de Terraform proporciona una configuración completa de infraestructura AWS con:

- **VPC**: Red segura con subredes públicas/privadas a través de múltiples AZs
- **ECS Fargate**: Aplicación backend contenerizada con auto-escalado
- **RDS PostgreSQL**: Base de datos gestionada con copias de seguridad automatizadas
- **S3 + CloudFront**: Hosting de frontend estático con CDN global
- **Application Load Balancer**: Alta disponibilidad y terminación SSL
- **Monitoreo**: Dashboards de CloudWatch, alarmas y registro
- **Seguridad**: Roles IAM, grupos de seguridad y cifrado en reposo

#### Prerequisitos

1. **AWS CLI configurado** con permisos apropiados
2. **Terraform** >= 1.0 instalado
3. **Imagen Docker** para aplicación backend publicada en ECR o Docker Hub

#### Pasos de despliegue

```bash
cd infrastructure/terraform/aws

# Inicializar Terraform
terraform init

# Crear archivo terraform.tfvars
cat > terraform.tfvars << EOF
environment = "production"
db_password = "tu-contraseña-segura-de-base-de-datos"
jwt_secret_key = "tu-clave-secreta-jwt-minimo-32-caracteres"
flask_secret_key = "tu-clave-secreta-flask-minimo-32-caracteres"
frontend_bucket_name = "tu-nombre-unico-de-bucket"
certificate_arn = "arn:aws:acm:us-east-1:cuenta:certificate/cert-id"  # Opcional
domain_name = "tudominio.com"  # Opcional
EOF

# Planificar el despliegue
terraform plan

# Aplicar la infraestructura
terraform apply
```

#### Variables

| Variable | Descripción | Requerido | Por defecto |
|----------|-------------|-----------|-------------|
| `environment` | Nombre del entorno (staging/production) | Sí | - |
| `db_password` | Contraseña de base de datos | Sí | - |
| `jwt_secret_key` | Clave de firma JWT | Sí | - |
| `flask_secret_key` | Clave secreta de Flask | Sí | - |
| `frontend_bucket_name` | Nombre del bucket S3 (globalmente único) | Sí | - |
| `certificate_arn` | ARN del certificado SSL | No | "" |
| `domain_name` | Nombre de dominio personalizado | No | "" |
| `backend_image_tag` | Tag de imagen Docker | No | "latest" |
| `db_instance_class` | Tipo de instancia RDS | No | "db.t3.micro" |

### CloudFormation (Alternativa)

La plantilla de CloudFormation proporciona los componentes básicos de infraestructura:

```bash
cd infrastructure/cloudformation

# Desplegar el stack
aws cloudformation create-stack \
  --stack-name chordme-production \
  --template-body file://chordme-infrastructure.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production \
               ParameterKey=DbPassword,ParameterValue=tu-contraseña \
               ParameterKey=JwtSecretKey,ParameterValue=tu-jwt-secreto \
               ParameterKey=FlaskSecretKey,ParameterValue=tu-flask-secreto \
               ParameterKey=FrontendBucketName,ParameterValue=tu-nombre-bucket \
  --capabilities CAPABILITY_IAM

# Monitorear progreso del despliegue
aws cloudformation describe-stacks --stack-name chordme-production
```

## Estimación de costos

### Despliegue Terraform (Mensual)

**Entorno de producción:**
- ECS Fargate (2 tareas): ~$30
- RDS PostgreSQL (db.t3.micro): ~$15
- Application Load Balancer: ~$16
- S3 + CloudFront: ~$5-10
- VPC NAT Gateways: ~$32
- **Total: ~$98-103/mes**

**Entorno de staging:**
- ECS Fargate (1 tarea): ~$15
- RDS PostgreSQL (db.t3.micro): ~$15
- ALB: ~$16
- S3 + CloudFront: ~$2-5
- VPC NAT Gateway: ~$16
- **Total: ~$64-67/mes**

*Nota: Los costos pueden variar según el uso, transferencia de datos y región de AWS.*

## Consideraciones de seguridad

### Seguridad de infraestructura

- **Red**: VPC con subredes privadas para capas de aplicación y base de datos
- **Cifrado**: Volúmenes EBS, RDS y buckets S3 cifrados en reposo
- **Control de acceso**: Roles IAM con principio de menor privilegio
- **Grupos de seguridad**: Reglas restrictivas permitiendo solo tráfico necesario
- **SSL/TLS**: HTTPS forzado con certificados apropiados

### Gestión de secretos

- **AWS Systems Manager Parameter Store**: Usado para secretos de aplicación
- **Sin secretos hardcodeados**: Todos los valores sensibles parametrizados
- **Variables de entorno**: Secretos inyectados en tiempo de ejecución

### Monitoreo y alertas

- **Alarmas CloudWatch**: CPU, memoria, tiempos de respuesta, tasas de error
- **Agregación de logs**: Registro centralizado con políticas de retención
- **Verificaciones de salud**: Monitoreo de salud de aplicación e infraestructura

## Solución de problemas

### Problemas comunes

1. **Conflictos de estado de Terraform**
   ```bash
   # Si el estado está bloqueado
   terraform force-unlock LOCK_ID
   ```

2. **Tareas ECS no iniciando**
   - Verificar logs de CloudWatch: `/ecs/chordme-{environment}-backend`
   - Verificar que la imagen existe y es accesible
   - Verificar permisos IAM para rol de ejecución de tarea

3. **Problemas de conexión de base de datos**
   - Verificar reglas de grupo de seguridad
   - Verificar credenciales de base de datos en Parameter Store
   - Asegurar que RDS está en la misma VPC que ECS

4. **Frontend no cargando**
   - Verificar política de bucket S3 para acceso CloudFront
   - Verificar configuración de distribución CloudFront
   - Verificar configuración DNS si usa dominio personalizado

### Comandos útiles

```bash
# Ver logs del servicio ECS
aws logs describe-log-streams --log-group-name /ecs/chordme-production-backend

# Verificar estado RDS
aws rds describe-db-instances --db-instance-identifier chordme-production-db

# Ver salud ALB
aws elbv2 describe-target-health --target-group-arn TARGET_GROUP_ARN

# Estado de distribución CloudFront
aws cloudfront get-distribution --id DISTRIBUTION_ID
```

## Limpieza

### Terraform

```bash
cd infrastructure/terraform/aws
terraform destroy
```

### CloudFormation

```bash
aws cloudformation delete-stack --stack-name chordme-production
```

**⚠️ Advertencia**: Esto eliminará permanentemente todos los recursos y datos. Asegúrese de tener copias de seguridad antes de proceder.

## Próximos pasos

1. **Configuración de monitoreo**: Configurar dashboards y alarmas de CloudWatch
2. **Estrategia de respaldo**: Configurar copias de seguridad automatizadas de base de datos y retención
3. **Integración CI/CD**: Conectar GitHub Actions para desplegar a esta infraestructura
4. **Dominio personalizado**: Configurar Route 53 para enrutamiento de dominio personalizado
5. **Multi-entorno**: Desplegar entornos separados de staging y producción

---

**Cambiar idioma:** [English](infrastructure.md) | **Español**