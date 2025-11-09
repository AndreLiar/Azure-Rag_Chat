terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">=3.100.0"
    }
  }

  required_version = ">=1.5.0"
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
