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

# PostgreSQL Database Outputs
output "postgres_host" {
  value = azurerm_postgresql_flexible_server.pg.fqdn
}

output "postgres_database" {
  value = azurerm_postgresql_flexible_server_database.db.name
}

output "postgres_username" {
  value = azurerm_postgresql_flexible_server.pg.administrator_login
}

output "postgres_port" {
  value = 5432
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

# Connection strings for local development (sensitive)
output "database_connection_string" {
  value     = "postgresql+asyncpg://${azurerm_postgresql_flexible_server.pg.administrator_login}:${var.postgres_admin_password}@${azurerm_postgresql_flexible_server.pg.fqdn}:5432/${azurerm_postgresql_flexible_server_database.db.name}?sslmode=require"
  sensitive = true
}
