terraform {
  required_providers {
    kubernetes = {
      source = "hashicorp/kubernetes"
    }
  }
  backend "kubernetes" {
    namespace     = "terraform-backend"
    secret_suffix = "photo-uploader"
    config_path   = "~/.kube/config"
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

locals {
  namespace = "rsb-apps"
  name      = "rsb-photo-uploader"
  hosts = [
    "photos.netterberg.io",
  ]
}

variable "image_tag" {
  type = string
}

resource "kubernetes_ingress_v1" "ing" {

  metadata {
    name      = local.name
    namespace = local.namespace
    annotations = {
      "kubernetes.io/ingress.class"                      = "traefik"
      "cert-manager.io/cluster-issuer"                   = "letsencrypt-prod"
      "traefik.ingress.kubernetes.io/router.middlewares" = "default-redirect-https@kubernetescrd"
    }
  }

  spec {
    dynamic "rule" {
      for_each = toset(local.hosts)
      content {
        host = rule.value
        http {
          path {
            backend {
              service {
                port {
                  number = kubernetes_service_v1.svc.spec[0].port[0].port
                }
                name = kubernetes_service_v1.svc.metadata[0].name
              }
            }
          }
        }
      }
    }
    tls {
      secret_name = local.name
      hosts       = local.hosts
    }
  }
}


resource "kubernetes_service_v1" "svc" {
  metadata {
    name      = local.name
    namespace = local.namespace
  }
  spec {
    selector = {
      app = kubernetes_deployment_v1.deploy.spec[0].selector[0].match_labels.app
    }

    port {
      protocol    = "TCP"
      port        = 3000
      target_port = 44445
    }
  }
}



resource "kubernetes_deployment_v1" "deploy" {
  metadata {
    name      = local.name
    namespace = local.namespace
  }

  spec {
    replicas = 1
    selector {
      match_labels = {
        app = local.name
      }
    }

    template {
      metadata {
        labels = {
          app = local.name
        }
      }
      spec {
        container {
          name  = local.name
          image = "maxrsb/photo-uploader:${var.image_tag}"
          resources {
            requests = {
              cpu    = "20m"
              memory = "50Mi"
            }

            limits = {
              cpu    = "250m"
              memory = "250Mi"
            }
          }
        }
      }
    }
  }
}

