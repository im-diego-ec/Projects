# Raíz de Terraform del ambiente de DESARROLLO de {{PROYECTO}}.
#
# Lo que hay acá es lo que se DERIVA de los valores del proyecto y no requiere
# ninguna decisión: el backend del state, el proveedor, y la referencia a la base
# compartida del área. Lo que sí requiere decidir vive en `pendientes.tf`, con su
# criterio y todavía SIN compuerta del pipeline — el motivo está en el encabezado
# de ese archivo.
#
# Cero recursos a propósito. Este archivo referencia infraestructura que ya
# existe; crear recursos es el trabajo que los pendientes describen.

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # STATE REMOTO. Lo exige `operacion-infra` del marco, y no es preferencia: un
  # state local no se puede compartir, no tiene lock y se pierde con la máquina.
  #
  # `use_lockfile` usa el lock nativo de S3 (Terraform >= 1.10) y por eso NO hace
  # falta una tabla de DynamoDB.
  #
  # PENDIENTE-INFRA: El nombre del bucket es un PENDIENTE — ver `pendientes.tf`, sección 1.
  # Está acá abajo con el marcador para que `terraform init` falle con un mensaje
  # claro en vez de crear un state en un lugar equivocado.
  backend "s3" {
    bucket       = "PENDIENTE-VER-pendientes-tf-SECCION-1"
    key          = "{{PROYECTO}}/infra.tfstate"
    region       = "{{REGION}}"
    use_lockfile = true
  }
}

provider "aws" {
  region = "{{REGION}}"

  # El perfil NO se fija acá a propósito: se elige al invocar
  # (`AWS_PROFILE={{PERFIL_DEV}} terraform plan`). Fijarlo en el código hace que
  # el mismo archivo funcione distinto según quién lo corra, y que el pipeline
  # —que usa identidad federada y no perfiles— tenga que ignorarlo.

  default_tags {
    tags = {
      Proyecto  = "{{PREFIJO_RECURSOS}}"
      Ambiente  = "dev"
      Gestion   = "terraform"
      Repo      = "{{ORG}}/{{PROYECTO}}"
    }
  }
}

# LA BASE ES COMPARTIDA Y NO SE CREA ACÁ. El área tiene un cluster por cuenta y
# cada aplicación vive como una base dentro de él. Esto es una referencia de
# lectura: si el cluster no existe, `plan` falla diciéndolo, que es lo correcto.
#
# PENDIENTE-INFRA: El identificador del cluster es un PENDIENTE — ver `pendientes.tf`, sección 2.
data "aws_rds_cluster" "compartido" {
  cluster_identifier = "PENDIENTE-VER-pendientes-tf-SECCION-2"
}

# LA RED TAMPOCO SE CREA. Se referencia la que ya existe en la cuenta. En qué
# subredes corre el servicio SÍ es una decisión, y está en `pendientes.tf`,
# sección 3.
data "aws_vpc" "principal" {
  default = true
}
