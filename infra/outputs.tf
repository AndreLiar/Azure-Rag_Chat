output "resource_group" {
  value = azurerm_resource_group.rg.name
}

output "storage_account" {
  value = azurerm_storage_account.sa.name
}

output "ai_search_endpoint" {
  value = "https://${azurerm_search_service.aisearch.name}.search.windows.net"
}

output "app_insights_conn" {
  value     = try(azurerm_application_insights.appi[0].connection_string, null)
  sensitive = true
}

output "container_env_id" {
  value = try(azurerm_container_app_environment.cae[0].id, null)
}

output "static_web_app_hostname" {
  value = azurerm_static_web_app.swa.default_host_name
}

output "backend_url" {
  value = var.enable_container_apps ? "https://${azurerm_container_app.backend[0].latest_revision_fqdn}" : null
}

# Supabase Database Outputs
output "supabase_url" {
  value = var.supabase_url
}

output "database_url" {
  value     = var.database_url
  sensitive = true
}

# Key Vault Outputs
output "key_vault_name" {
  value = azurerm_key_vault.kv.name
}

output "key_vault_url" {
  value = azurerm_key_vault.kv.vault_uri
}

# Managed Identity for Backend
output "backend_identity_client_id" {
  value = var.enable_container_apps ? azurerm_user_assigned_identity.backend_identity[0].client_id : null
}
