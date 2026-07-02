# Database Inventory Report
Generated: 2026-06-29T06:43:52.655Z

## Tables Overview
| Table Name | Class | Type | Columns | Rows | Size |
|------------|-------|------|---------|------|------|
| _deprecated_monitors | active-or-unknown | BASE TABLE | 17 | 0 | 40 kB |
| _deprecated_user | identity-access | BASE TABLE | 6 | 0 | 24 kB |
| _deprecated_webcams | active-or-unknown | BASE TABLE | 13 | 0 | 32 kB |
| _migration_history | active-or-unknown | BASE TABLE | 6 | 3 | 48 kB |
| active_queue_view | transactional | VIEW | 11 | 99 | 0 bytes |
| activity_log | audit-observability | BASE TABLE | 12 | 3 | 32 kB |
| api_keys | active-or-unknown | BASE TABLE | 9 | 0 | 24 kB |
| assistance_requests | active-or-unknown | BASE TABLE | 12 | 3304 | 712 kB |
| audit_logs | audit-observability | BASE TABLE | 20 | 412 | 408 kB |
| bios_compatibility | compatibility-spec | BASE TABLE | 11 | 0 | 48 kB |
| build_history | active-or-unknown | BASE TABLE | 17 | 1 | 144 kB |
| build_patterns | active-or-unknown | BASE TABLE | 18 | 1 | 96 kB |
| cache_metrics | audit-observability | VIEW | 6 | 1 | 0 bytes |
| case_compatibility | compatibility-spec | BASE TABLE | 12 | 24 | 80 kB |
| categories | active-or-unknown | BASE TABLE | 9 | 11 | 80 kB |
| compatibility_cache | compatibility-spec | BASE TABLE | 13 | 0 | 168 kB |
| compatibility_issue_templates | compatibility-spec | BASE TABLE | 10 | 0 | 40 kB |
| compatibility_logs | compatibility-spec | BASE TABLE | 17 | 34343 | 54 MB |
| compatibility_matrix | compatibility-spec | BASE TABLE | 10 | 0 | 48 kB |
| compatibility_rules | compatibility-spec | BASE TABLE | 21 | 3200 | 3720 kB |
| compatibility_rules_confidence | compatibility-spec | BASE TABLE | 11 | 8 | 72 kB |
| component_performance_tiers | active-or-unknown | BASE TABLE | 13 | 54 | 128 kB |
| cooling | active-or-unknown | BASE TABLE | 21 | 31 | 192 kB |
| cooling_compatibility | compatibility-spec | BASE TABLE | 11 | 9 | 80 kB |
| cpu | active-or-unknown | BASE TABLE | 35 | 34 | 128 kB |
| cpu_compatibility | compatibility-spec | BASE TABLE | 12 | 24 | 96 kB |
| critical_known_issues | active-or-unknown | VIEW | 12 | 0 | 0 bytes |
| deployment_config | active-or-unknown | BASE TABLE | 8 | 7 | 48 kB |
| diagnostic_issues | active-or-unknown | BASE TABLE | 10 | 40 | 80 kB |
| feedback_review_queue | transactional | BASE TABLE | 8 | 0 | 40 kB |
| feedback_submissions | active-or-unknown | BASE TABLE | 17 | 0 | 128 kB |
| feedback_votes | active-or-unknown | BASE TABLE | 6 | 0 | 72 kB |
| gpu | active-or-unknown | BASE TABLE | 41 | 40 | 168 kB |
| gpu_compatibility | compatibility-spec | BASE TABLE | 12 | 27 | 96 kB |
| headphones | active-or-unknown | BASE TABLE | 11 | 6 | 40 kB |
| historical_builds | active-or-unknown | BASE TABLE | 35 | 150 | 216 kB |
| historical_patterns | active-or-unknown | BASE TABLE | 18 | 3 | 152 kB |
| ip_access_control | active-or-unknown | BASE TABLE | 16 | 11 | 424 kB |
| ip_logs | audit-observability | BASE TABLE | 16 | 292978 | 96 MB |
| issue_verifications | active-or-unknown | BASE TABLE | 5 | 0 | 80 kB |
| keyboard | active-or-unknown | BASE TABLE | 12 | 12 | 40 kB |
| kiosk_sessions | identity-access | BASE TABLE | 14 | 0 | 64 kB |
| known_compatibility_issues | compatibility-spec | BASE TABLE | 16 | 0 | 56 kB |
| known_issues | active-or-unknown | BASE TABLE | 22 | 0 | 96 kB |
| latest_product_prices | active-or-unknown | VIEW | 8 | 429 | 0 bytes |
| messages | active-or-unknown | BASE TABLE | 10 | 50 | 144 kB |
| ml_bottleneck_patterns | legacy-ai-rag-ml | VIEW | 11 | 150 | 0 bytes |
| ml_compatibility_success_rate | legacy-ai-rag-ml | VIEW | 4 | 2 | 0 bytes |
| ml_optimal_builds_by_budget | legacy-ai-rag-ml | VIEW | 11 | 9 | 0 bytes |
| monitor | active-or-unknown | BASE TABLE | 14 | 22 | 56 kB |
| monitors | active-or-unknown | VIEW | 17 | 0 | 0 bytes |
| motherboard | active-or-unknown | BASE TABLE | 33 | 43 | 160 kB |
| motherboard_compatibility | compatibility-spec | BASE TABLE | 12 | 45 | 120 kB |
| mouse | active-or-unknown | BASE TABLE | 12 | 10 | 40 kB |
| notification_queue | transactional | BASE TABLE | 10 | 2 | 32 kB |
| notifications | active-or-unknown | BASE TABLE | 10 | 887 | 824 kB |
| order_counters | transactional | BASE TABLE | 7 | 11 | 72 kB |
| order_deduplication_log | transactional | BASE TABLE | 9 | 0 | 40 kB |
| order_items | transactional | BASE TABLE | 12 | 1023 | 280 kB |
| order_locks | transactional | BASE TABLE | 9 | 0 | 48 kB |
| order_queue | transactional | BASE TABLE | 12 | 0 | 56 kB |
| orders | transactional | BASE TABLE | 44 | 390 | 488 kB |
| orders_backup_no_items | transactional | BASE TABLE | 41 | 42 | 24 kB |
| package | active-or-unknown | BASE TABLE | 12 | 17 | 24 kB |
| password_history | active-or-unknown | BASE TABLE | 4 | 0 | 8192 bytes |
| password_resets | active-or-unknown | BASE TABLE | 12 | 0 | 64 kB |
| payment | transactional | BASE TABLE | 4 | 0 | 8192 bytes |
| pc_case | active-or-unknown | BASE TABLE | 32 | 26 | 160 kB |
| pc_customized_budget_ranges | active-or-unknown | BASE TABLE | 10 | 5 | 40 kB |
| pc_customized_gaming_preferences | active-or-unknown | BASE TABLE | 9 | 4 | 40 kB |
| pc_customized_performance_preferences | active-or-unknown | BASE TABLE | 9 | 3 | 40 kB |
| pc_customized_usage_types | active-or-unknown | BASE TABLE | 7 | 6 | 40 kB |
| pc_parts | active-or-unknown | BASE TABLE | 37 | 429 | 2840 kB |
| pc_parts_specs_backup_20260607141116 | backup-or-temp | BASE TABLE | 5 | 330 | 264 kB |
| pc_parts_specs_backup_20260607141646 | backup-or-temp | BASE TABLE | 5 | 298 | 264 kB |
| pc_parts_specs_backup_20260607142250 | backup-or-temp | BASE TABLE | 5 | 47 | 72 kB |
| pc_services | active-or-unknown | BASE TABLE | 13 | 3 | 88 kB |
| pc_upgrade_budget_ranges | active-or-unknown | BASE TABLE | 11 | 4 | 56 kB |
| pc_upgrade_new_products | active-or-unknown | BASE TABLE | 6 | 0 | 32 kB |
| pc_upgrade_reference_builds | active-or-unknown | BASE TABLE | 13 | 72 | 1192 kB |
| pc_upgrade_reference_builds_metadata | active-or-unknown | BASE TABLE | 10 | 1 | 32 kB |
| pc_upgrade_usage_types | active-or-unknown | BASE TABLE | 8 | 6 | 56 kB |
| pc_upgrade_year_ranges | active-or-unknown | BASE TABLE | 12 | 3 | 56 kB |
| pending_orders | transactional | BASE TABLE | 8 | 0 | 144 kB |
| performancestats | active-or-unknown | BASE TABLE | 9 | 0 | 8192 bytes |
| popular_builds | active-or-unknown | VIEW | 9 | 1 | 0 bytes |
| pre_built_pc_history | active-or-unknown | BASE TABLE | 7 | 0 | 24 kB |
| prebuilt_components | active-or-unknown | BASE TABLE | 7 | 91 | 88 kB |
| prebuilt_pcs | active-or-unknown | BASE TABLE | 19 | 13 | 136 kB |
| price_alerts | active-or-unknown | BASE TABLE | 10 | 0 | 32 kB |
| price_history | active-or-unknown | BASE TABLE | 13 | 378 | 192 kB |
| product_comparisons | active-or-unknown | BASE TABLE | 14 | 496 | 248 kB |
| product_specs | compatibility-spec | BASE TABLE | 8 | 410 | 1680 kB |
| psu | active-or-unknown | BASE TABLE | 30 | 23 | 144 kB |
| psu_compatibility | compatibility-spec | BASE TABLE | 12 | 38 | 56 kB |
| queue | transactional | BASE TABLE | 5 | 0 | 8192 bytes |
| queue_cycles | transactional | BASE TABLE | 11 | 18 | 64 kB |
| queue_management | transactional | BASE TABLE | 17 | 99 | 208 kB |
| rag_bm25_metadata | legacy-ai-rag-ml | BASE TABLE | 6 | 0 | 16 kB |
| ram | active-or-unknown | BASE TABLE | 20 | 28 | 160 kB |
| ram_compatibility | compatibility-spec | BASE TABLE | 11 | 17 | 112 kB |
| rate_limits | active-or-unknown | BASE TABLE | 4 | 0 | 16 kB |
| recent_verified_feedback | active-or-unknown | VIEW | 11 | 0 | 0 bytes |
| reference_builds | active-or-unknown | BASE TABLE | 17 | 0 | 56 kB |
| rule_ab_test_results | compatibility-spec | BASE TABLE | 11 | 0 | 24 kB |
| rule_ab_tests | compatibility-spec | BASE TABLE | 12 | 0 | 40 kB |
| rule_effectiveness_metrics | compatibility-spec | BASE TABLE | 10 | 0 | 32 kB |
| rule_history_view | compatibility-spec | VIEW | 11 | 3200 | 0 bytes |
| rule_version_history | compatibility-spec | BASE TABLE | 19 | 3200 | 1624 kB |
| services | active-or-unknown | BASE TABLE | 6 | 3 | 32 kB |
| settings | active-or-unknown | BASE TABLE | 7 | 19 | 48 kB |
| speakers | active-or-unknown | BASE TABLE | 9 | 4 | 40 kB |
| specification_schemas | active-or-unknown | BASE TABLE | 8 | 137 | 120 kB |
| stock_categories | active-or-unknown | BASE TABLE | 7 | 10 | 48 kB |
| stock_items | active-or-unknown | BASE TABLE | 11 | 0 | 40 kB |
| storage | legacy-ai-rag-ml | BASE TABLE | 21 | 26 | 144 kB |
| storage_compatibility | legacy-ai-rag-ml | BASE TABLE | 12 | 5 | 32 kB |
| successful_builds | active-or-unknown | BASE TABLE | 26 | 0 | 136 kB |
| system_monitoring | active-or-unknown | BASE TABLE | 13 | 0 | 40 kB |
| system_settings | active-or-unknown | BASE TABLE | 5 | 43 | 48 kB |
| thermal_compatibility | compatibility-spec | BASE TABLE | 10 | 0 | 16 kB |
| top_build_patterns | active-or-unknown | VIEW | 11 | 1 | 0 bytes |
| transactions | transactional | BASE TABLE | 10 | 3 | 80 kB |
| upgrade_paths | active-or-unknown | BASE TABLE | 16 | 0 | 48 kB |
| user | identity-access | VIEW | 6 | 0 | 0 bytes |
| user_compatibility_reports | compatibility-spec | BASE TABLE | 14 | 0 | 16 kB |
| user_personas | identity-access | BASE TABLE | 23 | 0 | 40 kB |
| user_preferences | identity-access | BASE TABLE | 7 | 2 | 88 kB |
| user_sessions | identity-access | BASE TABLE | 12 | 1 | 160 kB |
| user_virtual_build | identity-access | BASE TABLE | 7 | 0 | 40 kB |
| users | identity-access | BASE TABLE | 53 | 20 | 344 kB |
| v_compatibility_analysis | compatibility-spec | VIEW | 7 | 146 | 0 bytes |
| v_pc_upgrade_new_products_summary | active-or-unknown | VIEW | 3 | 0 | 0 bytes |
| v_pc_upgrade_parameters_summary | active-or-unknown | VIEW | 4 | 1 | 0 bytes |
| webcam | active-or-unknown | BASE TABLE | 13 | 5 | 56 kB |
| webcams | active-or-unknown | VIEW | 13 | 0 | 0 bytes |

## Empty Tables
Empty tables found:
- _deprecated_monitors
- _deprecated_user
- _deprecated_webcams
- api_keys
- bios_compatibility
- compatibility_cache
- compatibility_issue_templates
- compatibility_matrix
- critical_known_issues
- feedback_review_queue
- feedback_submissions
- feedback_votes
- issue_verifications
- kiosk_sessions
- known_compatibility_issues
- known_issues
- monitors
- order_deduplication_log
- order_locks
- order_queue
- password_history
- password_resets
- payment
- pc_upgrade_new_products
- pending_orders
- performancestats
- pre_built_pc_history
- price_alerts
- queue
- rag_bm25_metadata
- rate_limits
- recent_verified_feedback
- reference_builds
- rule_ab_test_results
- rule_ab_tests
- rule_effectiveness_metrics
- stock_items
- successful_builds
- system_monitoring
- thermal_compatibility
- upgrade_paths
- user
- user_compatibility_reports
- user_personas
- user_virtual_build
- v_pc_upgrade_new_products_summary
- webcams

## Foreign Key Relationships
| Table | Column | References Table | References Column |
|-------|--------|------------------|-------------------|
| _deprecated_monitors | part_id | pc_parts | id |
| _deprecated_webcams | part_id | pc_parts | id |
| activity_log | session_id | user_sessions | id |
| activity_log | user_id | users | id |
| api_keys | user_id | users | id |
| assistance_requests | acknowledged_by | users | id |
| audit_logs | user_id | users | id |
| build_patterns | ram_id | pc_parts | id |
| build_patterns | motherboard_id | pc_parts | id |
| build_patterns | gpu_id | pc_parts | id |
| build_patterns | cooling_id | pc_parts | id |
| build_patterns | case_id | pc_parts | id |
| build_patterns | storage_id | pc_parts | id |
| build_patterns | cpu_id | pc_parts | id |
| build_patterns | psu_id | pc_parts | id |
| compatibility_logs | user_id | users | id |
| compatibility_rules | modified_by | users | id |
| compatibility_rules | parent_rule_id | compatibility_rules | id |
| compatibility_rules | created_by | users | id |
| component_performance_tiers | component_id | pc_parts | id |
| cooling | id | pc_parts | id |
| cpu | id | pc_parts | id |
| feedback_review_queue | assigned_to | users | id |
| feedback_review_queue | feedback_id | feedback_submissions | id |
| feedback_submissions | user_id | users | id |
| feedback_submissions | reviewed_by | users | id |
| feedback_submissions | component_id | pc_parts | id |
| feedback_votes | user_id | users | id |
| feedback_votes | feedback_id | feedback_submissions | id |
| gpu | id | pc_parts | id |
| historical_builds | gpu_id | pc_parts | id |
| historical_builds | cpu_id | pc_parts | id |
| historical_patterns | created_by | users | id |
| ip_access_control | blocked_by | users | id |
| ip_logs | user_id | users | id |
| ip_logs | ip_control_id | ip_access_control | id |
| issue_verifications | issue_id | known_issues | id |
| issue_verifications | user_id | users | id |
| known_issues | component2_id | pc_parts | id |
| known_issues | component1_id | pc_parts | id |
| known_issues | reported_by | users | id |
| known_issues | resolved_by | users | id |
| messages | to_user_id | users | id |
| messages | from_user_id | users | id |
| monitor | id | pc_parts | id |
| motherboard | id | pc_parts | id |
| notification_queue | user_id | users | id |
| notifications | created_by | users | id |
| notifications | user_id | users | id |
| order_deduplication_log | created_order_id | orders | id |
| order_items | stock_item_id | stock_items | id |
| order_items | order_id | orders | id |
| order_locks | order_id | orders | id |
| order_queue | assigned_to | users | id |
| order_queue | order_id | orders | id |
| orders | virtual_build_id | user_virtual_build | id |
| orders | created_by | users | id |
| orders | cancelled_by | users | id |
| orders | assisted_by | users | id |
| password_history | user_id | users | id |
| password_resets | user_id | users | id |
| pc_case | id | pc_parts | id |
| pc_parts | updated_by | users | id |
| pc_parts | category_id | categories | id |
| pc_upgrade_new_products | product_id | pc_parts | id |
| pc_upgrade_reference_builds_metadata | generated_by | users | id |
| pre_built_pc_history | action_by | users | id |
| prebuilt_components | prebuilt_pc_id | prebuilt_pcs | id |
| prebuilt_components | pc_part_id | pc_parts | id |
| price_alerts | user_id | users | id |
| price_alerts | product_id | pc_parts | id |
| price_history | product_id | pc_parts | id |
| price_history | created_by | users | id |
| product_specs | product_id | pc_parts | id |
| psu | id | pc_parts | id |
| queue_cycles | reset_by_user_id | users | id |
| queue_management | now_serving_set_by | users | id |
| queue_management | order_id | orders | id |
| queue_management | now_serving_station_set_by | users | id |
| ram | id | pc_parts | id |
| rule_ab_test_results | rule_id | compatibility_rules | id |
| rule_ab_test_results | experiment_id | rule_ab_tests | id |
| rule_ab_tests | control_rule_id | compatibility_rules | id |
| rule_ab_tests | variant_rule_id | compatibility_rules | id |
| rule_ab_tests | created_by | users | id |
| rule_effectiveness_metrics | rule_id | compatibility_rules | id |
| rule_version_history | changed_by | users | id |
| rule_version_history | rule_id | compatibility_rules | id |
| stock_items | category_id | stock_categories | id |
| storage | id | pc_parts | id |
| successful_builds | cooling_id | pc_parts | id |
| successful_builds | case_id | pc_parts | id |
| successful_builds | psu_id | pc_parts | id |
| successful_builds | storage_id | pc_parts | id |
| successful_builds | ram_id | pc_parts | id |
| successful_builds | motherboard_id | pc_parts | id |
| successful_builds | cpu_id | pc_parts | id |
| successful_builds | user_id | users | id |
| successful_builds | gpu_id | pc_parts | id |
| successful_builds | verified_by | users | id |
| transactions | created_by | users | id |
| transactions | order_id | orders | id |
| user_compatibility_reports | user_id | users | id |
| user_personas | user_id | users | id |
| user_sessions | user_id | users | id |
| user_virtual_build | user_id | users | id |
| users | assisted_by | users | id |
| webcam | id | pc_parts | id |

## Database Statistics
- **Total Database Size:** 186 MB
- **Total Tables:** 136