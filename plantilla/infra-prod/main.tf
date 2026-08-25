# Raíz de Terraform del ambiente de PRODUCCIÓN de {{PROYECTO}}.
#
# ES EL ADAPTADOR `aws`: el marco fija cuatro capacidades, no una nube. Las cinco
# plataformas admitidas están en `../infra/adaptadores.md`.
#
# Mismo reparto que en `../infra/`: acá está lo que se DERIVA de los valores del
# proyecto, y lo que hay que decidir vive en `pendientes.tf`.
#
# 🛑 TODO `apply` EN ESTA RAÍZ EXIGE EL OK EXPLÍCITO DE @{{BUILDER_1}} EN LA
# MISMA SESIÓN. No es una formalidad y aplica aunque el cambio parezca inerte:
# un `plan` que se ve vacío puede reemplazar un recurso al aplicarse.
#
# Cero recursos a propósito. Ver el README de este directorio.

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # STATE REMOTO, bucket de la cuenta de PRODUCCIÓN. Es un bucket distinto del de
  # dev a propósito: el state de producción no se comparte cuenta con el de un
  # ambiente donde cualquiera prueba.
  #
  # PENDIENTE-INFRA: El nombre del bucket es un PENDIENTE — ver `pendientes.tf`, sección 1.
  backend "s3" {
    bucket       = "PENDIENTE-VER-pendientes-tf-SECCION-1"
    key          = "{{PROYECTO}}/infra-prod.tfstate"
    region       = "{{REGION}}"
    use_lockfile = true
  }
}

provider "aws" {
  region = "{{REGION}}"

  # El perfil no se fija acá: se elige al invocar
  # (`AWS_PROFILE={{PERFIL_PROD}} terraform plan`). Ver el comentario equivalente
  # en `../infra/main.tf`.

  default_tags {
    tags = {
      Proyecto = "{{PREFIJO_RECURSOS}}"
      Ambiente = "prod"
      Gestion  = "terraform"
      Repo     = "{{ORG}}/{{PROYECTO}}"
    }
  }
}

# La base es compartida y no se crea acá — ver `pendientes.tf`, sección 2.
data "aws_rds_cluster" "compartido" {
  cluster_identifier = "PENDIENTE-VER-pendientes-tf-SECCION-2"
}

# La red se referencia, no se crea. En qué subredes corre el servicio es
# decisión: `pendientes.tf`, sección 3.
data "aws_vpc" "principal" {
  default = true
}
