--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: ip_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ip_status_enum AS ENUM (
    'allowed',
    'blocked',
    'pending'
);


--
-- Name: aggregate_ai_metrics_daily(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aggregate_ai_metrics_daily(target_date date DEFAULT (CURRENT_DATE - '1 day'::interval)) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO ai_metrics (
    metric_date,
    scenario,
    total_calls,
    successful_calls,
    failed_calls,
    cache_hits,
    avg_confidence
  )
  SELECT 
    DATE(created_at) AS metric_date,
    scenario,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE confidence > 0) AS successful_calls,
    COUNT(*) FILTER (WHERE confidence IS NULL OR confidence = 0) AS failed_calls,
    COUNT(*) FILTER (WHERE cache_hit = TRUE) AS cache_hits,
    AVG(confidence) AS avg_confidence
  FROM ai_recommendations
  WHERE DATE(created_at) = target_date
  GROUP BY DATE(created_at), scenario
  ON CONFLICT (metric_date, scenario) DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    successful_calls = EXCLUDED.successful_calls,
    failed_calls = EXCLUDED.failed_calls,
    cache_hits = EXCLUDED.cache_hits,
    avg_confidence = EXCLUDED.avg_confidence,
    updated_at = NOW();
END;
$$;


--
-- Name: FUNCTION aggregate_ai_metrics_daily(target_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.aggregate_ai_metrics_daily(target_date date) IS 'Aggregate AI metrics for specified date (default yesterday)';


--
-- Name: assign_queue_to_order(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_queue_to_order(order_id_param integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    assigned_queue INTEGER;
    current_cycle INTEGER;
BEGIN
    -- Get current cycle
    SELECT cycle_number INTO current_cycle
    FROM queue_cycles
    WHERE ended_at IS NULL
    ORDER BY cycle_number DESC
    LIMIT 1;
    
    IF current_cycle IS NULL THEN
        RAISE EXCEPTION 'No active queue cycle found';
    END IF;
    
    -- Get next available queue number
    SELECT get_next_queue_number() INTO assigned_queue;
    
    IF assigned_queue IS NULL THEN
        RAISE EXCEPTION 'All queue numbers (1-99) are exhausted. Please reset queue range.';
    END IF;
    
    -- Mark queue as USED in this cycle (permanent until reset)
    UPDATE queue_management 
    SET 
        status = 'assigned',
        order_id = order_id_param,
        assigned_at = NOW(),
        used_in_cycle = TRUE,  -- ðŸ”¥ CRITICAL: Mark as used permanently
        queue_cycle = current_cycle,
        updated_at = NOW()
    WHERE queue_number = assigned_queue;
    
    -- Update orders table
    UPDATE orders 
    SET 
        queue_number = assigned_queue,
        queue_status = 'assigned',
        queue_assigned_at = NOW(),
        updated_at = NOW()
    WHERE id = order_id_param;
    
    -- Increment cycle counter
    UPDATE queue_cycles
    SET orders_in_cycle = orders_in_cycle + 1
    WHERE cycle_number = current_cycle;
    
    RETURN assigned_queue;
END;
$$;


--
-- Name: auto_block_suspicious_ip(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_block_suspicious_ip() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Auto-block if more than 5 failed login attempts
    IF NEW.failed_login_attempts >= 5 AND NEW.status != 'blocked' THEN
        UPDATE ip_access_control 
        SET 
            status = 'blocked',
            blocked_reason = 'Auto-blocked: Excessive failed login attempts',
            blocked_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: calculate_ai_accuracy(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_ai_accuracy(start_date date, end_date date) RETURNS TABLE(period date, accuracy_percentage numeric, total_suggestions integer, total_corrections integer, most_corrected_type character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.period,
        CASE 
            WHEN s.total_suggestions > 0 
            THEN ROUND(((s.total_suggestions - s.total_corrections)::decimal / s.total_suggestions) * 100, 2)
            ELSE 0
        END as accuracy_percentage,
        s.total_suggestions,
        s.total_corrections,
        (
            SELECT key 
            FROM jsonb_each_text(s.corrections_by_type) 
            ORDER BY value::int DESC 
            LIMIT 1
        ) as most_corrected_type
    FROM ai_feedback_stats s
    WHERE s.period BETWEEN start_date AND end_date
    ORDER BY s.period DESC;
END;
$$;


--
-- Name: check_and_apply_auto_reset(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_apply_auto_reset() RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_cycle_record RECORD;
    needs_reset BOOLEAN := FALSE;
    new_cycle_number INTEGER;
    today_date DATE;
BEGIN
    -- Get current date in Asia/Manila timezone
    today_date := CURRENT_DATE AT TIME ZONE 'Asia/Manila';
    
    -- Get current active cycle
    SELECT * INTO current_cycle_record
    FROM queue_cycles
    WHERE ended_at IS NULL
    ORDER BY cycle_number DESC
    LIMIT 1;
    
    -- If no active cycle exists, create initial one
    IF current_cycle_record IS NULL THEN
        INSERT INTO queue_cycles (
            cycle_number, 
            started_at, 
            last_reset_date, 
            reset_type,
            next_auto_reset_at
        )
        VALUES (
            1, 
            NOW() AT TIME ZONE 'Asia/Manila',
            today_date,
            'auto',
            (today_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Manila'
        );
        RETURN TRUE;
    END IF;
    
    -- Check if date has changed (midnight passed)
    IF current_cycle_record.last_reset_date < today_date THEN
        needs_reset := TRUE;
        RAISE NOTICE '🔄 Auto-reset triggered: Date changed from % to %', 
            current_cycle_record.last_reset_date, today_date;
    END IF;
    
    -- Apply auto-reset if needed
    IF needs_reset THEN
        -- Close current cycle
        UPDATE queue_cycles
        SET ended_at = NOW() AT TIME ZONE 'Asia/Manila'
        WHERE cycle_number = current_cycle_record.cycle_number;
        
        -- Create new cycle
        new_cycle_number := current_cycle_record.cycle_number + 1;
        INSERT INTO queue_cycles (
            cycle_number, 
            started_at, 
            reset_by_user_id, 
            reset_type,
            last_reset_date,
            next_auto_reset_at,
            reset_reason
        )
        VALUES (
            new_cycle_number, 
            NOW() AT TIME ZONE 'Asia/Manila',
            NULL, -- NULL means auto-reset
            'auto',
            today_date,
            (today_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Manila',
            'Automatic midnight reset (12:00 AM Asia/Manila)'
        );
        
        -- Reset ALL queue numbers
        UPDATE queue_management
        SET 
            status = 'available',
            order_id = NULL,
            assigned_at = NULL,
            completed_at = NULL,
            used_in_cycle = FALSE,
            queue_cycle = new_cycle_number,
            updated_at = NOW() AT TIME ZONE 'Asia/Manila';
        
        RAISE NOTICE '✅ Auto-reset complete: Cycle % → Cycle %', 
            current_cycle_record.cycle_number, new_cycle_number;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


--
-- Name: FUNCTION check_and_apply_auto_reset(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_and_apply_auto_reset() IS 'Automatically checks if midnight (12:00 AM Asia/Manila) has passed and resets queue cycle if needed. Called on every queue number request.';


--
-- Name: check_duplicate_order(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_duplicate_order(p_order_hash character varying) RETURNS TABLE(is_duplicate boolean, existing_order_id integer, existing_order_data jsonb, created_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM pending_orders WHERE order_hash = p_order_hash AND status = 'pending') AS is_duplicate,
        po.order_id,
        po.order_data,
        po.created_at
    FROM pending_orders po
    WHERE po.order_hash = p_order_hash 
    AND po.status = 'pending'
    AND po.expires_at > NOW()
    ORDER BY po.created_at DESC
    LIMIT 1;
END;
$$;


--
-- Name: FUNCTION check_duplicate_order(p_order_hash character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_duplicate_order(p_order_hash character varying) IS 'Checks if order hash already exists in pending orders (duplicate detection)';


--
-- Name: check_price_alerts(integer, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_price_alerts(p_product_id integer, p_new_price numeric) RETURNS TABLE(alert_id integer, user_id integer, condition character varying, target_price numeric)
    LANGUAGE plpgsql
    AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    pa.id,
                    pa.user_id,
                    pa.condition,
                    pa.target_price
                FROM price_alerts pa
                WHERE pa.product_id = p_product_id
                    AND pa.is_active = true
                    AND (
                        (pa.condition = 'less_than' AND p_new_price <= pa.target_price) OR
                        (pa.condition = 'greater_than' AND p_new_price >= pa.target_price)
                    );
            END;
            $$;


--
-- Name: cleanup_completed_queues(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_completed_queues() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    --  CRITICAL FIX: Do NOT reset used_in_cycle flag!
    -- Queue numbers stay 'used' until midnight auto-reset or manual reset
    -- This function now only cleans up orphaned assignments
    
    -- Cleanup: Release queue assignments for orders that are completed/cancelled
    -- but keep used_in_cycle = TRUE so numbers aren't reused within same day
    UPDATE queue_management
    SET
        order_id = NULL,
        updated_at = NOW()
    WHERE status IN ('completed', 'cancelled')
    AND completed_at < NOW() - INTERVAL '1 hour'
    AND order_id IS NOT NULL;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    RETURN cleaned_count;
END;
$$;


--
-- Name: cleanup_expired_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_cache() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM compatibility_cache
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
END;
$$;


--
-- Name: cleanup_expired_locks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_locks() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM order_locks 
    WHERE expires_at < CURRENT_TIMESTAMP 
      AND status = 'locked';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_expired_pending_orders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_pending_orders() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired pending orders (older than expires_at)
    -- FIX: Remove RETURNING COUNT(*) - use GET DIAGNOSTICS instead
    DELETE FROM pending_orders 
    WHERE expires_at < NOW();
    
    -- Get count of deleted rows using GET DIAGNOSTICS (correct method)
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup if any rows deleted
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Cleaned up % expired pending orders', deleted_count;
    END IF;
    
    RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_pending_orders(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_pending_orders() IS 'Removes expired pending orders to prevent table bloat (FIXED: No aggregate in RETURNING)';


--
-- Name: cleanup_old_compatibility_logs(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_compatibility_logs(months_to_keep integer DEFAULT 6) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM compatibility_logs 
  WHERE created_at < NOW() - (months_to_keep || ' months')::INTERVAL
    AND outcome_quality IS NOT NULL; -- Keep logs with unknown outcomes
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_old_compatibility_logs(months_to_keep integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_old_compatibility_logs(months_to_keep integer) IS 'Cleanup compatibility logs older than specified months (default 6)';


--
-- Name: cleanup_old_ip_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_ip_logs() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM ip_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


--
-- Name: cleanup_old_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_sessions() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM kiosk_sessions 
    WHERE last_activity < (CURRENT_TIMESTAMP - INTERVAL '24 hours');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: complete_order_queue(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_order_queue(order_id_param integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update order status to completed
    UPDATE orders 
    SET 
        queue_status = 'completed',
        queue_completed_at = NOW(),
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = order_id_param;
    
    -- Update queue status but DON'T make available
    -- Queue stays "used" until manual cycle reset
    UPDATE queue_management 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE order_id = order_id_param;
    
    -- Keep used_in_cycle = TRUE (no recycling!)
END;
$$;


--
-- Name: daily_queue_reset(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.daily_queue_reset() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    reset_count INTEGER := 0;
BEGIN
    -- Reset all queues that were assigned before today
    UPDATE queue_management 
    SET 
        status = 'available',
        order_id = NULL,
        assigned_at = NULL,
        completed_at = NULL,
        assigned_date = NULL,
        updated_at = NOW()
    WHERE assigned_date < CURRENT_DATE;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    RETURN reset_count;
END;
$$;


--
-- Name: FUNCTION daily_queue_reset(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.daily_queue_reset() IS 'Resets all queues from previous days - should run daily via cron/scheduler';


--
-- Name: generate_formatted_order_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_formatted_order_id() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_year VARCHAR(4);
    next_counter INTEGER;
    formatted_id VARCHAR(20);
    max_retries INTEGER := 5;
    retry_count INTEGER := 0;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Retry loop to handle concurrent access
    LOOP
        BEGIN
            -- Lock the row for update to prevent race conditions
            SELECT current_value INTO next_counter
            FROM order_counters
            WHERE counter_type = 'order_yearly' AND counter_period = current_year
            FOR UPDATE;
            
            -- If counter doesn't exist, create it
            IF NOT FOUND THEN
                INSERT INTO order_counters (counter_type, counter_period, current_value, reset_date)
                VALUES ('order_yearly', current_year, 1, (current_year || '-01-01')::DATE)
                ON CONFLICT (counter_type, counter_period) DO NOTHING;
                
                -- Re-select with lock
                SELECT current_value INTO next_counter
                FROM order_counters
                WHERE counter_type = 'order_yearly' AND counter_period = current_year
                FOR UPDATE;
            END IF;
            
            -- Increment counter
            next_counter := next_counter + 1;
            
            -- Update counter
            UPDATE order_counters
            SET current_value = next_counter, updated_at = NOW()
            WHERE counter_type = 'order_yearly' AND counter_period = current_year;
            
            -- Format as OID-YEAR-0001
            formatted_id := 'OID-' || current_year || '-' || LPAD(next_counter::TEXT, 4, '0');
            
            -- Check if this ID already exists (paranoid check)
            IF EXISTS (SELECT 1 FROM orders WHERE order_id_formatted = formatted_id) THEN
                -- ID collision detected, retry with next number
                retry_count := retry_count + 1;
                IF retry_count >= max_retries THEN
                    RAISE EXCEPTION 'Failed to generate unique order ID after % retries', max_retries;
                END IF;
                CONTINUE;
            END IF;
            
            RETURN formatted_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Handle any deadlock or serialization errors
                retry_count := retry_count + 1;
                IF retry_count >= max_retries THEN
                    RAISE;
                END IF;
                -- Small delay before retry (10ms)
                PERFORM pg_sleep(0.01);
        END;
    END LOOP;
END;
$$;


--
-- Name: generate_formatted_transaction_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_formatted_transaction_id() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_period VARCHAR(7);
    next_counter INTEGER;
    formatted_id VARCHAR(20);
    max_retries INTEGER := 5;
    retry_count INTEGER := 0;
BEGIN
    current_period := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Retry loop to handle concurrent access
    LOOP
        BEGIN
            -- Lock the row for update to prevent race conditions
            SELECT current_value INTO next_counter
            FROM order_counters
            WHERE counter_type = 'transaction_monthly' AND counter_period = current_period
            FOR UPDATE;
            
            -- If counter doesn't exist, create it
            IF NOT FOUND THEN
                INSERT INTO order_counters (counter_type, counter_period, current_value, reset_date)
                VALUES ('transaction_monthly', current_period, 1, DATE_TRUNC('month', CURRENT_DATE))
                ON CONFLICT (counter_type, counter_period) DO NOTHING;
                
                -- Re-select with lock
                SELECT current_value INTO next_counter
                FROM order_counters
                WHERE counter_type = 'transaction_monthly' AND counter_period = current_period
                FOR UPDATE;
            END IF;
            
            -- Increment counter
            next_counter := next_counter + 1;
            
            -- Update counter
            UPDATE order_counters
            SET current_value = next_counter, updated_at = NOW()
            WHERE counter_type = 'transaction_monthly' AND counter_period = current_period;
            
            -- Format as TID2509-1 (TIDYYMM-counter)
            formatted_id := 'TID' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || next_counter::TEXT;
            
            -- Check if this ID already exists (paranoid check)
            IF EXISTS (SELECT 1 FROM orders WHERE transaction_id_formatted = formatted_id) THEN
                -- ID collision detected, retry with next number
                retry_count := retry_count + 1;
                IF retry_count >= max_retries THEN
                    RAISE EXCEPTION 'Failed to generate unique transaction ID after % retries', max_retries;
                END IF;
                CONTINUE;
            END IF;
            
            RETURN formatted_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Handle any deadlock or serialization errors
                retry_count := retry_count + 1;
                IF retry_count >= max_retries THEN
                    RAISE;
                END IF;
                -- Small delay before retry (10ms)
                PERFORM pg_sleep(0.01);
        END;
    END LOOP;
END;
$$;


--
-- Name: generate_order_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_id() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_year VARCHAR(4);
    next_counter INTEGER;
    formatted_id VARCHAR(20);
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get or create yearly counter
    INSERT INTO order_counters (counter_type, counter_period, current_value, reset_date)
    VALUES ('order_yearly', current_year, 1, (current_year || '-01-01')::DATE)
    ON CONFLICT (counter_type, counter_period) 
    DO UPDATE SET 
        current_value = order_counters.current_value + 1,
        updated_at = NOW()
    RETURNING current_value INTO next_counter;
    
    -- Format as OID-YEAR-0001
    formatted_id := 'OID-' || current_year || '-' || LPAD(next_counter::TEXT, 4, '0');
    
    RETURN formatted_id;
END;
$$;


--
-- Name: FUNCTION generate_order_id(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_order_id() IS 'Generates formatted order ID: OID-YEAR-0001 with yearly reset';


--
-- Name: generate_transaction_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_transaction_id() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_period VARCHAR(7);
    next_counter INTEGER;
    formatted_id VARCHAR(20);
BEGIN
    current_period := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Get or create monthly counter
    INSERT INTO order_counters (counter_type, counter_period, current_value, reset_date)
    VALUES ('transaction_monthly', current_period, 1, DATE_TRUNC('month', CURRENT_DATE))
    ON CONFLICT (counter_type, counter_period)
    DO UPDATE SET 
        current_value = order_counters.current_value + 1,
        updated_at = NOW()
    RETURNING current_value INTO next_counter;
    
    -- Format as TID2509-1 (TIDYYMM-counter)
    formatted_id := 'TID' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || next_counter::TEXT;
    
    RETURN formatted_id;
END;
$$;


--
-- Name: FUNCTION generate_transaction_id(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_transaction_id() IS 'Generates formatted transaction ID: TID2509-1 with monthly reset';


--
-- Name: get_component_satisfaction_score(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_component_satisfaction_score(component_id_param integer) RETURNS TABLE(total_ratings bigint, avg_rating numeric, positive_feedback bigint, critical_issues bigint, satisfaction_score numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_ratings,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_feedback,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_issues,
        GREATEST(0, LEAST(100, 
            (COALESCE(AVG(rating), 3) / 5.0) * 80 +
            (COALESCE(SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0), 0)) * 20 -
            (COALESCE(SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0), 0)) * 30
        )) as satisfaction_score
    FROM feedback_submissions
    WHERE component_id = component_id_param AND rating IS NOT NULL;
END;
$$;


--
-- Name: get_next_queue_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_queue_number() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_queue INTEGER;
    current_cycle INTEGER;
    auto_reset_applied BOOLEAN;
BEGIN
    -- Check and apply auto-reset if midnight passed
    auto_reset_applied := check_and_apply_auto_reset();
    
    -- Get current cycle number (may have changed after auto-reset)
    SELECT cycle_number INTO current_cycle
    FROM queue_cycles
    WHERE ended_at IS NULL
    ORDER BY cycle_number DESC
    LIMIT 1;
    
    IF current_cycle IS NULL THEN
        RAISE EXCEPTION 'No active queue cycle found';
    END IF;
    
    -- Find lowest unused queue number in current cycle
    SELECT queue_number INTO next_queue
    FROM queue_management
    WHERE queue_cycle = current_cycle
    AND used_in_cycle = FALSE
    ORDER BY queue_number
    LIMIT 1;
    
    RETURN next_queue; -- Returns NULL if all 99 are used
END;
$$;


--
-- Name: FUNCTION get_next_queue_number(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_next_queue_number() IS 'Returns next available queue number (1-99). Automatically checks for midnight reset before returning. Returns NULL if all 99 are exhausted.';


--
-- Name: get_queue_availability(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_queue_availability() RETURNS TABLE(total_queues integer, used_queues integer, available_queues integer, current_cycle integer, needs_reset boolean, last_assigned_queue integer, last_reset_date date, next_auto_reset_at timestamp without time zone, hours_until_reset numeric, reset_type character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_cycle_info RECORD;
    today_date DATE;
    next_midnight TIMESTAMP;
BEGIN
    -- Get current date
    today_date := CURRENT_DATE AT TIME ZONE 'Asia/Manila';
    
    -- Calculate next midnight (12:00 AM)
    next_midnight := (today_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Manila';
    
    -- Get current cycle info
    SELECT * INTO current_cycle_info
    FROM queue_cycles
    WHERE ended_at IS NULL
    ORDER BY cycle_number DESC
    LIMIT 1;
    
    -- Return queue availability with reset info
    RETURN QUERY
    SELECT 
        99 as total_queues,
        COUNT(CASE WHEN qm.used_in_cycle = TRUE THEN 1 END)::INTEGER as used_queues,
        COUNT(CASE WHEN qm.used_in_cycle = FALSE THEN 1 END)::INTEGER as available_queues,
        COALESCE(current_cycle_info.cycle_number, 1)::INTEGER as current_cycle,
        (COUNT(CASE WHEN qm.used_in_cycle = FALSE THEN 1 END) = 0) as needs_reset,
        (SELECT MAX(queue_number) FROM queue_management WHERE used_in_cycle = TRUE)::INTEGER as last_assigned_queue,
        COALESCE(current_cycle_info.last_reset_date, today_date) as last_reset_date,
        next_midnight as next_auto_reset_at,
        ROUND(EXTRACT(EPOCH FROM (next_midnight - NOW() AT TIME ZONE 'Asia/Manila')) / 3600, 2) as hours_until_reset,
        COALESCE(current_cycle_info.reset_type, 'auto'::VARCHAR(20)) as reset_type
    FROM queue_management qm;
END;
$$;


--
-- Name: FUNCTION get_queue_availability(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_queue_availability() IS 'Returns comprehensive queue stats including: total/used/available counts, current cycle, needs_reset flag, last reset date, next auto-reset time, and hours until reset.';


--
-- Name: log_compatibility_check(character varying, jsonb, jsonb, jsonb, jsonb, character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_compatibility_check(p_build_hash character varying, p_parts_json jsonb, p_rules_verdict jsonb, p_ai_verdict jsonb, p_user_context jsonb, p_session_id character varying, p_user_decision character varying, p_outcome_quality character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
      DECLARE
        new_id INT;
      BEGIN
        INSERT INTO compatibility_logs (
          build_hash, parts_json, rules_verdict, ai_verdict,
          user_context, session_id, user_decision, outcome_quality,
          created_at
        ) VALUES (
          p_build_hash, p_parts_json, p_rules_verdict, p_ai_verdict,
          p_user_context, p_session_id, p_user_decision, p_outcome_quality,
          NOW()
        )
        RETURNING id INTO new_id;
        
        RETURN new_id;
      END;
      $$;


--
-- Name: log_price_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_price_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                -- Only log if price actually changed
                IF OLD.price IS DISTINCT FROM NEW.price THEN
                    INSERT INTO price_history (
                        product_id, 
                        price, 
                        previous_price, 
                        price_change, 
                        price_change_percent,
                        source,
                        created_by
                    ) VALUES (
                        NEW.id,
                        NEW.price,
                        OLD.price,
                        NEW.price - OLD.price,
                        CASE 
                            WHEN OLD.price = 0 THEN 100
                            ELSE ((NEW.price - OLD.price) / OLD.price * 100)::numeric(5,2)
                        END,
                        'auto_trigger',
                        NEW.updated_by
                    );
                END IF;
                RETURN NEW;
            END;
            $$;


--
-- Name: populate_product_specs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.populate_product_specs() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    processed_count INTEGER := 0;
    product RECORD;
BEGIN
    FOR product IN 
        SELECT p.* FROM pc_parts p 
        LEFT JOIN product_specs ps ON p.id = ps.product_id 
        WHERE ps.product_id IS NULL 
        AND p.stock > 0
    LOOP
        INSERT INTO product_specs (product_id, normalized_specs, compatibility_metadata)
        VALUES (
            product.id,
            jsonb_build_object(
                'name', product.name,
                'category', product.category,
                'price', product.price,
                'brand', COALESCE(product.brand, 'Unknown'),
                'specs', COALESCE(product.specifications, '{}'::jsonb),
                'stock', product.stock
            ),
            jsonb_build_object(
                'needs_enrichment', true,
                'auto_populated', true
            )
        );
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$;


--
-- Name: record_rule_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_rule_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only record if actual changes were made (not just timestamp updates)
    IF (OLD.rule_expression IS DISTINCT FROM NEW.rule_expression) OR
       (OLD.error_message IS DISTINCT FROM NEW.error_message) OR
       (OLD.warning_message IS DISTINCT FROM NEW.warning_message) OR
       (OLD.solution_message IS DISTINCT FROM NEW.solution_message) OR
       (OLD.enabled IS DISTINCT FROM NEW.enabled) OR
       (OLD.priority IS DISTINCT FROM NEW.priority) OR
       (OLD.severity IS DISTINCT FROM NEW.severity) THEN
        
        -- Insert old version into history
        INSERT INTO rule_version_history (
            rule_id, version, rule_name, rule_category,
            component_a_category, component_b_category,
            rule_type, rule_expression, severity,
            error_message, warning_message, solution_message,
            enabled, priority, version_notes, changed_by, change_reason
        ) VALUES (
            OLD.id, OLD.version, OLD.rule_name, OLD.rule_category,
            OLD.component_a_category, OLD.component_b_category,
            OLD.rule_type, OLD.rule_expression, OLD.severity,
            OLD.error_message, OLD.warning_message, OLD.solution_message,
            OLD.enabled, OLD.priority, NEW.version_notes, NEW.modified_by,
            'Rule updated via trigger'
        );
        
        -- Increment version number
        NEW.version = OLD.version + 1;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: refresh_user_presence_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_user_presence_stats() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW user_presence_stats;
END;
$$;


--
-- Name: reset_queue_cycle(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_queue_cycle(reset_by_user_id integer DEFAULT NULL::integer) RETURNS TABLE(new_cycle_number integer, old_cycle_number integer, reset_at timestamp without time zone, reset_type character varying, next_auto_reset_at timestamp without time zone, preserved_pending_count integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_cycle INTEGER;
    new_cycle INTEGER;
    today_date DATE;
    next_reset TIMESTAMP;
    pending_count INTEGER;
BEGIN
    -- Get current date in Asia/Manila
    today_date := CURRENT_DATE AT TIME ZONE 'Asia/Manila';
    next_reset := (today_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Manila';
    
    -- Get current active cycle
    SELECT cycle_number INTO current_cycle
    FROM queue_cycles
    WHERE ended_at IS NULL
    ORDER BY cycle_number DESC
    LIMIT 1;
    
    IF current_cycle IS NULL THEN
        RAISE EXCEPTION 'No active cycle found to reset';
    END IF;
    
    -- Count pending queues that will be preserved
    SELECT COUNT(*) INTO pending_count
    FROM queue_management qm
    INNER JOIN orders o ON qm.order_id = o.id
    WHERE qm.status = 'assigned'
      AND qm.order_id IS NOT NULL
      AND o.status NOT IN ('completed', 'cancelled')
      AND o.queue_status = 'assigned';
    
    -- Close current cycle
    UPDATE queue_cycles
    SET ended_at = NOW() AT TIME ZONE 'Asia/Manila'
    WHERE cycle_number = current_cycle;
    
    -- Create new cycle
    new_cycle := current_cycle + 1;
    INSERT INTO queue_cycles (
        cycle_number, 
        started_at, 
        reset_by_user_id, 
        reset_type,
        last_reset_date,
        next_auto_reset_at,
        reset_reason
    )
    VALUES (
        new_cycle, 
        NOW() AT TIME ZONE 'Asia/Manila',
        reset_by_user_id,
        'manual',
        today_date,
        next_reset,
        'Manual reset by admin - pending queues preserved'
    );
    
    -- âœ… CRITICAL FIX: Only reset AVAILABLE and COMPLETED/CANCELLED queues
    -- DO NOT touch queues that are still ASSIGNED (pending)
    UPDATE queue_management
    SET 
        status = 'available',
        order_id = NULL,
        assigned_at = NULL,
        completed_at = NULL,
        used_in_cycle = FALSE,
        queue_cycle = new_cycle,
        updated_at = NOW() AT TIME ZONE 'Asia/Manila'
    WHERE status IN ('available', 'completed', 'cancelled')
       OR order_id IS NULL;
    
    -- âš¡ Update cycle number for ASSIGNED queues (keep them assigned but update cycle)
    UPDATE queue_management
    SET 
        queue_cycle = new_cycle,
        updated_at = NOW() AT TIME ZONE 'Asia/Manila'
    WHERE status = 'assigned'
      AND order_id IS NOT NULL;
    
    RAISE NOTICE 'Reset cycle % â†’ %, preserved % pending queues', current_cycle, new_cycle, pending_count;
    
    RETURN QUERY 
    SELECT 
        new_cycle, 
        current_cycle, 
        NOW() AT TIME ZONE 'Asia/Manila',
        'manual'::VARCHAR(20),
        next_reset,
        pending_count;
END;
$$;


--
-- Name: FUNCTION reset_queue_cycle(reset_by_user_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reset_queue_cycle(reset_by_user_id integer) IS 'ADMIN ONLY: Manually reset queue numbering to start new cycle (1-99). 
âœ… PRESERVES pending/assigned queues - only resets available and completed queues.
ðŸ”„ Assigned queues keep their numbers but cycle counter resets.
ðŸ“Š Returns count of preserved pending queues.';


--
-- Name: rollback_rule_to_version(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rollback_rule_to_version(p_rule_id integer, p_target_version integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_history_record RECORD;
BEGIN
    -- Get the target version from history
    SELECT * INTO v_history_record
    FROM rule_version_history
    WHERE rule_id = p_rule_id AND version = p_target_version;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Version % not found for rule %', p_target_version, p_rule_id;
        RETURN FALSE;
    END IF;
    
    -- Update rule to match historical version
    UPDATE compatibility_rules SET
        rule_expression = v_history_record.rule_expression,
        error_message = v_history_record.error_message,
        warning_message = v_history_record.warning_message,
        solution_message = v_history_record.solution_message,
        enabled = v_history_record.enabled,
        priority = v_history_record.priority,
        severity = v_history_record.severity,
        version_notes = 'Rolled back to version ' || p_target_version,
        updated_at = NOW()
    WHERE id = p_rule_id;
    
    RETURN TRUE;
END;
$$;


--
-- Name: FUNCTION rollback_rule_to_version(p_rule_id integer, p_target_version integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.rollback_rule_to_version(p_rule_id integer, p_target_version integer) IS 'Rollback a rule to a previous version. Usage: SELECT rollback_rule_to_version(123, 5);';


--
-- Name: safe_int_convert(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.safe_int_convert(input_text text) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
BEGIN
    -- Return NULL for non-numeric strings instead of causing an error
    RETURN CASE 
        WHEN input_text ~ '^[0-9]+$' THEN input_text::INTEGER
        ELSE NULL
    END;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$_$;


--
-- Name: update_ai_feedback_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ai_feedback_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update or insert daily stats
    INSERT INTO ai_feedback_stats (
        period,
        total_corrections,
        corrections_by_type
    ) VALUES (
        CURRENT_DATE,
        1,
        jsonb_build_object(NEW.suggestion_type, 1)
    )
    ON CONFLICT (period) DO UPDATE SET
        total_corrections = ai_feedback_stats.total_corrections + 1,
        corrections_by_type = COALESCE(ai_feedback_stats.corrections_by_type, '{}'::jsonb) || 
            jsonb_build_object(
                NEW.suggestion_type,
                COALESCE((ai_feedback_stats.corrections_by_type->>NEW.suggestion_type)::integer, 0) + 1
            ),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;


--
-- Name: update_assistance_requests_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_assistance_requests_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_ip_access_control_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ip_access_control_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_messages_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_messages_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_pc_customized_builds_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_pc_customized_builds_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_price_history_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_price_history_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_queue_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_queue_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update queue_management table when order queue_status changes
    IF NEW.queue_status != OLD.queue_status THEN
        UPDATE queue_management 
        SET 
            status = CASE 
                WHEN NEW.queue_status = 'assigned' THEN 'assigned'
                WHEN NEW.queue_status = 'processing' THEN 'processing'
                WHEN NEW.queue_status = 'completed' THEN 'completed'
                ELSE 'available'
            END,
            assigned_at = CASE 
                WHEN NEW.queue_status = 'assigned' AND OLD.queue_status = 'waiting' THEN NOW()
                ELSE assigned_at
            END,
            assigned_date = CASE
                WHEN NEW.queue_status = 'assigned' AND OLD.queue_status = 'waiting' THEN CURRENT_DATE
                ELSE assigned_date
            END,
            completed_at = CASE 
                WHEN NEW.queue_status = 'completed' THEN NOW()
                ELSE completed_at
            END,
            updated_at = NOW()
        WHERE queue_number = NEW.queue_number;
        
        -- If order is completed, update status but KEEP assigned_date
        -- Queue will become available tomorrow, not today
        IF NEW.queue_status = 'completed' THEN
            UPDATE queue_management 
            SET 
                status = 'completed',
                -- Do NOT clear assigned_date - this prevents same-day reuse
                completed_at = NOW(),
                updated_at = NOW()
            WHERE queue_number = NEW.queue_number;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_specification_schemas_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_specification_schemas_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_user_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
            UPDATE users 
            SET last_activity = CURRENT_TIMESTAMP 
            WHERE id = NEW.user_id;
            RETURN NEW;
        END;
        $$;


--
-- Name: validate_user_preferences(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_user_preferences() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure preferences is always a valid JSON object
    IF NEW.preferences IS NULL THEN
        NEW.preferences = '{}'::jsonb;
    END IF;
    
    -- Validate theme (if present)
    IF NEW.preferences ? 'theme' AND NEW.preferences->>'theme' NOT IN ('light', 'dark', 'auto') THEN
        RAISE EXCEPTION 'Invalid theme value. Must be light, dark, or auto';
    END IF;
    
    -- Validate currency (if present)
    IF NEW.preferences ? 'currency' AND NEW.preferences->>'currency' NOT IN ('PHP', 'USD', 'EUR') THEN
        RAISE EXCEPTION 'Invalid currency value. Must be PHP, USD, or EUR';
    END IF;
    
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _deprecated_monitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._deprecated_monitors (
    id integer NOT NULL,
    part_id integer,
    name character varying(100) NOT NULL,
    screen_size character varying(50),
    resolution character varying(50),
    refresh_rate integer,
    response_time numeric(5,2),
    panel_type character varying(50),
    aspect_ratio character varying(50),
    brightness integer,
    contrast_ratio character varying(50),
    color_gamut character varying(50),
    ports character varying(200),
    vesa_mount boolean DEFAULT false,
    curved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE _deprecated_monitors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public._deprecated_monitors IS 'DEPRECATED: Empty table, superseded by monitor + pc_parts. Renamed 2025-01-13. View "monitors" provides backward compat.';


--
-- Name: user_legacy_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_legacy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _deprecated_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._deprecated_user (
    id integer DEFAULT nextval('public.user_legacy_id_seq'::regclass) NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'customer'::character varying])::text[])))
);


--
-- Name: TABLE _deprecated_user; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public._deprecated_user IS 'DEPRECATED: Empty legacy table, superseded by users. Renamed 2025-01-13. View "user" provides backward compat.';


--
-- Name: _deprecated_webcams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._deprecated_webcams (
    id integer NOT NULL,
    part_id integer,
    name character varying(100) NOT NULL,
    resolution character varying(50),
    connection character varying(50),
    focus_type character varying(50),
    operating_system character varying(50),
    fov_angle integer,
    frame_rate integer,
    microphone_builtin boolean DEFAULT false,
    privacy_shutter boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE _deprecated_webcams; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public._deprecated_webcams IS 'DEPRECATED: Empty table, superseded by webcam + pc_parts. Renamed 2025-01-13. View "webcams" provides backward compat.';


--
-- Name: _migration_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migration_history (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    description text,
    executed_at timestamp with time zone DEFAULT now(),
    execution_time_ms integer,
    status character varying(20) DEFAULT 'completed'::character varying
);


--
-- Name: _migration_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._migration_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _migration_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._migration_history_id_seq OWNED BY public._migration_history.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_name character varying(255),
    customer_email character varying(255),
    customer_phone character varying(50),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    payment_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    total numeric(10,2) DEFAULT 0,
    priority character varying(20) DEFAULT 'normal'::character varying,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancelled_by integer,
    cancellation_reason text,
    assisted_by integer,
    queue_number integer,
    order_id_formatted character varying(20),
    transaction_id_formatted character varying(20),
    queue_status character varying(20) DEFAULT 'waiting'::character varying,
    queue_assigned_at timestamp with time zone,
    queue_completed_at timestamp with time zone,
    service_type character varying(50) DEFAULT 'self-order'::character varying,
    ai_assisted boolean DEFAULT false,
    virtual_build_id integer,
    session_id character varying(255),
    tablet_id character varying(100),
    duplicate_check_hash character varying(255),
    service_fee numeric(10,2) DEFAULT 0.00,
    labor_charges numeric(10,2) DEFAULT 0.00,
    other_charges numeric(10,2) DEFAULT 0.00,
    service_notes text,
    underlying_issues text,
    cleaning_assessment jsonb,
    manual_processing boolean DEFAULT false,
    manual_processing_notes text,
    assessment_data jsonb,
    serving_position character varying(10),
    is_now_serving boolean DEFAULT false,
    serving_started_at timestamp without time zone,
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT orders_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT orders_queue_status_check CHECK (((queue_status)::text = ANY ((ARRAY['waiting'::character varying, 'assigned'::character varying, 'processing'::character varying, 'ready'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT orders_serving_position_check CHECK (((serving_position)::text = ANY ((ARRAY['left'::character varying, 'right'::character varying, NULL::character varying])::text[]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: COLUMN orders.cancelled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.cancelled_at IS 'Timestamp when order was cancelled';


--
-- Name: COLUMN orders.cancelled_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.cancelled_by IS 'User ID of admin who cancelled the order';


--
-- Name: COLUMN orders.cancellation_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.cancellation_reason IS 'Reason provided when order was cancelled by admin';


--
-- Name: COLUMN orders.assessment_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.assessment_data IS 'Stores PC cleaning assessment data: {hasCleaned, lastCleaned, cleaningType, pcAge, underlyingIssues, selectedIssues[], reCaseRequested}';


--
-- Name: queue_management; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue_management (
    id integer NOT NULL,
    queue_number integer NOT NULL,
    status character varying(20) DEFAULT 'available'::character varying,
    order_id integer,
    assigned_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_date date,
    is_now_serving boolean DEFAULT false,
    now_serving_set_at timestamp without time zone,
    now_serving_set_by integer,
    queue_cycle integer DEFAULT 1,
    used_in_cycle boolean DEFAULT false,
    now_serving_station integer,
    now_serving_station_set_at timestamp without time zone,
    now_serving_station_set_by integer,
    CONSTRAINT queue_management_now_serving_station_check CHECK ((now_serving_station = ANY (ARRAY[1, 2]))),
    CONSTRAINT queue_management_status_check CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'assigned'::character varying, 'processing'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE queue_management; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.queue_management IS 'Manages queue numbers 1-99 with recycling capability';


--
-- Name: COLUMN queue_management.assigned_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_management.assigned_date IS 'Date when queue was assigned - prevents same-day recycling';


--
-- Name: COLUMN queue_management.is_now_serving; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_management.is_now_serving IS 'Indicates if this queue is currently being served (only one queue can be now serving at a time)';


--
-- Name: COLUMN queue_management.now_serving_set_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_management.now_serving_set_at IS 'Timestamp when queue was set as now serving';


--
-- Name: COLUMN queue_management.now_serving_set_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_management.now_serving_set_by IS 'User ID who set this queue as now serving';


--
-- Name: COLUMN queue_management.queue_cycle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_management.queue_cycle IS 'Current cycle number - increments on manual reset';


--
-- Name: COLUMN queue_management.used_in_cycle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_management.used_in_cycle IS 'TRUE if queue number has been assigned in current cycle (never recycled until manual reset)';


--
-- Name: COLUMN queue_management.now_serving_station; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_management.now_serving_station IS 'Dual serving station: 1 (left) or 2 (right)';


--
-- Name: active_queue_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_queue_view AS
 SELECT qm.queue_number,
    qm.status AS queue_status,
    qm.assigned_date,
    o.id AS order_id,
    o.order_id_formatted,
    o.customer_name,
    o.total_amount,
    o.queue_status AS order_queue_status,
    qm.assigned_at,
    qm.completed_at,
        CASE
            WHEN (((qm.status)::text = 'available'::text) AND (qm.assigned_date = CURRENT_DATE)) THEN 'Used Today (Available Tomorrow)'::text
            WHEN ((qm.status)::text = 'available'::text) THEN 'Available'::text
            WHEN ((qm.status)::text = 'assigned'::text) THEN 'Assigned'::text
            WHEN ((qm.status)::text = 'processing'::text) THEN 'Processing'::text
            WHEN (((qm.status)::text = 'completed'::text) AND (qm.assigned_date = CURRENT_DATE)) THEN 'Completed Today (Resets Tomorrow)'::text
            WHEN ((qm.status)::text = 'completed'::text) THEN 'Completed'::text
            ELSE NULL::text
        END AS display_status
   FROM (public.queue_management qm
     LEFT JOIN public.orders o ON ((qm.order_id = o.id)))
  ORDER BY qm.queue_number;


--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id integer NOT NULL,
    user_id integer,
    session_id integer,
    activity_type character varying(100) NOT NULL,
    activity_details jsonb,
    ip_address inet,
    user_agent text,
    endpoint character varying(255),
    method character varying(10),
    status_code integer,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_log_id_seq OWNED BY public.activity_log.id;


--
-- Name: ai_corrections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_corrections (
    id integer NOT NULL,
    suggestion_id character varying(255) NOT NULL,
    suggestion_type character varying(50) NOT NULL,
    admin_user_id integer NOT NULL,
    original_suggestion jsonb NOT NULL,
    corrected_suggestion jsonb NOT NULL,
    correction_reason text,
    confidence_score integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT ai_corrections_confidence_score_check CHECK (((confidence_score >= 1) AND (confidence_score <= 5)))
);


--
-- Name: TABLE ai_corrections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_corrections IS 'Stores admin corrections to AI suggestions for continuous learning';


--
-- Name: ai_feedback_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_feedback_stats (
    id integer NOT NULL,
    period date NOT NULL,
    total_suggestions integer DEFAULT 0,
    total_corrections integer DEFAULT 0,
    accuracy_score numeric(5,2),
    consistency_score numeric(5,2),
    improvement_percentage numeric(5,2),
    avg_confidence numeric(3,2),
    corrections_by_type jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE ai_feedback_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_feedback_stats IS 'Aggregated daily statistics on AI accuracy and corrections';


--
-- Name: ai_pending_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_pending_reviews (
    id integer NOT NULL,
    suggestion_id character varying(255) NOT NULL,
    suggestion_type character varying(50) NOT NULL,
    suggestion_data jsonb NOT NULL,
    context_data jsonb,
    priority integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    assigned_to integer,
    created_at timestamp without time zone DEFAULT now(),
    reviewed_at timestamp without time zone
);


--
-- Name: TABLE ai_pending_reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_pending_reviews IS 'Queue of AI suggestions pending admin review';


--
-- Name: ai_admin_dashboard_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ai_admin_dashboard_stats AS
 SELECT ( SELECT count(*) AS count
           FROM public.ai_pending_reviews
          WHERE ((ai_pending_reviews.status)::text = 'pending'::text)) AS pending_count,
    ( SELECT count(*) AS count
           FROM public.ai_pending_reviews
          WHERE ((ai_pending_reviews.status)::text = 'in_review'::text)) AS in_review_count,
    ( SELECT count(*) AS count
           FROM public.ai_corrections
          WHERE (ai_corrections.created_at > (now() - '24:00:00'::interval))) AS corrections_24h,
    ( SELECT count(*) AS count
           FROM public.ai_corrections
          WHERE (ai_corrections.created_at > (now() - '7 days'::interval))) AS corrections_7d,
    ( SELECT avg(ai_corrections.confidence_score) AS avg
           FROM public.ai_corrections
          WHERE (ai_corrections.created_at > (now() - '7 days'::interval))) AS avg_confidence_7d,
    ( SELECT ai_feedback_stats.accuracy_score
           FROM public.ai_feedback_stats
          WHERE (ai_feedback_stats.period = CURRENT_DATE)) AS today_accuracy,
    ( SELECT ai_feedback_stats.accuracy_score
           FROM public.ai_feedback_stats
          ORDER BY ai_feedback_stats.period DESC
         OFFSET 7
         LIMIT 1) AS week_ago_accuracy;


--
-- Name: ai_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_audit_logs (
    id integer NOT NULL,
    recommendation_id integer,
    event_type character varying(64) NOT NULL,
    event_data jsonb,
    user_id integer,
    session_id character varying(64),
    ip_address inet,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT ai_audit_logs_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['recommendation_generated'::character varying, 'recommendation_used'::character varying, 'feedback_submitted'::character varying, 'admin_override'::character varying, 'experiment_variant'::character varying, 'circuit_breaker'::character varying])::text[])))
);


--
-- Name: TABLE ai_audit_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_audit_logs IS 'Complete audit trail of AI system events for compliance and analysis';


--
-- Name: ai_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_audit_logs_id_seq OWNED BY public.ai_audit_logs.id;


--
-- Name: ai_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_cache (
    cache_key character varying(255) NOT NULL,
    scenario character varying(100) NOT NULL,
    request_hash character varying(64) NOT NULL,
    response_data jsonb NOT NULL,
    confidence_score integer,
    model_used character varying(100),
    prompt_version character varying(50),
    hit_count integer DEFAULT 0,
    last_accessed timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE ai_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_cache IS 'Persistent cache for AI responses to reduce redundant calls';


--
-- Name: ai_compatibility_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_compatibility_recommendations (
    id integer NOT NULL,
    base_component_id integer NOT NULL,
    base_component_category character varying(100) NOT NULL,
    base_component_tier character varying(50),
    recommended_component_id integer NOT NULL,
    recommended_component_category character varying(100) NOT NULL,
    recommended_component_tier character varying(50),
    compatibility_score numeric(5,2),
    ai_reasoning text,
    bottleneck_warning text,
    performance_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


--
-- Name: ai_compatibility_recommendations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_compatibility_recommendations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_compatibility_recommendations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_compatibility_recommendations_id_seq OWNED BY public.ai_compatibility_recommendations.id;


--
-- Name: ai_corrections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_corrections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_corrections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_corrections_id_seq OWNED BY public.ai_corrections.id;


--
-- Name: ai_experiment_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_experiment_variants (
    id integer NOT NULL,
    experiment_id character varying(128) NOT NULL,
    experiment_name character varying(255) NOT NULL,
    variant_id character varying(64) NOT NULL,
    variant_name character varying(255) NOT NULL,
    prompt_modifier jsonb NOT NULL,
    allocation_weight numeric(5,2) DEFAULT 50,
    impressions integer DEFAULT 0,
    conversions integer DEFAULT 0,
    avg_confidence numeric(5,2),
    avg_feedback_score numeric(3,2),
    start_date timestamp without time zone DEFAULT now() NOT NULL,
    end_date timestamp without time zone,
    is_active boolean DEFAULT true,
    is_winner boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE ai_experiment_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_experiment_variants IS 'A/B testing framework for AI prompt optimization';


--
-- Name: ai_experiment_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_experiment_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_experiment_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_experiment_variants_id_seq OWNED BY public.ai_experiment_variants.id;


--
-- Name: ai_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_feedback (
    id integer NOT NULL,
    recommendation_id integer,
    compatibility_log_id integer,
    accurate character varying(32) NOT NULL,
    category character varying(64) NOT NULL,
    specific_issues jsonb,
    corrected_recommendation text,
    admin_notes text,
    admin_id integer,
    reviewed_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT ai_feedback_accurate_check CHECK (((accurate)::text = ANY ((ARRAY['true'::character varying, 'partially'::character varying, 'false'::character varying])::text[]))),
    CONSTRAINT ai_feedback_category_check CHECK (((category)::text = ANY ((ARRAY['compatibility'::character varying, 'upgrade'::character varying, 'reference_build'::character varying, 'diagnostic'::character varying, 'cleaning'::character varying])::text[])))
);


--
-- Name: TABLE ai_feedback; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_feedback IS 'Admin reviews of AI recommendations for quality improvement';


--
-- Name: ai_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_feedback_id_seq OWNED BY public.ai_feedback.id;


--
-- Name: ai_feedback_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_feedback_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_feedback_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_feedback_stats_id_seq OWNED BY public.ai_feedback_stats.id;


--
-- Name: ai_learning_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_learning_patterns (
    id integer NOT NULL,
    pattern_type character varying(100) NOT NULL,
    pattern_data jsonb NOT NULL,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    last_used_at timestamp without time zone,
    confidence_score numeric(5,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE ai_learning_patterns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_learning_patterns IS 'Learned patterns from successful and failed AI suggestions';


--
-- Name: ai_learning_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_learning_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_learning_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_learning_patterns_id_seq OWNED BY public.ai_learning_patterns.id;


--
-- Name: ai_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_logs (
    id integer NOT NULL,
    user_id integer,
    endpoint character varying(100) NOT NULL,
    prompt text,
    response jsonb,
    execution_time_ms integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ai_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_logs_id_seq OWNED BY public.ai_logs.id;


--
-- Name: ai_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_metrics (
    id integer NOT NULL,
    metric_date date DEFAULT CURRENT_DATE NOT NULL,
    scenario character varying(64) NOT NULL,
    total_calls integer DEFAULT 0,
    successful_calls integer DEFAULT 0,
    failed_calls integer DEFAULT 0,
    fallback_usage integer DEFAULT 0,
    cache_hits integer DEFAULT 0,
    cache_misses integer DEFAULT 0,
    avg_latency integer,
    p50_latency integer,
    p95_latency integer,
    p99_latency integer,
    max_latency integer,
    avg_confidence numeric(5,2),
    feedback_count integer DEFAULT 0,
    positive_feedback integer DEFAULT 0,
    negative_feedback integer DEFAULT 0,
    circuit_breaker_opens integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE ai_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_metrics IS 'Daily aggregated AI system performance metrics';


--
-- Name: ai_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_metrics_id_seq OWNED BY public.ai_metrics.id;


--
-- Name: ai_pending_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_pending_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_pending_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_pending_reviews_id_seq OWNED BY public.ai_pending_reviews.id;


--
-- Name: ai_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_recommendations (
    id integer NOT NULL,
    scenario character varying(64) NOT NULL,
    request_hash character varying(64) NOT NULL,
    request_data jsonb NOT NULL,
    user_context jsonb,
    ai_response jsonb NOT NULL,
    confidence numeric(5,2),
    source character varying(32),
    latency_ms integer,
    model character varying(64),
    prompt_tokens integer,
    completion_tokens integer,
    user_accepted boolean,
    user_feedback text,
    admin_validated boolean,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    CONSTRAINT ai_recommendations_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (100)::numeric))),
    CONSTRAINT ai_recommendations_scenario_check CHECK (((scenario)::text = ANY ((ARRAY['compatibility'::character varying, 'upgrade'::character varying, 'reference_build'::character varying, 'diagnostic'::character varying, 'cleaning'::character varying, 'future_upgrade'::character varying])::text[]))),
    CONSTRAINT ai_recommendations_source_check CHECK (((source)::text = ANY ((ARRAY['ai'::character varying, 'cache'::character varying, 'fallback'::character varying])::text[])))
);


--
-- Name: TABLE ai_recommendations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_recommendations IS 'Stores all AI recommendations with performance and quality metrics';


--
-- Name: ai_recommendations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_recommendations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_recommendations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_recommendations_id_seq OWNED BY public.ai_recommendations.id;


--
-- Name: ai_training_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_training_data (
    id integer NOT NULL,
    prompt text NOT NULL,
    response text NOT NULL,
    context jsonb,
    feedback_score integer,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT ai_training_data_feedback_score_check CHECK (((feedback_score >= 1) AND (feedback_score <= 5)))
);


--
-- Name: ai_training_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_training_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_training_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_training_data_id_seq OWNED BY public.ai_training_data.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    user_id integer,
    key_hash character varying(255) NOT NULL,
    name character varying(100),
    permissions jsonb,
    last_used timestamp without time zone,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE api_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.api_keys IS 'API keys for external integrations';


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: assistance_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assistance_requests (
    id integer NOT NULL,
    kiosk_id character varying(50) DEFAULT 'KIOSK-001'::character varying NOT NULL,
    request_type character varying(50) DEFAULT 'assisted_service'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    acknowledged_at timestamp without time zone,
    completed_at timestamp without time zone,
    acknowledged_by integer,
    admin_name character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT assistance_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'acknowledged'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE assistance_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assistance_requests IS 'Tracks assistance requests from kiosk for real-time admin notifications';


--
-- Name: COLUMN assistance_requests.kiosk_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assistance_requests.kiosk_id IS 'Identifier of the kiosk making the request';


--
-- Name: COLUMN assistance_requests.request_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assistance_requests.request_type IS 'Type of assistance requested (e.g., assisted_service, help, technical_issue)';


--
-- Name: COLUMN assistance_requests.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assistance_requests.status IS 'Current status of the request (pending, acknowledged, completed, cancelled)';


--
-- Name: assistance_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assistance_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assistance_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assistance_requests_id_seq OWNED BY public.assistance_requests.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(255) NOT NULL,
    entity character varying(255) NOT NULL,
    entity_id integer,
    details jsonb,
    ip_address character varying(50),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    severity character varying(20) DEFAULT 'INFO'::character varying,
    table_name character varying(255),
    record_id integer,
    role character varying(50),
    status character varying(50),
    entity_type character varying(50),
    old_values jsonb,
    new_values jsonb,
    user_name character varying(255),
    user_role character varying(50),
    CONSTRAINT audit_logs_entity_id_check CHECK (((entity_id IS NULL) OR (entity_id > 0)))
);


--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.audit_logs IS 'Audit trail for all sensitive operations';


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bios_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bios_compatibility (
    id integer NOT NULL,
    motherboard_model character varying(200) NOT NULL,
    chipset character varying(50) NOT NULL,
    cpu_generation character varying(50) NOT NULL,
    min_bios_version character varying(50) NOT NULL,
    recommended_bios_version character varying(50),
    release_date date,
    update_notes text,
    critical_update boolean DEFAULT false,
    download_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bios_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bios_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bios_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bios_compatibility_id_seq OWNED BY public.bios_compatibility.id;


--
-- Name: build_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.build_history (
    id integer NOT NULL,
    user_id character varying(100),
    session_id character varying(255),
    build_name character varying(200) NOT NULL,
    build_data jsonb NOT NULL,
    compatibility_score integer,
    total_price numeric(10,2),
    total_wattage integer,
    bottleneck_percentage numeric(5,2),
    is_public boolean DEFAULT false,
    views_count integer DEFAULT 0,
    likes_count integer DEFAULT 0,
    tags text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    shared_at timestamp without time zone,
    last_accessed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT build_history_compatibility_score_check CHECK (((compatibility_score >= 0) AND (compatibility_score <= 100)))
);


--
-- Name: build_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.build_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: build_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.build_history_id_seq OWNED BY public.build_history.id;


--
-- Name: build_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.build_patterns (
    id integer NOT NULL,
    build_hash character varying(64) NOT NULL,
    build_type character varying(50) NOT NULL,
    cpu_id integer,
    gpu_id integer,
    motherboard_id integer,
    ram_id integer,
    storage_id integer,
    psu_id integer,
    case_id integer,
    cooling_id integer,
    components_json jsonb NOT NULL,
    build_count integer DEFAULT 1,
    avg_performance numeric(3,2),
    avg_stability numeric(3,2),
    avg_satisfaction numeric(3,2),
    first_seen timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_seen timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE build_patterns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.build_patterns IS 'Aggregated statistics for common build patterns';


--
-- Name: build_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.build_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: build_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.build_patterns_id_seq OWNED BY public.build_patterns.id;


--
-- Name: compatibility_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compatibility_cache (
    id integer NOT NULL,
    cache_key character varying(255) NOT NULL,
    build_parts jsonb NOT NULL,
    compatibility_result jsonb NOT NULL,
    score integer,
    issues_count integer DEFAULT 0,
    warnings_count integer DEFAULT 0,
    performance_tier character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    hit_count integer DEFAULT 0,
    last_hit_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT compatibility_cache_score_check CHECK (((score >= 0) AND (score <= 100)))
);


--
-- Name: cache_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cache_metrics AS
 SELECT count(*) AS total_entries,
    sum(hit_count) AS total_hits,
    avg(hit_count) AS avg_hits_per_entry,
    count(
        CASE
            WHEN (expires_at < CURRENT_TIMESTAMP) THEN 1
            ELSE NULL::integer
        END) AS expired_entries,
    count(
        CASE
            WHEN (hit_count = 0) THEN 1
            ELSE NULL::integer
        END) AS never_used_entries,
    round(avg((EXTRACT(epoch FROM (CURRENT_TIMESTAMP - (created_at)::timestamp with time zone)) / (3600)::numeric)), 2) AS avg_age_hours
   FROM public.compatibility_cache;


--
-- Name: case_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_compatibility (
    id integer NOT NULL,
    form_factor character varying(50) NOT NULL,
    max_gpu_length_mm integer,
    max_gpu_length_no_front_fan_mm integer,
    max_cpu_cooler_height_mm integer,
    max_psu_length_mm integer,
    motherboard_support jsonb NOT NULL,
    radiator_support jsonb,
    drive_bays jsonb,
    fan_mounts jsonb,
    clearance_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE case_compatibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.case_compatibility IS 'Case physical clearances and form factor support';


--
-- Name: case_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_compatibility_id_seq OWNED BY public.case_compatibility.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    icon character varying(255),
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: compatibility_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compatibility_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compatibility_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compatibility_cache_id_seq OWNED BY public.compatibility_cache.id;


--
-- Name: compatibility_issue_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compatibility_issue_templates (
    id integer NOT NULL,
    issue_code character varying(50) NOT NULL,
    issue_category character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    solution text NOT NULL,
    components_affected jsonb NOT NULL,
    keywords jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE compatibility_issue_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compatibility_issue_templates IS 'Standardized compatibility issue messages';


--
-- Name: compatibility_issue_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compatibility_issue_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compatibility_issue_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compatibility_issue_templates_id_seq OWNED BY public.compatibility_issue_templates.id;


--
-- Name: compatibility_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compatibility_logs (
    id integer NOT NULL,
    build_hash character varying(64) NOT NULL,
    parts_json jsonb NOT NULL,
    user_id integer,
    rules_verdict jsonb NOT NULL,
    ai_verdict jsonb,
    user_decision character varying(32),
    admin_override boolean DEFAULT false,
    admin_override_reason text,
    outcome_quality character varying(32),
    outcome_notes text,
    user_context jsonb,
    session_id character varying(64),
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT compatibility_logs_outcome_quality_check CHECK (((outcome_quality)::text = ANY ((ARRAY['success'::character varying, 'compatibility_issue'::character varying, 'user_returned'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT compatibility_logs_user_decision_check CHECK (((user_decision)::text = ANY ((ARRAY['accepted'::character varying, 'rejected'::character varying, 'modified'::character varying, 'pending'::character varying])::text[])))
);


--
-- Name: TABLE compatibility_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compatibility_logs IS 'Historical compatibility check outcomes for pattern mining and AI training';


--
-- Name: compatibility_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compatibility_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compatibility_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compatibility_logs_id_seq OWNED BY public.compatibility_logs.id;


--
-- Name: compatibility_matrix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compatibility_matrix (
    id integer NOT NULL,
    component_a_id integer NOT NULL,
    component_a_category character varying(50) NOT NULL,
    component_b_id integer NOT NULL,
    component_b_category character varying(50) NOT NULL,
    compatibility_score integer NOT NULL,
    is_compatible boolean NOT NULL,
    issues jsonb,
    warnings jsonb,
    last_computed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE compatibility_matrix; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compatibility_matrix IS 'Pre-computed compatibility scores for component pairs';


--
-- Name: compatibility_matrix_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compatibility_matrix_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compatibility_matrix_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compatibility_matrix_id_seq OWNED BY public.compatibility_matrix.id;


--
-- Name: compatibility_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compatibility_rules (
    id integer NOT NULL,
    rule_name character varying(200) NOT NULL,
    rule_category character varying(50) NOT NULL,
    component_a_category character varying(50) NOT NULL,
    component_b_category character varying(50),
    rule_type character varying(50) NOT NULL,
    rule_expression jsonb NOT NULL,
    severity character varying(20) DEFAULT 'error'::character varying NOT NULL,
    error_message text,
    warning_message text,
    solution_message text,
    enabled boolean DEFAULT true,
    priority integer DEFAULT 50,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    version integer DEFAULT 1,
    parent_rule_id integer,
    is_active boolean DEFAULT true,
    version_notes text,
    created_by integer,
    modified_by integer,
    CONSTRAINT rule_category_check CHECK (((rule_category)::text = ANY ((ARRAY['socket'::character varying, 'chipset'::character varying, 'memory'::character varying, 'power'::character varying, 'physical'::character varying, 'thermal'::character varying, 'bios'::character varying, 'pcie'::character varying, 'storage'::character varying, 'performance'::character varying, 'compatibility'::character varying])::text[]))),
    CONSTRAINT severity_check CHECK (((severity)::text = ANY ((ARRAY['error'::character varying, 'warning'::character varying, 'info'::character varying])::text[])))
);


--
-- Name: TABLE compatibility_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compatibility_rules IS 'Advanced compatibility rule system supporting 1000+ rules';


--
-- Name: COLUMN compatibility_rules.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compatibility_rules.version IS 'Current version number, auto-incremented on each change';


--
-- Name: COLUMN compatibility_rules.parent_rule_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compatibility_rules.parent_rule_id IS 'Original rule ID if this is a variant/fork';


--
-- Name: COLUMN compatibility_rules.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.compatibility_rules.is_active IS 'Whether this rule version is active (supports multiple versions)';


--
-- Name: compatibility_rules_confidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compatibility_rules_confidence (
    id integer NOT NULL,
    rule_name character varying(128) NOT NULL,
    rule_category character varying(64) NOT NULL,
    times_executed integer DEFAULT 0,
    times_correct integer DEFAULT 0,
    times_incorrect integer DEFAULT 0,
    false_positive_rate numeric(5,4),
    false_negative_rate numeric(5,4),
    base_confidence numeric(5,2) DEFAULT 100,
    adjusted_confidence numeric(5,2) DEFAULT 100,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE compatibility_rules_confidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.compatibility_rules_confidence IS 'Confidence tracking for deterministic compatibility rules';


--
-- Name: compatibility_rules_confidence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compatibility_rules_confidence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compatibility_rules_confidence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compatibility_rules_confidence_id_seq OWNED BY public.compatibility_rules_confidence.id;


--
-- Name: compatibility_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compatibility_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compatibility_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compatibility_rules_id_seq OWNED BY public.compatibility_rules.id;


--
-- Name: component_performance_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.component_performance_tiers (
    id integer NOT NULL,
    component_id integer,
    component_name character varying(255) NOT NULL,
    component_category character varying(50) NOT NULL,
    performance_tier character varying(20) NOT NULL,
    tier_score integer NOT NULL,
    price_range_min numeric(10,2),
    price_range_max numeric(10,2),
    performance_score integer,
    tdp_typical integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: component_performance_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.component_performance_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: component_performance_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.component_performance_tiers_id_seq OWNED BY public.component_performance_tiers.id;


--
-- Name: cooling; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cooling (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    max_rpm integer,
    max_noise numeric(5,2),
    height integer,
    water_cooled boolean,
    fanless boolean,
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    compatible_sockets jsonb DEFAULT '[]'::jsonb,
    cooler_type character varying(20),
    radiator_size character varying(20),
    supported_sockets character varying(300),
    width_mm integer,
    depth_mm integer,
    tdp_rating integer,
    fan_count integer DEFAULT 1,
    fan_size_mm integer,
    ram_clearance_mm integer DEFAULT 32,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT cooling_cooler_type_check CHECK (((cooler_type)::text = ANY ((ARRAY['Air'::character varying, 'AIO'::character varying, 'Custom Loop'::character varying])::text[]))),
    CONSTRAINT cooling_fan_count_check CHECK ((fan_count >= 0))
);


--
-- Name: TABLE cooling; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cooling IS 'Cooling specifications â€” child of pc_parts (Table-Per-Type). FK: cooling.id -> pc_parts.id';


--
-- Name: COLUMN cooling.compatible_sockets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cooling.compatible_sockets IS 'Array of compatible CPU sockets (e.g., ["AM4", "AM5", "LGA1700"])';


--
-- Name: COLUMN cooling.cooler_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cooling.cooler_type IS 'Air cooler, AIO liquid, or Custom Loop';


--
-- Name: COLUMN cooling.radiator_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cooling.radiator_size IS 'For AIO: 120mm, 240mm, 360mm, etc.';


--
-- Name: COLUMN cooling.supported_sockets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cooling.supported_sockets IS 'Comma-separated supported CPU sockets';


--
-- Name: COLUMN cooling.ram_clearance_mm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cooling.ram_clearance_mm IS 'Maximum RAM height that fits under cooler';


--
-- Name: cooling_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cooling_compatibility (
    id integer NOT NULL,
    cooler_type character varying(50) NOT NULL,
    cooler_height_mm integer,
    socket_support jsonb NOT NULL,
    tdp_rating integer NOT NULL,
    radiator_size character varying(20),
    fan_size character varying(20),
    requires_backplate boolean DEFAULT true,
    ram_clearance_mm integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE cooling_compatibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cooling_compatibility IS 'Cooling solution compatibility and clearances';


--
-- Name: cooling_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cooling_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cooling_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cooling_compatibility_id_seq OWNED BY public.cooling_compatibility.id;


--
-- Name: cooling_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cooling_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cooling_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cooling_id_seq OWNED BY public.cooling.id;


--
-- Name: cpu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cpu (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    launched date,
    socket character varying(50),
    series character varying(50),
    base_clock numeric(5,2),
    turbo_clock numeric(5,2),
    cores integer,
    threads integer,
    integrated_gpu boolean,
    max_ram integer,
    lithography integer,
    tdp integer,
    max_supported_ram integer,
    multithreading_supported boolean,
    overall_score numeric(5,2),
    benchmark_score numeric(10,2),
    single_thread_score numeric(10,2),
    multi_thread_score numeric(10,2),
    fps_ultra numeric(5,2),
    fps_high numeric(5,2),
    fps_medium numeric(5,2),
    fps_low numeric(5,2),
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    max_turbo_power integer,
    memory_type character varying(50) DEFAULT 'DDR4'::character varying,
    memory_channels integer DEFAULT 2,
    max_memory_speed integer,
    overclocking_support boolean DEFAULT false,
    hyperthreading boolean DEFAULT true,
    compatible_chipsets character varying(200),
    generation character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT cpu_memory_channels_check CHECK ((memory_channels = ANY (ARRAY[1, 2, 4, 8]))),
    CONSTRAINT cpu_memory_type_check CHECK (((memory_type)::text = ANY ((ARRAY['DDR3'::character varying, 'DDR4'::character varying, 'DDR5'::character varying])::text[])))
);


--
-- Name: TABLE cpu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cpu IS 'CPU specifications â€” child of pc_parts (Table-Per-Type). FK: cpu.id -> pc_parts.id';


--
-- Name: COLUMN cpu.memory_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cpu.memory_type IS 'Supported RAM type: DDR3, DDR4, DDR5';


--
-- Name: COLUMN cpu.memory_channels; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cpu.memory_channels IS 'Dual-channel (2), Quad-channel (4), etc.';


--
-- Name: COLUMN cpu.compatible_chipsets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cpu.compatible_chipsets IS 'Comma-separated compatible chipsets';


--
-- Name: cpu_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cpu_compatibility (
    id integer NOT NULL,
    cpu_socket character varying(50) NOT NULL,
    motherboard_chipset character varying(50) NOT NULL,
    motherboard_socket character varying(50) NOT NULL,
    generation character varying(50),
    requires_bios_update boolean DEFAULT false,
    min_bios_version character varying(50),
    max_tdp integer,
    vrm_requirement integer,
    compatible boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE cpu_compatibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cpu_compatibility IS 'CPU to motherboard compatibility rules';


--
-- Name: cpu_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cpu_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cpu_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cpu_compatibility_id_seq OWNED BY public.cpu_compatibility.id;


--
-- Name: cpu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cpu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cpu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cpu_id_seq OWNED BY public.cpu.id;


--
-- Name: known_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.known_issues (
    id integer NOT NULL,
    component1_id integer,
    component1_category character varying(50),
    component2_id integer,
    component2_category character varying(50),
    issue_title character varying(200) NOT NULL,
    issue_description text NOT NULL,
    severity character varying(20) DEFAULT 'minor'::character varying NOT NULL,
    workaround text,
    requires_bios_update boolean DEFAULT false,
    minimum_bios_version character varying(50),
    source character varying(100) DEFAULT 'user_report'::character varying,
    source_url text,
    reported_by integer,
    verified boolean DEFAULT false,
    verification_count integer DEFAULT 0,
    status character varying(20) DEFAULT 'open'::character varying,
    resolution text,
    resolved_by integer,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE known_issues; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.known_issues IS 'Documented compatibility issues between components';


--
-- Name: pc_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_parts (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(50),
    brand character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    stock integer NOT NULL,
    image_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    images text[],
    description text,
    total_value numeric(10,2) GENERATED ALWAYS AS ((price * (stock)::numeric)) STORED,
    original_filename character varying(255),
    file_path character varying(500),
    image_filename character varying(255),
    image_original_name character varying(255),
    image_path character varying(500),
    image_size integer,
    image_type character varying(50),
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer,
    specifications jsonb DEFAULT '{}'::jsonb,
    kiosk_visible boolean DEFAULT true,
    kiosk_featured boolean DEFAULT false,
    kiosk_category_order integer DEFAULT 0,
    kiosk_metadata jsonb DEFAULT '{}'::jsonb,
    on_sale boolean DEFAULT false,
    sale_price numeric(10,2) DEFAULT NULL::numeric,
    sale_start_date timestamp without time zone,
    sale_end_date timestamp without time zone,
    compatible_sockets jsonb DEFAULT '[]'::jsonb,
    performance_index numeric(5,2) DEFAULT 50.00,
    tier character varying(50) DEFAULT 'mid-range'::character varying,
    value_score numeric(5,2) DEFAULT 50.00,
    extended_metadata jsonb,
    category_id integer,
    dimensions jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT pc_parts_category_check CHECK (((category)::text = ANY ((ARRAY['CPU'::character varying, 'Motherboard'::character varying, 'GPU'::character varying, 'RAM'::character varying, 'Storage'::character varying, 'PSU'::character varying, 'Case'::character varying, 'Cooling'::character varying, 'Headphones'::character varying, 'Keyboard'::character varying, 'Mouse'::character varying, 'Speakers'::character varying, 'Webcam'::character varying, 'Monitor'::character varying, 'Pre-Built'::character varying])::text[]))),
    CONSTRAINT pc_parts_stock_check CHECK ((stock >= 0)),
    CONSTRAINT tier_classification_check CHECK (((tier IS NULL) OR ((tier)::text = ANY ((ARRAY['Starter'::character varying, 'Entry'::character varying, 'Mid Tier'::character varying, 'High Tier'::character varying, 'Elite'::character varying])::text[]))))
);


--
-- Name: TABLE pc_parts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_parts IS 'Master product catalog â€” parent table in Table-Per-Type pattern. Children: cpu, gpu, motherboard, ram, storage, psu, pc_case, cooling, monitor, webcam';


--
-- Name: COLUMN pc_parts.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.is_active IS 'Whether this product is active and available for sale';


--
-- Name: COLUMN pc_parts.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.description IS 'Detailed description of the product or build';


--
-- Name: COLUMN pc_parts.specifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.specifications IS 'JSONB field storing product specifications and build metadata. For Community Builds: {buildType, buildSource, approvalStatus, components, purposes, customizations, baseProductId, submittedAt}';


--
-- Name: COLUMN pc_parts.kiosk_visible; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.kiosk_visible IS 'Whether this product should appear in kiosk interface';


--
-- Name: COLUMN pc_parts.kiosk_featured; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.kiosk_featured IS 'Whether this product should appear in featured/hot picks sections';


--
-- Name: COLUMN pc_parts.kiosk_category_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.kiosk_category_order IS 'Display order of categories in kiosk (lower = first)';


--
-- Name: COLUMN pc_parts.on_sale; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.on_sale IS 'Whether this product is currently on sale';


--
-- Name: COLUMN pc_parts.sale_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.sale_price IS 'Discounted price when on sale (null = use regular price)';


--
-- Name: COLUMN pc_parts.sale_start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.sale_start_date IS 'When the sale starts (null = immediately)';


--
-- Name: COLUMN pc_parts.sale_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.sale_end_date IS 'When the sale ends (null = indefinite)';


--
-- Name: COLUMN pc_parts.compatible_sockets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.compatible_sockets IS 'Array of compatible CPU sockets for cooling/motherboard compatibility (e.g., ["AM4", "AM5", "LGA1700"])';


--
-- Name: COLUMN pc_parts.tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.tier IS 'Product/Build tier classification: Starter, Entry, Mid Tier, High Tier, Elite';


--
-- Name: COLUMN pc_parts.extended_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.extended_metadata IS 'Rich metadata for AI: VRM requirements, thermal characteristics, known issues, performance profiles, compatibility notes';


--
-- Name: COLUMN pc_parts.dimensions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_parts.dimensions IS 'Physical dimensions and clearance data for compatibility validation. Structure varies by category:
GPU: {length_mm, width_mm, height_mm, slots, tdp_watts, recommended_psu_watts}
Case: {max_gpu_length_mm, max_cooler_height_mm, form_factor, psu_form_factor}
Cooler: {height_mm, width_mm, depth_mm, ram_clearance_mm, socket_support[]}
PSU: {form_factor, length_mm, modular_type}
Motherboard: {form_factor, socket, ram_slots, max_ram_gb}';


--
-- Name: critical_known_issues; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.critical_known_issues AS
 SELECT ki.id,
    ki.issue_title,
    ki.issue_description,
    ki.severity,
    ki.workaround,
    p1.name AS component1_name,
    p1.category AS component1_category,
    p2.name AS component2_name,
    p2.category AS component2_category,
    ki.verification_count,
    ki.verified,
    ki.status
   FROM ((public.known_issues ki
     LEFT JOIN public.pc_parts p1 ON ((ki.component1_id = p1.id)))
     LEFT JOIN public.pc_parts p2 ON ((ki.component2_id = p2.id)))
  WHERE (((ki.severity)::text = ANY ((ARRAY['critical'::character varying, 'major'::character varying])::text[])) AND ((ki.status)::text = 'open'::text))
  ORDER BY
        CASE ki.severity
            WHEN 'critical'::text THEN 1
            WHEN 'major'::text THEN 2
            ELSE NULL::integer
        END, ki.verification_count DESC;


--
-- Name: deployment_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deployment_config (
    id integer NOT NULL,
    config_key character varying(255) NOT NULL,
    config_value text,
    config_type character varying(50) DEFAULT 'string'::character varying,
    description text,
    is_sensitive boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deployment_config_config_type_check CHECK (((config_type)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::text[])))
);


--
-- Name: deployment_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deployment_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deployment_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deployment_config_id_seq OWNED BY public.deployment_config.id;


--
-- Name: diagnostic_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnostic_issues (
    id integer NOT NULL,
    category character varying(100) NOT NULL,
    issue_name character varying(255) NOT NULL,
    description text,
    estimated_fix_time character varying(100),
    estimated_cost numeric(10,2),
    severity character varying(50) DEFAULT 'medium'::character varying,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 999,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE diagnostic_issues; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.diagnostic_issues IS 'Categories and types of issues that can be diagnosed during PC checkup services';


--
-- Name: COLUMN diagnostic_issues.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.diagnostic_issues.severity IS 'Issue severity level: low, medium, high, or critical';


--
-- Name: diagnostic_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.diagnostic_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: diagnostic_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.diagnostic_issues_id_seq OWNED BY public.diagnostic_issues.id;


--
-- Name: feedback_review_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_review_queue (
    id integer NOT NULL,
    feedback_id integer,
    priority character varying(20) DEFAULT 'normal'::character varying,
    assigned_to integer,
    flagged_reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone
);


--
-- Name: TABLE feedback_review_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feedback_review_queue IS 'Admin queue for reviewing user-submitted feedback';


--
-- Name: feedback_review_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_review_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_review_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_review_queue_id_seq OWNED BY public.feedback_review_queue.id;


--
-- Name: feedback_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_submissions (
    id integer NOT NULL,
    user_id integer,
    build_id integer,
    component_id integer,
    component_category character varying(50),
    issue_type character varying(50) NOT NULL,
    severity character varying(20) DEFAULT 'minor'::character varying NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    rating integer,
    build_context jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    admin_notes text,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_submissions_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: TABLE feedback_submissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feedback_submissions IS 'User-submitted feedback on components and builds';


--
-- Name: COLUMN feedback_submissions.build_context; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.feedback_submissions.build_context IS 'JSONB containing all component IDs in the build for pattern matching';


--
-- Name: feedback_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_submissions_id_seq OWNED BY public.feedback_submissions.id;


--
-- Name: feedback_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_votes (
    id integer NOT NULL,
    feedback_id integer,
    user_id integer,
    vote character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE feedback_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.feedback_votes IS 'Community votes on feedback helpfulness';


--
-- Name: feedback_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_votes_id_seq OWNED BY public.feedback_votes.id;


--
-- Name: gpu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gpu (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    launched date,
    memory_type character varying(50),
    memory_capacity integer,
    core_clock numeric(7,2),
    boost_clock numeric(7,2),
    effective_clock numeric(7,2),
    interface character varying(50),
    frame_sync character varying(50),
    length integer,
    tdp integer,
    pcie_8pin integer,
    ports_display integer,
    ports_hdmi integer,
    fans character varying(20),
    overall_score numeric(7,2),
    benchmark_score numeric(10,2),
    two_d_benchmark numeric(10,2),
    fps_ultra numeric(7,2),
    fps_high numeric(7,2),
    fps_medium numeric(7,2),
    fps_low numeric(7,2),
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    power_connectors character varying(50),
    brand character varying(20),
    multi_gpu_technology character varying(20),
    width_mm integer,
    height_mm integer,
    slot_width numeric(3,1) DEFAULT 2.0,
    pcie_6pin integer DEFAULT 0,
    pcie_12pin integer DEFAULT 0,
    recommended_psu_wattage integer,
    sli_support boolean DEFAULT false,
    crossfire_support boolean DEFAULT false,
    ports_displayport integer DEFAULT 0,
    ports_dvi integer DEFAULT 0,
    ports_vga integer DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT gpu_multi_gpu_technology_check CHECK (((multi_gpu_technology)::text = ANY ((ARRAY['SLI'::character varying, 'Crossfire'::character varying, 'None'::character varying])::text[]))),
    CONSTRAINT gpu_pcie_12pin_check CHECK ((pcie_12pin >= 0)),
    CONSTRAINT gpu_pcie_6pin_check CHECK ((pcie_6pin >= 0)),
    CONSTRAINT gpu_slot_width_check CHECK (((slot_width >= 1.0) AND (slot_width <= 4.0)))
);


--
-- Name: TABLE gpu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gpu IS 'GPU specifications â€” child of pc_parts (Table-Per-Type). FK: gpu.id -> pc_parts.id';


--
-- Name: COLUMN gpu.slot_width; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gpu.slot_width IS 'Number of PCIe slots occupied (1.0-4.0)';


--
-- Name: COLUMN gpu.recommended_psu_wattage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.gpu.recommended_psu_wattage IS 'Manufacturer recommended PSU wattage';


--
-- Name: gpu_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gpu_compatibility (
    id integer NOT NULL,
    gpu_length_mm integer NOT NULL,
    gpu_slots numeric(3,1) NOT NULL,
    gpu_power_connectors jsonb NOT NULL,
    min_psu_wattage integer NOT NULL,
    tdp integer NOT NULL,
    pcie_requirement character varying(20) NOT NULL,
    requires_12vhpwr boolean DEFAULT false,
    case_clearance_required integer,
    cooler_clearance_required integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE gpu_compatibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gpu_compatibility IS 'GPU physical and power requirements';


--
-- Name: gpu_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gpu_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gpu_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gpu_compatibility_id_seq OWNED BY public.gpu_compatibility.id;


--
-- Name: gpu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gpu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gpu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gpu_id_seq OWNED BY public.gpu.id;


--
-- Name: headphones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.headphones (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50),
    frequency character varying(50),
    microphone boolean,
    wireless boolean,
    enclosure character varying(50),
    color character varying(50),
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: headphones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.headphones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: headphones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.headphones_id_seq OWNED BY public.headphones.id;


--
-- Name: historical_builds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historical_builds (
    id integer NOT NULL,
    build_hash character varying(64) NOT NULL,
    build_name character varying(200),
    order_id integer,
    user_id integer,
    cpu_id integer,
    cpu_name character varying(255),
    gpu_id integer,
    gpu_name character varying(255),
    motherboard_id integer,
    ram_id integer,
    storage_id integer,
    psu_id integer,
    case_id integer,
    cooling_id integer,
    components_json jsonb NOT NULL,
    total_price numeric(10,2),
    build_type character varying(50),
    performance_tier character varying(50),
    fps_1080p_ultra integer,
    fps_1440p_ultra integer,
    fps_4k_ultra integer,
    bottleneck_type character varying(20),
    bottleneck_percentage numeric(5,2),
    compatibility_score numeric(3,2),
    user_rating integer,
    performance_rating integer,
    stability_rating integer,
    value_rating integer,
    use_case character varying(100),
    target_resolution character varying(20),
    target_framerate integer,
    build_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT historical_builds_performance_rating_check CHECK (((performance_rating >= 1) AND (performance_rating <= 5))),
    CONSTRAINT historical_builds_stability_rating_check CHECK (((stability_rating >= 1) AND (stability_rating <= 5))),
    CONSTRAINT historical_builds_user_rating_check CHECK (((user_rating >= 1) AND (user_rating <= 5))),
    CONSTRAINT historical_builds_value_rating_check CHECK (((value_rating >= 1) AND (value_rating <= 5)))
);


--
-- Name: historical_builds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historical_builds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historical_builds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historical_builds_id_seq OWNED BY public.historical_builds.id;


--
-- Name: historical_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historical_patterns (
    id integer NOT NULL,
    pattern_key character varying(128) NOT NULL,
    category character varying(64) NOT NULL,
    sub_category character varying(64),
    pattern_type character varying(64) NOT NULL,
    pattern_data jsonb NOT NULL,
    occurrence_count integer DEFAULT 1,
    success_rate numeric(5,2),
    confidence numeric(5,2),
    pattern_text text NOT NULL,
    pattern_summary character varying(255),
    first_observed_at timestamp without time zone DEFAULT now(),
    last_observed_at timestamp without time zone DEFAULT now(),
    last_updated_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    source character varying(64) DEFAULT 'automated_mining'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT historical_patterns_category_check CHECK (((category)::text = ANY ((ARRAY['gaming'::character varying, 'content_creation'::character varying, 'workstation'::character varying, 'general'::character varying, 'budget'::character varying, 'high_end'::character varying])::text[]))),
    CONSTRAINT historical_patterns_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (100)::numeric))),
    CONSTRAINT historical_patterns_pattern_type_check CHECK (((pattern_type)::text = ANY ((ARRAY['component_pairing'::character varying, 'budget_range'::character varying, 'use_case'::character varying, 'performance_tier'::character varying, 'compatibility_rule'::character varying])::text[]))),
    CONSTRAINT historical_patterns_success_rate_check CHECK (((success_rate >= (0)::numeric) AND (success_rate <= (100)::numeric)))
);


--
-- Name: TABLE historical_patterns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.historical_patterns IS 'Mined patterns from successful builds for AI enhancement';


--
-- Name: historical_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historical_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historical_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historical_patterns_id_seq OWNED BY public.historical_patterns.id;


--
-- Name: ip_access_control; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_access_control (
    id integer NOT NULL,
    ip_address character varying(100) NOT NULL,
    status public.ip_status_enum DEFAULT 'pending'::public.ip_status_enum NOT NULL,
    device_name character varying(255),
    device_fingerprint text,
    user_agent text,
    first_seen timestamp without time zone DEFAULT now() NOT NULL,
    last_seen timestamp without time zone DEFAULT now() NOT NULL,
    total_requests integer DEFAULT 0,
    failed_login_attempts integer DEFAULT 0,
    blocked_reason text,
    blocked_by integer,
    blocked_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ip_access_control; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ip_access_control IS 'Master IP access control list for network-level security';


--
-- Name: COLUMN ip_access_control.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_access_control.status IS 'allowed: Full access | blocked: Denied | pending: Limited access (login only)';


--
-- Name: COLUMN ip_access_control.device_fingerprint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_access_control.device_fingerprint IS 'Unique device identifier based on browser/OS/screen resolution';


--
-- Name: ip_access_control_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ip_access_control_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ip_access_control_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ip_access_control_id_seq OWNED BY public.ip_access_control.id;


--
-- Name: ip_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_logs (
    id integer NOT NULL,
    ip_address character varying(100) NOT NULL,
    ip_control_id integer,
    request_method character varying(10),
    request_path text,
    request_body text,
    response_status integer,
    user_agent text,
    device_fingerprint text,
    user_id integer,
    action_type character varying(50),
    success boolean DEFAULT true,
    blocked_reason text,
    geo_location jsonb,
    request_duration_ms integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ip_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ip_logs IS 'Detailed audit log of all IP-based access attempts and requests';


--
-- Name: COLUMN ip_logs.action_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ip_logs.action_type IS 'Type of action: access_granted, access_blocked, login_attempt, api_call, etc.';


--
-- Name: ip_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ip_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ip_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ip_logs_id_seq OWNED BY public.ip_logs.id;


--
-- Name: issue_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_verifications (
    id integer NOT NULL,
    issue_id integer,
    user_id integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE issue_verifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.issue_verifications IS 'User verifications of known issues';


--
-- Name: issue_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.issue_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: issue_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.issue_verifications_id_seq OWNED BY public.issue_verifications.id;


--
-- Name: keyboard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyboard (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    style character varying(50),
    switch_type character varying(50),
    backlit boolean,
    tenkeyless boolean,
    connection_type character varying(50),
    color character varying(50),
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    polling_rate character varying(20)
);


--
-- Name: keyboard_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.keyboard_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: keyboard_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.keyboard_id_seq OWNED BY public.keyboard.id;


--
-- Name: kiosk_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kiosk_sessions (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    tablet_id character varying(100),
    ip_address character varying(50),
    user_agent text,
    current_cart jsonb,
    cart_hash character varying(255),
    last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    order_lock_acquired boolean DEFAULT false,
    order_lock_at timestamp without time zone,
    expires_at timestamp without time zone DEFAULT (now() + '00:15:00'::interval),
    CONSTRAINT kiosk_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'ordering'::character varying, 'completed'::character varying, 'abandoned'::character varying])::text[])))
);


--
-- Name: TABLE kiosk_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kiosk_sessions IS 'Tracks kiosk tablet sessions to prevent duplicate orders';


--
-- Name: COLUMN kiosk_sessions.session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kiosk_sessions.session_id IS 'Unique session identifier generated per tablet';


--
-- Name: COLUMN kiosk_sessions.tablet_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kiosk_sessions.tablet_id IS 'Physical tablet identifier (e.g., MAC address, device ID)';


--
-- Name: COLUMN kiosk_sessions.cart_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kiosk_sessions.cart_hash IS 'MD5 hash of cart contents for deduplication';


--
-- Name: kiosk_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kiosk_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kiosk_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kiosk_sessions_id_seq OWNED BY public.kiosk_sessions.id;


--
-- Name: known_compatibility_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.known_compatibility_issues (
    id integer NOT NULL,
    affected_parts jsonb NOT NULL,
    issue_title character varying(200) NOT NULL,
    issue_description text NOT NULL,
    severity character varying(20) NOT NULL,
    workaround text,
    requires_bios_update boolean DEFAULT false,
    bios_version_required character varying(50),
    source character varying(100),
    source_url text,
    is_resolved boolean DEFAULT false,
    resolution_notes text,
    reported_count integer DEFAULT 1,
    last_reported_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE known_compatibility_issues; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.known_compatibility_issues IS 'Community-reported and manufacturer-documented issues';


--
-- Name: known_compatibility_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.known_compatibility_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: known_compatibility_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.known_compatibility_issues_id_seq OWNED BY public.known_compatibility_issues.id;


--
-- Name: known_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.known_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: known_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.known_issues_id_seq OWNED BY public.known_issues.id;


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id integer NOT NULL,
    product_id integer NOT NULL,
    price numeric(10,2) NOT NULL,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    source character varying(50) DEFAULT 'manual'::character varying,
    currency character varying(3) DEFAULT 'PHP'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    previous_price numeric(10,2),
    price_change numeric(10,2),
    price_change_percent numeric(5,2),
    created_by integer,
    CONSTRAINT previous_price_positive CHECK (((previous_price IS NULL) OR (previous_price >= (0)::numeric))),
    CONSTRAINT price_positive CHECK ((price >= (0)::numeric))
);


--
-- Name: latest_product_prices; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.latest_product_prices AS
 SELECT DISTINCT ON (p.id) p.id AS product_id,
    p.name AS product_name,
    p.category,
    p.price AS current_price,
    ph.price AS historical_price,
    ph.recorded_at AS price_date,
    round((((p.price - ph.price) / ph.price) * (100)::numeric), 2) AS price_change_percent,
    (p.price - ph.price) AS price_change_amount
   FROM (public.pc_parts p
     LEFT JOIN public.price_history ph ON ((p.id = ph.product_id)))
  ORDER BY p.id, ph.recorded_at DESC;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    from_user_id integer NOT NULL,
    to_user_id integer NOT NULL,
    content text NOT NULL,
    message_type character varying(50) DEFAULT 'text'::character varying,
    is_read boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp without time zone
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: ml_bottleneck_patterns; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ml_bottleneck_patterns AS
 SELECT cpu_id,
    gpu_id,
    cpu_name,
    gpu_name,
    bottleneck_type,
    avg(bottleneck_percentage) AS avg_bottleneck,
    avg(fps_1080p_ultra) AS avg_fps_1080p,
    avg(fps_1440p_ultra) AS avg_fps_1440p,
    avg(fps_4k_ultra) AS avg_fps_4k,
    avg(performance_rating) AS avg_performance_rating,
    count(*) AS build_count
   FROM public.historical_builds hb
  WHERE ((cpu_id IS NOT NULL) AND (gpu_id IS NOT NULL))
  GROUP BY cpu_id, gpu_id, cpu_name, gpu_name, bottleneck_type
  ORDER BY (count(*)) DESC, (avg(performance_rating)) DESC;


--
-- Name: ml_compatibility_success_rate; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ml_compatibility_success_rate AS
 SELECT outcome_quality,
    user_decision,
    count(*) AS occurrence_count,
    round((((count(*))::numeric * 100.0) / sum(count(*)) OVER ()), 2) AS percentage
   FROM public.compatibility_logs
  GROUP BY outcome_quality, user_decision
  ORDER BY (count(*)) DESC;


--
-- Name: ml_optimal_builds_by_budget; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ml_optimal_builds_by_budget AS
 SELECT build_type,
    performance_tier,
    (floor((total_price / (10000)::numeric)) * (10000)::numeric) AS price_bracket,
    avg(total_price) AS avg_price,
    avg(fps_1080p_ultra) AS avg_fps_1080p,
    avg(fps_1440p_ultra) AS avg_fps_1440p,
    avg(fps_4k_ultra) AS avg_fps_4k,
    avg(performance_rating) AS avg_performance_rating,
    avg(stability_rating) AS avg_stability_rating,
    avg(value_rating) AS avg_value_rating,
    count(*) AS build_count
   FROM public.historical_builds hb
  WHERE (total_price IS NOT NULL)
  GROUP BY build_type, performance_tier, (floor((total_price / (10000)::numeric)) * (10000)::numeric)
  ORDER BY (floor((total_price / (10000)::numeric)) * (10000)::numeric), (avg(performance_rating)) DESC;


--
-- Name: monitor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitor (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    screen_size character varying(50),
    resolution character varying(50),
    refresh_rate integer,
    response_time numeric(5,2),
    panel_type character varying(50),
    aspect_ratio character varying(50),
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    curved boolean DEFAULT false,
    vesa_mount character varying(20),
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE monitor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.monitor IS 'Monitor specifications â€” child of pc_parts (Table-Per-Type). FK: monitor.id -> pc_parts.id';


--
-- Name: monitor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monitor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monitor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monitor_id_seq OWNED BY public.monitor.id;


--
-- Name: monitors; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.monitors AS
 SELECT id,
    part_id,
    name,
    screen_size,
    resolution,
    refresh_rate,
    response_time,
    panel_type,
    aspect_ratio,
    brightness,
    contrast_ratio,
    color_gamut,
    ports,
    vesa_mount,
    curved,
    created_at,
    updated_at
   FROM public._deprecated_monitors;


--
-- Name: monitors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monitors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monitors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monitors_id_seq OWNED BY public.monitor.id;


--
-- Name: monitors_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monitors_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monitors_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monitors_id_seq1 OWNED BY public._deprecated_monitors.id;


--
-- Name: motherboard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motherboard (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    socket character varying(50),
    chipset character varying(50),
    memory_type character varying(50),
    max_ram integer,
    ram_slots integer,
    m2_slots integer,
    ethernet_ports integer,
    wireless_networking boolean,
    integrated_gpu_support boolean,
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    form_factor character varying(20),
    pcie_slots integer DEFAULT 2,
    pcie_x16_slots integer DEFAULT 1,
    multi_gpu_support boolean DEFAULT false,
    sata_ports integer DEFAULT 4,
    power_connector_pins integer DEFAULT 8,
    pcie_x8_slots integer DEFAULT 0,
    pcie_x4_slots integer DEFAULT 0,
    pcie_x1_slots integer DEFAULT 0,
    m2_sata_support boolean DEFAULT true,
    m2_nvme_support boolean DEFAULT true,
    atx_power_pin integer DEFAULT 24,
    eps_power_pin integer DEFAULT 8,
    additional_power_connectors character varying(100),
    sli_support boolean DEFAULT false,
    crossfire_support boolean DEFAULT false,
    length_mm integer,
    width_mm integer,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT motherboard_atx_power_pin_check CHECK ((atx_power_pin = ANY (ARRAY[20, 24]))),
    CONSTRAINT motherboard_eps_power_pin_check CHECK ((eps_power_pin = ANY (ARRAY[4, 8]))),
    CONSTRAINT motherboard_form_factor_check CHECK (((form_factor)::text = ANY ((ARRAY['ATX'::character varying, 'Micro-ATX'::character varying, 'Mini-ITX'::character varying, 'EATX'::character varying])::text[]))),
    CONSTRAINT motherboard_pcie_x1_slots_check CHECK ((pcie_x1_slots >= 0)),
    CONSTRAINT motherboard_pcie_x4_slots_check CHECK ((pcie_x4_slots >= 0)),
    CONSTRAINT motherboard_pcie_x8_slots_check CHECK ((pcie_x8_slots >= 0)),
    CONSTRAINT motherboard_power_connector_pins_check CHECK ((power_connector_pins = ANY (ARRAY[4, 8, 12])))
);


--
-- Name: TABLE motherboard; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.motherboard IS 'Motherboard specifications â€” child of pc_parts (Table-Per-Type). FK: motherboard.id -> pc_parts.id';


--
-- Name: COLUMN motherboard.form_factor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.motherboard.form_factor IS 'Motherboard form factor: ATX, Micro-ATX, Mini-ITX, E-ATX';


--
-- Name: COLUMN motherboard.pcie_slots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.motherboard.pcie_slots IS 'Number of PCIe x16 slots for GPU installation';


--
-- Name: COLUMN motherboard.pcie_x16_slots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.motherboard.pcie_x16_slots IS 'Number of PCIe x16 slots for GPU installation';


--
-- Name: COLUMN motherboard.sata_ports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.motherboard.sata_ports IS 'Number of SATA ports for storage devices';


--
-- Name: COLUMN motherboard.eps_power_pin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.motherboard.eps_power_pin IS 'CPU power connector: 4-pin or 8-pin EPS';


--
-- Name: motherboard_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.motherboard_compatibility (
    id integer NOT NULL,
    form_factor character varying(50) NOT NULL,
    socket character varying(50) NOT NULL,
    chipset character varying(50) NOT NULL,
    memory_type character varying(20) NOT NULL,
    max_memory_speed integer,
    pcie_gen character varying(10),
    m2_slots integer,
    sata_ports integer,
    usb_headers jsonb,
    features jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE motherboard_compatibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.motherboard_compatibility IS 'Motherboard specifications for compatibility checking';


--
-- Name: motherboard_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.motherboard_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: motherboard_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.motherboard_compatibility_id_seq OWNED BY public.motherboard_compatibility.id;


--
-- Name: motherboard_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.motherboard_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: motherboard_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.motherboard_id_seq OWNED BY public.motherboard.id;


--
-- Name: mouse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mouse (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    tracking_method character varying(50),
    connection_type character varying(50),
    dpi integer,
    hand_orientation character varying(50),
    color character varying(50),
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    programmable_buttons character varying(20),
    polling_rate character varying(20)
);


--
-- Name: mouse_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mouse_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mouse_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mouse_id_seq OWNED BY public.mouse.id;


--
-- Name: notification_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_queue (
    id integer NOT NULL,
    user_id integer,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb,
    read_at timestamp with time zone,
    expires_at timestamp with time zone,
    priority integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_queue_id_seq OWNED BY public.notification_queue.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    is_read boolean DEFAULT false,
    action_url character varying(500),
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    CONSTRAINT valid_notification_type CHECK (((type)::text = ANY ((ARRAY['order'::character varying, 'user'::character varying, 'stock'::character varying, 'system'::character varying, 'payment'::character varying, 'inventory'::character varying, 'alert'::character varying, 'maintenance'::character varying, 'security'::character varying, 'message'::character varying])::text[])))
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: order_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_counters (
    id integer NOT NULL,
    counter_type character varying(20) NOT NULL,
    counter_period character varying(10) NOT NULL,
    current_value integer DEFAULT 0,
    reset_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE order_counters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_counters IS 'Tracks counters for order ID and transaction ID generation with automatic reset';


--
-- Name: order_counters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_counters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_counters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_counters_id_seq OWNED BY public.order_counters.id;


--
-- Name: order_deduplication_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_deduplication_log (
    id integer NOT NULL,
    session_id character varying(64),
    cart_hash character varying(64) NOT NULL,
    payment_method character varying(50),
    total_amount numeric(10,2),
    blocked boolean DEFAULT false,
    block_reason text,
    created_order_id integer,
    attempt_timestamp timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE order_deduplication_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_deduplication_log IS 'Logs all order attempts to detect and prevent duplicates';


--
-- Name: COLUMN order_deduplication_log.cart_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_deduplication_log.cart_hash IS 'MD5 hash of cart (items + amounts) for duplicate detection';


--
-- Name: COLUMN order_deduplication_log.blocked; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_deduplication_log.blocked IS 'TRUE if order attempt was blocked as duplicate';


--
-- Name: COLUMN order_deduplication_log.created_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_deduplication_log.created_order_id IS 'Reference to successfully created order (if any)';


--
-- Name: order_deduplication_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_deduplication_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_deduplication_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_deduplication_log_id_seq OWNED BY public.order_deduplication_log.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    stock_item_id integer,
    component_name character varying(255) NOT NULL,
    item_name character varying(255) NOT NULL,
    price numeric(15,2) NOT NULL,
    quantity integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    CONSTRAINT order_items_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: COLUMN order_items.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_items.description IS 'Stores assessment details, PC re-case requests, diagnostic issues, and other order item metadata';


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_locks (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    cart_hash character varying(255) NOT NULL,
    payment_method character varying(100),
    total_amount numeric(15,2),
    order_id integer,
    locked_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    status character varying(50) DEFAULT 'locked'::character varying,
    CONSTRAINT order_locks_status_check CHECK (((status)::text = ANY ((ARRAY['locked'::character varying, 'completed'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: order_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_locks_id_seq OWNED BY public.order_locks.id;


--
-- Name: order_number_sequence; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_number_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SEQUENCE order_number_sequence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON SEQUENCE public.order_number_sequence IS 'Ensures unique order numbers with timestamp+sequence format';


--
-- Name: order_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_queue (
    id integer NOT NULL,
    order_id integer,
    queue_number integer NOT NULL,
    queue_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(50) DEFAULT 'waiting'::character varying NOT NULL,
    priority integer DEFAULT 0,
    assigned_to integer,
    estimated_completion timestamp with time zone,
    actual_completion timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_queue_status_check CHECK (((status)::text = ANY ((ARRAY['waiting'::character varying, 'in-progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: order_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_queue_id_seq OWNED BY public.order_queue.id;


--
-- Name: orders_backup_no_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders_backup_no_items (
    id integer,
    order_number character varying(50),
    customer_name character varying(255),
    customer_email character varying(255),
    customer_phone character varying(50),
    status character varying(50),
    total_amount numeric(15,2),
    payment_method character varying(50),
    payment_status character varying(50),
    notes text,
    created_by integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    total numeric(10,2),
    priority character varying(20),
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancelled_by integer,
    cancellation_reason text,
    assisted_by integer,
    queue_number integer,
    order_id_formatted character varying(20),
    transaction_id_formatted character varying(20),
    queue_status character varying(20),
    queue_assigned_at timestamp with time zone,
    queue_completed_at timestamp with time zone,
    service_type character varying(50),
    ai_assisted boolean,
    virtual_build_id integer,
    session_id character varying(255),
    tablet_id character varying(100),
    duplicate_check_hash character varying(255),
    service_fee numeric(10,2),
    labor_charges numeric(10,2),
    other_charges numeric(10,2),
    service_notes text,
    underlying_issues text,
    cleaning_assessment jsonb,
    manual_processing boolean,
    manual_processing_notes text,
    assessment_data jsonb
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: package; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    cpu_id integer,
    motherboard_id integer,
    gpu_id integer,
    ram_id integer,
    storage_id integer,
    psu_id integer,
    case_id integer,
    cooling_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: packages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.packages_id_seq OWNED BY public.package.id;


--
-- Name: password_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_history (
    id integer NOT NULL,
    user_id integer,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE password_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.password_history IS 'Password history to prevent reuse';


--
-- Name: password_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_history_id_seq OWNED BY public.password_history.id;


--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_resets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    code_hash character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    resend_count integer DEFAULT 0 NOT NULL,
    reset_session_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    last_sent_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT password_resets_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'used'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: TABLE password_resets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.password_resets IS 'Password reset tokens with enhanced security features';


--
-- Name: COLUMN password_resets.code_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.password_resets.code_hash IS 'HMAC-SHA256 hash of the reset code';


--
-- Name: COLUMN password_resets.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.password_resets.status IS 'Current status: pending, verified, used, expired';


--
-- Name: COLUMN password_resets.attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.password_resets.attempts IS 'Number of failed verification attempts';


--
-- Name: COLUMN password_resets.resend_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.password_resets.resend_count IS 'Number of times this reset was resent';


--
-- Name: COLUMN password_resets.reset_session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.password_resets.reset_session_id IS 'Unique session ID for reset process';


--
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_resets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- Name: payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment (
    payment_id integer NOT NULL,
    order_id integer,
    payment_method character varying(50) NOT NULL,
    payment_status character varying(20) NOT NULL,
    CONSTRAINT payments_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['Pending'::character varying, 'Completed'::character varying, 'Failed'::character varying])::text[])))
);


--
-- Name: payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_payment_id_seq OWNED BY public.payment.payment_id;


--
-- Name: pc_case; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_case (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50),
    color character varying(50),
    fans_included integer,
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    case_category character varying(50),
    max_gpu_length character varying(20),
    max_cpu_cooler_height character varying(20),
    motherboard_support character varying(100),
    tempered_glass boolean DEFAULT false,
    form_factor character varying(50),
    max_gpu_length_mm integer,
    max_cooler_height_mm integer,
    max_psu_length_mm integer,
    drive_bays_2_5 integer DEFAULT 2,
    drive_bays_3_5 integer DEFAULT 2,
    form_factor_support character varying(200) DEFAULT 'ATX,Micro-ATX,Mini-ITX'::character varying,
    max_cpu_cooler_height_mm integer DEFAULT 160,
    front_fan_support character varying(100),
    top_fan_support character varying(100),
    rear_fan_support character varying(100),
    radiator_support character varying(200),
    length_mm integer,
    width_mm integer,
    height_mm integer,
    psu_position character varying(50) DEFAULT 'Bottom'::character varying,
    cable_management_space_mm integer DEFAULT 20,
    psu_form_factor_support character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT pc_case_psu_position_check CHECK (((psu_position)::text = ANY ((ARRAY['Top'::character varying, 'Bottom'::character varying, 'Side'::character varying])::text[])))
);


--
-- Name: TABLE pc_case; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_case IS 'Case specifications â€” child of pc_parts (Table-Per-Type). FK: pc_case.id -> pc_parts.id';


--
-- Name: COLUMN pc_case.max_gpu_length_mm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_case.max_gpu_length_mm IS 'Maximum GPU card length in mm';


--
-- Name: COLUMN pc_case.max_psu_length_mm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_case.max_psu_length_mm IS 'Maximum PSU length in mm';


--
-- Name: COLUMN pc_case.form_factor_support; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_case.form_factor_support IS 'Comma-separated supported motherboard sizes';


--
-- Name: COLUMN pc_case.max_cpu_cooler_height_mm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_case.max_cpu_cooler_height_mm IS 'Maximum CPU cooler height in mm';


--
-- Name: COLUMN pc_case.psu_form_factor_support; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_case.psu_form_factor_support IS 'Supported PSU form factors: ATX, SFX, TFX, etc.';


--
-- Name: pc_case_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_case_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_case_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_case_id_seq OWNED BY public.pc_case.id;


--
-- Name: pc_customized_ai_builds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_customized_ai_builds (
    id integer NOT NULL,
    usage character varying(50) NOT NULL,
    budget_tier character varying(20) NOT NULL,
    budget_label character varying(50) NOT NULL,
    budget_range character varying(100),
    components jsonb NOT NULL,
    total_budget numeric(12,2) NOT NULL,
    generated_date timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: TABLE pc_customized_ai_builds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_customized_ai_builds IS 'Automated AI-generated reference PC builds, updated monthly';


--
-- Name: pc_customized_ai_builds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_customized_ai_builds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_customized_ai_builds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_customized_ai_builds_id_seq OWNED BY public.pc_customized_ai_builds.id;


--
-- Name: pc_customized_ai_builds_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_customized_ai_builds_metadata (
    id integer NOT NULL,
    total_builds integer DEFAULT 0,
    generated_by integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    generated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: pc_customized_ai_builds_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_customized_ai_builds_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_customized_ai_builds_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_customized_ai_builds_metadata_id_seq OWNED BY public.pc_customized_ai_builds_metadata.id;


--
-- Name: pc_customized_ai_reference_builds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_customized_ai_reference_builds (
    id integer NOT NULL,
    build_key character varying(200) NOT NULL,
    usage_type character varying(50) NOT NULL,
    budget_range character varying(50) NOT NULL,
    performance_preference character varying(50) NOT NULL,
    gaming_preference character varying(50),
    target_budget numeric(10,2) NOT NULL,
    cpu_id integer,
    gpu_id integer,
    motherboard_id integer,
    ram_id integer,
    storage_id integer,
    psu_id integer,
    case_id integer,
    cooling_id integer,
    total_price numeric(10,2),
    ai_reasoning text,
    compatibility_score numeric(3,2),
    performance_score numeric(3,2),
    value_score numeric(3,2),
    is_active boolean DEFAULT true,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    generated_by character varying(50) DEFAULT 'system'::character varying,
    last_validated_at timestamp without time zone,
    validation_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE pc_customized_ai_reference_builds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_customized_ai_reference_builds IS 'Reference builds for PC Customized with AI feature - separate from PC Upgrade builds';


--
-- Name: pc_customized_ai_reference_builds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_customized_ai_reference_builds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_customized_ai_reference_builds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_customized_ai_reference_builds_id_seq OWNED BY public.pc_customized_ai_reference_builds.id;


--
-- Name: pc_customized_budget_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_customized_budget_ranges (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    min_budget numeric(10,2) NOT NULL,
    max_budget numeric(10,2),
    representative_budget numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE pc_customized_budget_ranges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_customized_budget_ranges IS 'Budget ranges for PC Customized AI';


--
-- Name: pc_customized_budget_ranges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_customized_budget_ranges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_customized_budget_ranges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_customized_budget_ranges_id_seq OWNED BY public.pc_customized_budget_ranges.id;


--
-- Name: pc_customized_gaming_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_customized_gaming_preferences (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    gpu_priority_weight numeric(3,2) NOT NULL,
    cpu_priority_weight numeric(3,2) NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE pc_customized_gaming_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_customized_gaming_preferences IS 'Gaming-specific preferences (Competitive FPS, AAA, Casual, Streaming)';


--
-- Name: pc_customized_gaming_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_customized_gaming_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_customized_gaming_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_customized_gaming_preferences_id_seq OWNED BY public.pc_customized_gaming_preferences.id;


--
-- Name: pc_customized_performance_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_customized_performance_preferences (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    performance_weight numeric(3,2) NOT NULL,
    budget_weight numeric(3,2) NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE pc_customized_performance_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_customized_performance_preferences IS 'Performance preferences (Balanced, Performance, Budget)';


--
-- Name: pc_customized_performance_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_customized_performance_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_customized_performance_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_customized_performance_preferences_id_seq OWNED BY public.pc_customized_performance_preferences.id;


--
-- Name: pc_customized_usage_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_customized_usage_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE pc_customized_usage_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_customized_usage_types IS 'Usage types for PC Customized AI (Gaming, Work, Content Creation, etc.)';


--
-- Name: pc_customized_usage_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_customized_usage_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_customized_usage_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_customized_usage_types_id_seq OWNED BY public.pc_customized_usage_types.id;


--
-- Name: pc_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_parts_id_seq OWNED BY public.pc_parts.id;


--
-- Name: pc_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_services (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    tier_level character varying(50),
    price numeric(10,2) NOT NULL,
    description text,
    inclusions jsonb,
    completion_time character varying(100),
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    display_order integer DEFAULT 999,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE pc_services; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_services IS 'Services offered by K-Wise including cleaning, checkup, and upgrade services';


--
-- Name: COLUMN pc_services.tier_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_services.tier_level IS 'Service tier: basic, pro, or premium';


--
-- Name: COLUMN pc_services.inclusions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pc_services.inclusions IS 'JSON array of service inclusions and features';


--
-- Name: pc_services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_services_id_seq OWNED BY public.pc_services.id;


--
-- Name: pc_upgrade_budget_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_upgrade_budget_ranges (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    min_budget integer NOT NULL,
    max_budget integer NOT NULL,
    representative_budget integer NOT NULL,
    icon character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT budget_range_valid CHECK ((min_budget < max_budget)),
    CONSTRAINT representative_budget_valid CHECK (((representative_budget >= min_budget) AND (representative_budget <= max_budget)))
);


--
-- Name: TABLE pc_upgrade_budget_ranges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_upgrade_budget_ranges IS 'Stores budget range parameters - expandable for higher budgets (e.g., 100k+)';


--
-- Name: pc_upgrade_budget_ranges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_upgrade_budget_ranges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_upgrade_budget_ranges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_upgrade_budget_ranges_id_seq OWNED BY public.pc_upgrade_budget_ranges.id;


--
-- Name: pc_upgrade_new_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_upgrade_new_products (
    id integer NOT NULL,
    product_id integer NOT NULL,
    category character varying(100) NOT NULL,
    detected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    included_in_build_at timestamp without time zone,
    status character varying(50) DEFAULT 'pending'::character varying
);


--
-- Name: TABLE pc_upgrade_new_products; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_upgrade_new_products IS 'Tracks products added after last reference build generation';


--
-- Name: pc_upgrade_new_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_upgrade_new_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_upgrade_new_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_upgrade_new_products_id_seq OWNED BY public.pc_upgrade_new_products.id;


--
-- Name: pc_upgrade_reference_builds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_upgrade_reference_builds (
    id integer NOT NULL,
    usage_type character varying(100) NOT NULL,
    age_range character varying(100) NOT NULL,
    budget_range character varying(100) NOT NULL,
    components jsonb NOT NULL,
    total_price numeric(12,2),
    performance_score integer,
    compatibility_verified boolean DEFAULT false,
    ai_generated boolean DEFAULT true,
    generation_metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE pc_upgrade_reference_builds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_upgrade_reference_builds IS 'Reference builds for PC upgrade recommendations';


--
-- Name: pc_upgrade_reference_builds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_upgrade_reference_builds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_upgrade_reference_builds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_upgrade_reference_builds_id_seq OWNED BY public.pc_upgrade_reference_builds.id;


--
-- Name: pc_upgrade_reference_builds_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_upgrade_reference_builds_metadata (
    id integer NOT NULL,
    total_builds integer NOT NULL,
    total_usage_types integer NOT NULL,
    total_year_ranges integer NOT NULL,
    total_budget_ranges integer NOT NULL,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    generated_by integer,
    file_path character varying(500),
    status character varying(50) DEFAULT 'active'::character varying,
    notes text
);


--
-- Name: TABLE pc_upgrade_reference_builds_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_upgrade_reference_builds_metadata IS 'Tracks reference builds generation history and status';


--
-- Name: pc_upgrade_reference_builds_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_upgrade_reference_builds_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_upgrade_reference_builds_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_upgrade_reference_builds_metadata_id_seq OWNED BY public.pc_upgrade_reference_builds_metadata.id;


--
-- Name: pc_upgrade_usage_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_upgrade_usage_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    icon character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE pc_upgrade_usage_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_upgrade_usage_types IS 'Stores PC usage type parameters (Gaming, Office, etc.) - dynamically loaded in frontend';


--
-- Name: pc_upgrade_usage_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_upgrade_usage_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_upgrade_usage_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_upgrade_usage_types_id_seq OWNED BY public.pc_upgrade_usage_types.id;


--
-- Name: pc_upgrade_year_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pc_upgrade_year_ranges (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    start_year integer NOT NULL,
    end_year integer NOT NULL,
    representative_year integer NOT NULL,
    category character varying(50),
    icon character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT representative_year_valid CHECK (((representative_year >= start_year) AND (representative_year <= end_year))),
    CONSTRAINT year_range_valid CHECK ((start_year <= end_year))
);


--
-- Name: TABLE pc_upgrade_year_ranges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pc_upgrade_year_ranges IS 'Stores year range parameters for PC age estimation - updates as years pass';


--
-- Name: pc_upgrade_year_ranges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pc_upgrade_year_ranges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pc_upgrade_year_ranges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pc_upgrade_year_ranges_id_seq OWNED BY public.pc_upgrade_year_ranges.id;


--
-- Name: pending_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_orders (
    id integer NOT NULL,
    order_hash character varying(32) NOT NULL,
    order_data jsonb NOT NULL,
    order_id integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone DEFAULT (now() + '00:05:00'::interval),
    completed_at timestamp without time zone,
    CONSTRAINT pending_orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: TABLE pending_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pending_orders IS 'Tracks pending orders to prevent duplicates during concurrent order creation';


--
-- Name: COLUMN pending_orders.order_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pending_orders.order_hash IS 'MD5 hash of order details (customer + items + total) used for deduplication';


--
-- Name: COLUMN pending_orders.order_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pending_orders.order_data IS 'Full order data JSON for reference and debugging';


--
-- Name: COLUMN pending_orders.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pending_orders.expires_at IS 'Expiration time - pending orders older than this are auto-cleaned';


--
-- Name: pending_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pending_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pending_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pending_orders_id_seq OWNED BY public.pending_orders.id;


--
-- Name: performancestats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performancestats (
    stat_id integer NOT NULL,
    product_id integer,
    benchmark_score numeric(5,2),
    single_thread_score numeric(5,2),
    multi_thread_score numeric(5,2),
    fps_ultra numeric(5,2),
    fps_high numeric(5,2),
    fps_medium numeric(5,2),
    fps_low numeric(5,2)
);


--
-- Name: performancestats_stat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.performancestats_stat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: performancestats_stat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.performancestats_stat_id_seq OWNED BY public.performancestats.stat_id;


--
-- Name: popular_builds; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.popular_builds AS
 SELECT id,
    build_name,
    total_price,
    compatibility_score,
    views_count,
    likes_count,
    tags,
    created_at,
    shared_at
   FROM public.build_history
  WHERE (is_public = true)
  ORDER BY views_count DESC, likes_count DESC, created_at DESC;


--
-- Name: pre_built_pc_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pre_built_pc_history (
    id integer NOT NULL,
    pre_built_pc_id integer NOT NULL,
    snapshot_data jsonb NOT NULL,
    action character varying(50) NOT NULL,
    action_by integer,
    action_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    CONSTRAINT pre_built_pc_history_action_check CHECK (((action)::text = ANY ((ARRAY['created'::character varying, 'updated'::character varying, 'deleted'::character varying, 'recycled'::character varying])::text[])))
);


--
-- Name: pre_built_pc_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pre_built_pc_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pre_built_pc_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pre_built_pc_history_id_seq OWNED BY public.pre_built_pc_history.id;


--
-- Name: prebuilt_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prebuilt_components (
    id integer NOT NULL,
    prebuilt_pc_id integer NOT NULL,
    pc_part_id integer,
    quantity integer DEFAULT 1,
    component_role character varying(100),
    is_optional boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE prebuilt_components; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prebuilt_components IS 'Junction table linking pre-built PCs to their component parts';


--
-- Name: COLUMN prebuilt_components.component_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prebuilt_components.component_role IS 'Role of component in PC build (cpu, gpu, ram, etc.)';


--
-- Name: prebuilt_components_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prebuilt_components_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prebuilt_components_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prebuilt_components_id_seq OWNED BY public.prebuilt_components.id;


--
-- Name: prebuilt_pcs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prebuilt_pcs (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100),
    total_price numeric(10,2) NOT NULL,
    markup_percentage numeric(5,2) DEFAULT 15.00,
    description text,
    image_url character varying(500),
    is_featured boolean DEFAULT false,
    is_available boolean DEFAULT true,
    stock_quantity integer DEFAULT 1,
    build_time_hours integer DEFAULT 24,
    warranty_months integer DEFAULT 12,
    display_order integer DEFAULT 999,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    purposes text[],
    addons jsonb,
    build_source character varying(50) DEFAULT 'preset'::character varying,
    tier character varying(50),
    CONSTRAINT prebuilt_pcs_build_source_check CHECK (((build_source)::text = ANY ((ARRAY['preset'::character varying, 'community'::character varying])::text[])))
);


--
-- Name: TABLE prebuilt_pcs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prebuilt_pcs IS 'Pre-configured PC builds available for purchase';


--
-- Name: COLUMN prebuilt_pcs.purposes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prebuilt_pcs.purposes IS 'Array of purposes: Gaming, Work, Multimedia';


--
-- Name: COLUMN prebuilt_pcs.build_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prebuilt_pcs.build_source IS 'Source of the build: preset (expert-crafted) or community (user-shared)';


--
-- Name: COLUMN prebuilt_pcs.tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prebuilt_pcs.tier IS 'Price tier: Starter, Mid Tier, High Tier, Elite (based on total_price)';


--
-- Name: prebuilt_pcs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prebuilt_pcs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prebuilt_pcs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prebuilt_pcs_id_seq OWNED BY public.prebuilt_pcs.id;


--
-- Name: price_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_alerts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    target_price numeric(10,2) NOT NULL,
    condition character varying(20) DEFAULT 'less_than'::character varying,
    percentage_drop numeric(5,2),
    is_active boolean DEFAULT true,
    triggered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT target_price_positive CHECK ((target_price >= (0)::numeric)),
    CONSTRAINT valid_condition CHECK (((condition)::text = ANY ((ARRAY['less_than'::character varying, 'greater_than'::character varying, 'drops_by'::character varying, 'increases_by'::character varying])::text[])))
);


--
-- Name: price_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_alerts_id_seq OWNED BY public.price_alerts.id;


--
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_history_id_seq OWNED BY public.price_history.id;


--
-- Name: product_comparisons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_comparisons (
    id integer NOT NULL,
    product1_id integer NOT NULL,
    product1_name character varying(500),
    product1_category character varying(100),
    product1_price numeric(15,2),
    product2_id integer NOT NULL,
    product2_name character varying(500),
    product2_category character varying(100),
    product2_price numeric(15,2),
    ai_summary text,
    winner_id integer,
    comparison_criteria jsonb,
    session_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: product_comparisons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_comparisons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_comparisons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_comparisons_id_seq OWNED BY public.product_comparisons.id;


--
-- Name: product_specs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_specs (
    product_id integer NOT NULL,
    normalized_specs jsonb DEFAULT '{}'::jsonb NOT NULL,
    compatibility_metadata jsonb DEFAULT '{}'::jsonb,
    extended_metadata jsonb DEFAULT '{}'::jsonb,
    last_enriched timestamp without time zone DEFAULT now(),
    enrichment_version integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE product_specs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_specs IS 'Normalized and enriched product specifications for AI compatibility analysis';


--
-- Name: psu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.psu (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    form_factor character varying(50),
    efficiency_rating character varying(50),
    wattage integer,
    length integer,
    modular boolean,
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pcie_connectors character varying(50),
    sata_connectors character varying(20),
    pcie_8pin_connectors integer DEFAULT 0,
    pcie_6pin_connectors integer DEFAULT 0,
    eps_8pin_connectors integer DEFAULT 1,
    eps_4pin_connectors integer DEFAULT 0,
    molex_connectors integer DEFAULT 4,
    atx_24pin integer DEFAULT 1,
    eps_8pin_cpu integer DEFAULT 1,
    eps_4pin_cpu integer DEFAULT 0,
    pcie_8pin_gpu integer DEFAULT 0,
    pcie_6pin_gpu integer DEFAULT 0,
    pcie_12pin_gpu integer DEFAULT 0,
    sata_power integer DEFAULT 4,
    molex_4pin integer DEFAULT 2,
    width_mm integer,
    height_mm integer,
    cable_type character varying(50),
    has_12vhpwr_connector boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT psu_atx_24pin_check CHECK ((atx_24pin >= 0)),
    CONSTRAINT psu_cable_type_check CHECK (((cable_type)::text = ANY ((ARRAY['Non-Modular'::character varying, 'Semi-Modular'::character varying, 'Full-Modular'::character varying])::text[]))),
    CONSTRAINT psu_eps_4pin_cpu_check CHECK ((eps_4pin_cpu >= 0)),
    CONSTRAINT psu_eps_8pin_cpu_check CHECK ((eps_8pin_cpu >= 0)),
    CONSTRAINT psu_molex_4pin_check CHECK ((molex_4pin >= 0)),
    CONSTRAINT psu_pcie_12pin_gpu_check CHECK ((pcie_12pin_gpu >= 0)),
    CONSTRAINT psu_pcie_6pin_gpu_check CHECK ((pcie_6pin_gpu >= 0)),
    CONSTRAINT psu_pcie_8pin_gpu_check CHECK ((pcie_8pin_gpu >= 0)),
    CONSTRAINT psu_sata_power_check CHECK ((sata_power >= 0))
);


--
-- Name: TABLE psu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.psu IS 'PSU specifications â€” child of pc_parts (Table-Per-Type). FK: psu.id -> pc_parts.id';


--
-- Name: COLUMN psu.form_factor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.psu.form_factor IS 'PSU form factor: ATX, SFX, SFX-L, TFX';


--
-- Name: COLUMN psu.pcie_8pin_gpu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.psu.pcie_8pin_gpu IS 'Number of 8-pin (6+2) PCIe connectors for GPU';


--
-- Name: COLUMN psu.sata_power; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.psu.sata_power IS 'Number of SATA power connectors';


--
-- Name: COLUMN psu.cable_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.psu.cable_type IS 'Cable management: Non-Modular, Semi-Modular, Full-Modular';


--
-- Name: COLUMN psu.has_12vhpwr_connector; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.psu.has_12vhpwr_connector IS 'Has 12VHPWR connector for RTX 40-series GPUs';


--
-- Name: psu_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.psu_compatibility (
    id integer NOT NULL,
    wattage integer NOT NULL,
    efficiency_rating character varying(20),
    form_factor character varying(20) NOT NULL,
    modular_type character varying(20),
    pcie_8pin_connectors integer,
    pcie_6pin_connectors integer,
    has_12vhpwr boolean DEFAULT false,
    sata_connectors integer,
    cable_length_mm integer,
    atx_version character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE psu_compatibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.psu_compatibility IS 'PSU specifications and connector availability';


--
-- Name: psu_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.psu_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: psu_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.psu_compatibility_id_seq OWNED BY public.psu_compatibility.id;


--
-- Name: psu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.psu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: psu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.psu_id_seq OWNED BY public.psu.id;


--
-- Name: queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue (
    queue_id integer NOT NULL,
    order_id integer,
    queue_number integer NOT NULL,
    status character varying(20) DEFAULT 'Waiting'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT queue_status_check CHECK (((status)::text = ANY ((ARRAY['Waiting'::character varying, 'Processing'::character varying, 'Completed'::character varying])::text[])))
);


--
-- Name: queue_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue_cycles (
    id integer NOT NULL,
    cycle_number integer NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone,
    reset_by_user_id integer,
    reset_reason text DEFAULT 'Manual reset - all queue numbers exhausted'::text,
    orders_in_cycle integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    last_reset_date date DEFAULT CURRENT_DATE,
    reset_type character varying(20) DEFAULT 'manual'::character varying,
    next_auto_reset_at timestamp without time zone
);


--
-- Name: COLUMN queue_cycles.last_reset_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_cycles.last_reset_date IS 'Date of last reset (Asia/Manila timezone)';


--
-- Name: COLUMN queue_cycles.reset_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_cycles.reset_type IS 'Type of reset: manual (admin button) or auto (midnight)';


--
-- Name: COLUMN queue_cycles.next_auto_reset_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.queue_cycles.next_auto_reset_at IS 'Next scheduled auto-reset timestamp';


--
-- Name: queue_cycles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.queue_cycles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queue_cycles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.queue_cycles_id_seq OWNED BY public.queue_cycles.id;


--
-- Name: queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.queue_id_seq OWNED BY public.queue.queue_id;


--
-- Name: queue_management_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.queue_management_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queue_management_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.queue_management_id_seq OWNED BY public.queue_management.id;


--
-- Name: ram; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ram (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    memory_type character varying(50),
    configuration character varying(50),
    speed integer,
    voltage numeric(5,2),
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cas_latency character varying(10),
    total_capacity character varying(20),
    stick_count integer DEFAULT 1,
    modules integer DEFAULT 1,
    capacity_per_module_gb integer DEFAULT 8,
    total_capacity_gb integer DEFAULT 8,
    timing character varying(50),
    ecc_support boolean DEFAULT false,
    rgb_lighting boolean DEFAULT false,
    height_mm integer DEFAULT 32,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT ram_capacity_per_module_gb_check CHECK ((capacity_per_module_gb > 0)),
    CONSTRAINT ram_modules_check CHECK ((modules > 0)),
    CONSTRAINT ram_total_capacity_gb_check CHECK ((total_capacity_gb > 0))
);


--
-- Name: TABLE ram; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ram IS 'RAM specifications â€” child of pc_parts (Table-Per-Type). FK: ram.id -> pc_parts.id';


--
-- Name: COLUMN ram.modules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ram.modules IS 'Number of physical RAM sticks in this kit';


--
-- Name: COLUMN ram.capacity_per_module_gb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ram.capacity_per_module_gb IS 'Capacity of each individual stick';


--
-- Name: COLUMN ram.total_capacity_gb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ram.total_capacity_gb IS 'Total capacity of the kit';


--
-- Name: COLUMN ram.height_mm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ram.height_mm IS 'Module height (important for CPU cooler clearance)';


--
-- Name: ram_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ram_compatibility (
    id integer NOT NULL,
    memory_type character varying(20) NOT NULL,
    memory_speed integer NOT NULL,
    chipset_support character varying(50) NOT NULL,
    max_officially_supported_speed integer NOT NULL,
    xmp_profile_stable boolean DEFAULT true,
    height_mm integer,
    cas_latency character varying(20),
    voltage numeric(3,2),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE ram_compatibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ram_compatibility IS 'RAM compatibility with motherboards and chipsets';


--
-- Name: ram_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ram_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ram_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ram_compatibility_id_seq OWNED BY public.ram_compatibility.id;


--
-- Name: ram_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ram_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ram_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ram_id_seq OWNED BY public.ram.id;


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    requests integer DEFAULT 1,
    window_start timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE rate_limits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rate_limits IS 'Rate limiting tracking per key';


--
-- Name: rate_limits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rate_limits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rate_limits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rate_limits_id_seq OWNED BY public.rate_limits.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    password_changed_at timestamp without time zone,
    is_active boolean DEFAULT true,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    last_activity timestamp without time zone,
    two_factor_secret character varying(255),
    two_factor_enabled boolean DEFAULT false,
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    password_reset_token character varying(255),
    password_reset_expires timestamp without time zone,
    refresh_token character varying(500),
    session_id character varying(255),
    reference_email character varying(255),
    reset_attempts integer DEFAULT 0,
    last_reset_request timestamp with time zone,
    reset_session_id character varying(255),
    reset_status character varying(50) DEFAULT 'none'::character varying,
    profile_picture character varying(500),
    is_online boolean DEFAULT false,
    online_status character varying(50) DEFAULT 'offline'::character varying,
    account_locked boolean DEFAULT false,
    login_attempts integer DEFAULT 0,
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    language character varying(10) DEFAULT 'en'::character varying,
    notification_preferences jsonb DEFAULT '{}'::jsonb,
    privacy_settings jsonb DEFAULT '{}'::jsonb,
    session_limit integer DEFAULT 3,
    status character varying(20) DEFAULT 'offline'::character varying,
    profile_image character varying(500),
    phone character varying(20),
    current_session_id character varying(255),
    session_expires_at timestamp with time zone,
    login_count integer DEFAULT 0,
    ip_address inet,
    user_agent text,
    preferences jsonb DEFAULT '{}'::jsonb,
    last_active_at timestamp with time zone,
    last_admin_access timestamp with time zone,
    last_login_at timestamp without time zone,
    username character varying(50) NOT NULL,
    assisted_by integer,
    presence_status character varying(20) DEFAULT 'offline'::character varying,
    display_name character varying(255),
    birth_date date,
    CONSTRAINT users_reset_status_check CHECK (((reset_status)::text = ANY ((ARRAY['none'::character varying, 'pending'::character varying, 'verified'::character varying, 'used'::character varying, 'expired'::character varying])::text[]))),
    CONSTRAINT users_role_check1 CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'superadmin'::character varying, 'developer'::character varying])::text[])))
);


--
-- Name: COLUMN users.password_changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_changed_at IS 'Timestamp when password was last changed';


--
-- Name: COLUMN users.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.is_active IS 'Whether the user account is active';


--
-- Name: COLUMN users.failed_login_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.failed_login_attempts IS 'Number of consecutive failed login attempts';


--
-- Name: COLUMN users.locked_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.locked_until IS 'Account locked until this timestamp due to failed attempts';


--
-- Name: COLUMN users.two_factor_secret; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.two_factor_secret IS 'Secret key for 2FA (encrypted)';


--
-- Name: COLUMN users.two_factor_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.two_factor_enabled IS 'Whether 2FA is enabled for this user';


--
-- Name: COLUMN users.password_reset_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_token IS '6-digit reset code (string, preserves leading zeros)';


--
-- Name: COLUMN users.password_reset_expires; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_reset_expires IS 'Expiration timestamp for reset token (UTC)';


--
-- Name: COLUMN users.reset_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.reset_attempts IS 'Number of failed attempts for current reset token';


--
-- Name: COLUMN users.last_reset_request; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_reset_request IS 'Timestamp of last reset request (for rate limiting)';


--
-- Name: COLUMN users.reset_session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.reset_session_id IS 'Unique session ID for reset process';


--
-- Name: COLUMN users.reset_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.reset_status IS 'Current status of reset process: none, pending, verified, used, expired';


--
-- Name: recent_verified_feedback; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.recent_verified_feedback AS
 SELECT fs.id,
    fs.title,
    fs.description,
    fs.issue_type,
    fs.severity,
    fs.rating,
    p.name AS component_name,
    p.category AS component_category,
    u.username,
    fs.created_at,
    ( SELECT count(*) AS count
           FROM public.feedback_votes
          WHERE ((feedback_votes.feedback_id = fs.id) AND ((feedback_votes.vote)::text = 'helpful'::text))) AS helpful_votes
   FROM ((public.feedback_submissions fs
     LEFT JOIN public.pc_parts p ON ((fs.component_id = p.id)))
     LEFT JOIN public.users u ON ((fs.user_id = u.id)))
  WHERE ((fs.status)::text = 'verified'::text)
  ORDER BY fs.created_at DESC
 LIMIT 50;


--
-- Name: reference_builds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reference_builds (
    id integer NOT NULL,
    build_name character varying(255) NOT NULL,
    build_description text,
    category character varying(64) NOT NULL,
    use_cases jsonb NOT NULL,
    components jsonb NOT NULL,
    total_cost numeric(10,2) NOT NULL,
    estimated_power_draw integer,
    performance_tier character varying(64),
    benchmarks jsonb,
    popularity_score integer DEFAULT 0,
    times_recommended integer DEFAULT 0,
    satisfaction_rating numeric(3,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    featured boolean DEFAULT false,
    CONSTRAINT reference_builds_category_check CHECK (((category)::text = ANY ((ARRAY['budget'::character varying, 'mid-range'::character varying, 'high-end'::character varying, 'enthusiast'::character varying, 'workstation'::character varying])::text[])))
);


--
-- Name: TABLE reference_builds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reference_builds IS 'Curated PC build configurations with performance metrics';


--
-- Name: reference_builds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reference_builds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reference_builds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reference_builds_id_seq OWNED BY public.reference_builds.id;


--
-- Name: rule_ab_test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_ab_test_results (
    id integer NOT NULL,
    experiment_id integer NOT NULL,
    rule_id integer NOT NULL,
    variant_type character varying(20) NOT NULL,
    user_session_id character varying(100),
    request_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    avg_response_time_ms integer,
    user_feedback_score numeric(3,2),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT rule_ab_test_results_variant_type_check CHECK (((variant_type)::text = ANY ((ARRAY['control'::character varying, 'variant'::character varying])::text[])))
);


--
-- Name: TABLE rule_ab_test_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rule_ab_test_results IS 'Results and metrics from A/B test experiments';


--
-- Name: rule_ab_test_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rule_ab_test_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rule_ab_test_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rule_ab_test_results_id_seq OWNED BY public.rule_ab_test_results.id;


--
-- Name: rule_ab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_ab_tests (
    id integer NOT NULL,
    experiment_name character varying(200) NOT NULL,
    description text,
    control_rule_id integer NOT NULL,
    variant_rule_id integer NOT NULL,
    traffic_split numeric(3,2) DEFAULT 0.50,
    start_date timestamp without time zone DEFAULT now(),
    end_date timestamp without time zone,
    status character varying(20) DEFAULT 'running'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT rule_ab_tests_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'running'::character varying, 'paused'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: TABLE rule_ab_tests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rule_ab_tests IS 'A/B testing experiments for rule effectiveness comparison';


--
-- Name: rule_ab_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rule_ab_tests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rule_ab_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rule_ab_tests_id_seq OWNED BY public.rule_ab_tests.id;


--
-- Name: rule_effectiveness_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_effectiveness_metrics (
    id integer NOT NULL,
    rule_id integer NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    trigger_count integer DEFAULT 0,
    block_count integer DEFAULT 0,
    warning_count integer DEFAULT 0,
    info_count integer DEFAULT 0,
    false_positive_count integer DEFAULT 0,
    false_negative_count integer DEFAULT 0,
    avg_response_time_ms integer
);


--
-- Name: TABLE rule_effectiveness_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rule_effectiveness_metrics IS 'Daily aggregated metrics for rule performance monitoring';


--
-- Name: rule_effectiveness_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rule_effectiveness_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rule_effectiveness_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rule_effectiveness_metrics_id_seq OWNED BY public.rule_effectiveness_metrics.id;


--
-- Name: rule_version_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_version_history (
    id integer NOT NULL,
    rule_id integer NOT NULL,
    version integer NOT NULL,
    rule_name character varying(200),
    rule_category character varying(50),
    component_a_category character varying(50),
    component_b_category character varying(50),
    rule_type character varying(50),
    rule_expression jsonb,
    severity character varying(20),
    error_message text,
    warning_message text,
    solution_message text,
    enabled boolean,
    priority integer,
    version_notes text,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT now(),
    change_reason text
);


--
-- Name: TABLE rule_version_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rule_version_history IS 'Complete history of all rule changes for audit and rollback';


--
-- Name: rule_history_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.rule_history_view AS
 SELECT r.id AS rule_id,
    r.rule_name,
    r.version AS current_version,
    h.version AS history_version,
    h.changed_at,
    h.changed_by,
    h.change_reason,
    u.username AS changed_by_username,
    h.rule_expression,
    h.enabled,
    h.priority
   FROM ((public.compatibility_rules r
     LEFT JOIN public.rule_version_history h ON ((r.id = h.rule_id)))
     LEFT JOIN public.users u ON ((h.changed_by = u.id)))
  ORDER BY r.id, h.version DESC;


--
-- Name: rule_version_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rule_version_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rule_version_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rule_version_history_id_seq OWNED BY public.rule_version_history.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    price numeric(10,2) NOT NULL,
    category character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT services_category_check CHECK (((category)::text = ANY ((ARRAY['Hardware Upgrade'::character varying, 'Cleaning Service'::character varying, 'Repair Service'::character varying])::text[])))
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value text,
    type character varying(50) DEFAULT 'string'::character varying NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.settings IS 'Application display/format settings (theme, currency, date_format, notifications). Managed via Settings model and /api/settings routes.';


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: speakers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speakers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    configuration character varying(50),
    total_wattage integer,
    frequency_response character varying(50),
    color character varying(50),
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: speakers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.speakers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: speakers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.speakers_id_seq OWNED BY public.speakers.id;


--
-- Name: specification_schemas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.specification_schemas (
    id integer NOT NULL,
    category character varying(50) NOT NULL,
    field_name character varying(100) NOT NULL,
    field_type character varying(20) NOT NULL,
    is_required boolean DEFAULT false,
    default_value text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE specification_schemas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.specification_schemas IS 'Comprehensive specifications schema for all PC component categories based on actual database table structures';


--
-- Name: specification_schemas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.specification_schemas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: specification_schemas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.specification_schemas_id_seq OWNED BY public.specification_schemas.id;


--
-- Name: stock_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_categories (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: stock_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_categories_id_seq OWNED BY public.stock_categories.id;


--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_items (
    id integer NOT NULL,
    category_id integer,
    name character varying(255) NOT NULL,
    description text,
    price numeric(15,2) NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    classification character varying(20),
    extended_metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT stock_items_classification_check CHECK (((classification)::text = ANY ((ARRAY['entry'::character varying, 'mid-tier'::character varying, 'high-tier'::character varying, 'elite'::character varying])::text[])))
);


--
-- Name: COLUMN stock_items.classification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stock_items.classification IS 'Product tier: entry (budget), mid-tier (mainstream), high-tier (enthusiast), elite (flagship)';


--
-- Name: COLUMN stock_items.extended_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stock_items.extended_metadata IS 'Enhanced metadata for AI analysis: performance scores, compatibility notes, benchmarks';


--
-- Name: stock_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_items_id_seq OWNED BY public.stock_items.id;


--
-- Name: storage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    capacity character varying(50),
    storage_type character varying(50),
    interface character varying(50),
    nvme_support boolean,
    cache character varying(50),
    m2_type character varying(50),
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_speed character varying(20),
    write_speed character varying(20),
    form_factor character varying(20),
    bus_interface character varying(20),
    pcie_generation character varying(20),
    nvme_version character varying(20),
    read_speed_mbps integer,
    write_speed_mbps integer,
    power_consumption_w numeric(5,2),
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT storage_bus_interface_check CHECK (((bus_interface)::text = ANY ((ARRAY['NVMe'::character varying, 'SATA'::character varying, 'PCIe'::character varying])::text[]))),
    CONSTRAINT storage_pcie_generation_check CHECK (((pcie_generation)::text = ANY ((ARRAY['PCIe 3.0'::character varying, 'PCIe 4.0'::character varying, 'PCIe 5.0'::character varying])::text[])))
);


--
-- Name: TABLE storage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.storage IS 'Storage specifications â€” child of pc_parts (Table-Per-Type). FK: storage.id -> pc_parts.id';


--
-- Name: COLUMN storage.form_factor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.storage.form_factor IS 'Physical size: 2.5", 3.5", M.2 2280, etc.';


--
-- Name: COLUMN storage.pcie_generation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.storage.pcie_generation IS 'For NVMe: PCIe 3.0, 4.0, or 5.0';


--
-- Name: storage_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_compatibility (
    id integer NOT NULL,
    storage_type character varying(20) NOT NULL,
    interface_type character varying(20) NOT NULL,
    form_factor character varying(20) NOT NULL,
    pcie_gen character varying(10),
    nvme_version character varying(10),
    m2_key character varying(10),
    disables_sata_ports jsonb,
    requires_heatsink boolean DEFAULT false,
    max_length_mm integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: storage_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.storage_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: storage_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.storage_compatibility_id_seq OWNED BY public.storage_compatibility.id;


--
-- Name: storage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.storage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: storage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.storage_id_seq OWNED BY public.storage.id;


--
-- Name: successful_builds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.successful_builds (
    id integer NOT NULL,
    user_id integer,
    build_name character varying(200) NOT NULL,
    build_hash character varying(64) NOT NULL,
    build_type character varying(50) NOT NULL,
    cpu_id integer,
    gpu_id integer,
    motherboard_id integer,
    ram_id integer,
    storage_id integer,
    psu_id integer,
    case_id integer,
    cooling_id integer,
    components_json jsonb NOT NULL,
    total_price numeric(10,2),
    use_case text,
    performance_rating integer,
    stability_rating integer,
    satisfaction_rating integer,
    notes text,
    specifications jsonb,
    verified boolean DEFAULT false,
    verified_by integer,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT successful_builds_performance_rating_check CHECK (((performance_rating >= 1) AND (performance_rating <= 5))),
    CONSTRAINT successful_builds_satisfaction_rating_check CHECK (((satisfaction_rating >= 1) AND (satisfaction_rating <= 5))),
    CONSTRAINT successful_builds_stability_rating_check CHECK (((stability_rating >= 1) AND (stability_rating <= 5)))
);


--
-- Name: TABLE successful_builds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.successful_builds IS 'User-submitted successful build configurations';


--
-- Name: COLUMN successful_builds.build_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.successful_builds.build_hash IS 'MD5 hash for pattern matching similar builds';


--
-- Name: successful_builds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.successful_builds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: successful_builds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.successful_builds_id_seq OWNED BY public.successful_builds.id;


--
-- Name: system_monitoring; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_monitoring (
    id integer NOT NULL,
    metric_name character varying(100) NOT NULL,
    metric_value numeric(15,4),
    metric_unit character varying(20),
    category character varying(50),
    server_id character varying(100) DEFAULT 'main'::character varying,
    node_version character varying(20),
    platform character varying(50),
    warning_threshold numeric(15,4),
    critical_threshold numeric(15,4),
    status character varying(20) DEFAULT 'normal'::character varying,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT system_monitoring_status_check CHECK (((status)::text = ANY ((ARRAY['normal'::character varying, 'warning'::character varying, 'critical'::character varying])::text[])))
);


--
-- Name: system_monitoring_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_monitoring_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_monitoring_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_monitoring_id_seq OWNED BY public.system_monitoring.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value text,
    description text,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE system_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_settings IS 'System-level and per-user settings (security, api_rate_limit, session_timeout, per-user appearance/language). Managed via /api/admin routes.';


--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: thermal_compatibility; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thermal_compatibility (
    id integer NOT NULL,
    case_model character varying(200),
    case_airflow_rating integer,
    cpu_tdp_limit integer,
    gpu_tdp_limit integer,
    total_tdp_limit integer,
    recommended_fan_count integer,
    requires_liquid_cooling boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: thermal_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.thermal_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: thermal_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.thermal_compatibility_id_seq OWNED BY public.thermal_compatibility.id;


--
-- Name: top_build_patterns; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.top_build_patterns AS
 SELECT bp.id,
    bp.build_type,
    bp.build_count,
    bp.avg_performance,
    bp.avg_stability,
    bp.avg_satisfaction,
    (((bp.avg_performance + bp.avg_stability) + bp.avg_satisfaction) / 3.0) AS overall_rating,
    cpu.name AS cpu_name,
    gpu.name AS gpu_name,
    mobo.name AS motherboard_name,
    bp.last_seen
   FROM (((public.build_patterns bp
     LEFT JOIN public.pc_parts cpu ON ((bp.cpu_id = cpu.id)))
     LEFT JOIN public.pc_parts gpu ON ((bp.gpu_id = gpu.id)))
     LEFT JOIN public.pc_parts mobo ON ((bp.motherboard_id = mobo.id)))
  WHERE (bp.build_count >= 3)
  ORDER BY bp.avg_satisfaction DESC, bp.build_count DESC
 LIMIT 20;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    transaction_number character varying(50) NOT NULL,
    order_id integer,
    amount numeric(15,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: upgrade_paths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upgrade_paths (
    id integer NOT NULL,
    path_name character varying(255) NOT NULL,
    from_build_category character varying(64) NOT NULL,
    to_build_category character varying(64) NOT NULL,
    priority integer DEFAULT 5,
    estimated_performance_gain numeric(5,2),
    estimated_cost_min numeric(10,2),
    estimated_cost_max numeric(10,2),
    upgrade_steps jsonb NOT NULL,
    timeline_months integer,
    use_cases jsonb,
    popularity_score integer DEFAULT 0,
    success_rate numeric(5,2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT upgrade_paths_priority_check CHECK (((priority >= 1) AND (priority <= 10)))
);


--
-- Name: TABLE upgrade_paths; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.upgrade_paths IS 'Curated upgrade pathways with performance and cost estimates';


--
-- Name: upgrade_paths_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.upgrade_paths_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: upgrade_paths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.upgrade_paths_id_seq OWNED BY public.upgrade_paths.id;


--
-- Name: user; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public."user" AS
 SELECT id,
    name,
    email,
    password_hash,
    role,
    created_at
   FROM public._deprecated_user;


--
-- Name: user_compatibility_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_compatibility_reports (
    id integer NOT NULL,
    user_id integer,
    build_hash character varying(64) NOT NULL,
    parts_json jsonb NOT NULL,
    issue_type character varying(50) NOT NULL,
    issue_description text NOT NULL,
    severity character varying(20) NOT NULL,
    resolution_status character varying(20) DEFAULT 'pending'::character varying,
    admin_notes text,
    upvotes integer DEFAULT 0,
    downvotes integer DEFAULT 0,
    verified_by_admin boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_compatibility_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_compatibility_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_compatibility_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_compatibility_reports_id_seq OWNED BY public.user_compatibility_reports.id;


--
-- Name: user_personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_personas (
    id integer NOT NULL,
    user_id integer,
    persona_cluster character varying(64),
    confidence numeric(5,2),
    primary_use jsonb,
    performance_target character varying(128),
    budget_min numeric(10,2),
    budget_max numeric(10,2),
    budget_flexibility character varying(32),
    brand_preferences jsonb,
    brand_avoid jsonb,
    aesthetic character varying(64),
    noise_tolerance character varying(32),
    form_factor character varying(32),
    browsing_patterns jsonb,
    price_sensitivity character varying(32),
    research_depth character varying(32),
    previous_builds jsonb,
    upgrade_frequency_months integer,
    experience_level character varying(32),
    comfort_with jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT user_personas_aesthetic_check CHECK (((aesthetic)::text = ANY ((ARRAY['rgb_heavy'::character varying, 'minimalist'::character varying, 'professional'::character varying, 'any'::character varying])::text[]))),
    CONSTRAINT user_personas_budget_flexibility_check CHECK (((budget_flexibility)::text = ANY ((ARRAY['strict'::character varying, 'moderate'::character varying, 'flexible'::character varying])::text[]))),
    CONSTRAINT user_personas_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (100)::numeric))),
    CONSTRAINT user_personas_experience_level_check CHECK (((experience_level)::text = ANY ((ARRAY['beginner'::character varying, 'intermediate'::character varying, 'expert'::character varying])::text[]))),
    CONSTRAINT user_personas_form_factor_check CHECK (((form_factor)::text = ANY ((ARRAY['atx'::character varying, 'matx'::character varying, 'itx'::character varying, 'any'::character varying])::text[]))),
    CONSTRAINT user_personas_noise_tolerance_check CHECK (((noise_tolerance)::text = ANY ((ARRAY['silent'::character varying, 'quiet'::character varying, 'balanced'::character varying, 'performance'::character varying])::text[]))),
    CONSTRAINT user_personas_persona_cluster_check CHECK (((persona_cluster)::text = ANY ((ARRAY['competitive_gamer'::character varying, 'content_creator_pro'::character varying, 'budget_optimizer'::character varying, 'enthusiast_overclocker'::character varying, 'general_user'::character varying])::text[])))
);


--
-- Name: TABLE user_personas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_personas IS 'User behavioral profiles for AI personalization';


--
-- Name: user_personas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_personas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_personas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_personas_id_seq OWNED BY public.user_personas.id;


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id integer NOT NULL,
    user_id character varying(100),
    session_id character varying(255),
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- Name: user_presence_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.user_presence_stats AS
 SELECT count(*) FILTER (WHERE ((is_online = true) AND ((online_status)::text = 'active_admin'::text))) AS online_admins,
    count(*) FILTER (WHERE ((is_online = true) AND ((online_status)::text <> 'active_admin'::text))) AS online_users,
    count(*) FILTER (WHERE ((online_status)::text = 'away'::text)) AS away_users,
    count(*) FILTER (WHERE ((is_online = false) OR ((online_status)::text = 'offline'::text))) AS offline_users,
    count(*) AS total_users,
    now() AS last_updated
   FROM public.users
  WHERE (is_active = true)
  WITH NO DATA;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id integer,
    session_token character varying(500) NOT NULL,
    refresh_token character varying(500),
    ip_address inet,
    user_agent text,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    location character varying(255),
    device_info jsonb,
    is_active boolean DEFAULT true
);


--
-- Name: TABLE user_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_sessions IS 'Active user sessions for better session management';


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: user_virtual_build; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_virtual_build (
    id integer NOT NULL,
    user_id integer,
    build_json jsonb NOT NULL,
    estimated_date timestamp without time zone DEFAULT now(),
    source character varying(50) DEFAULT 'ai_estimate'::character varying,
    confidence_score numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_virtual_build_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_virtual_build_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_virtual_build_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_virtual_build_id_seq OWNED BY public.user_virtual_build.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public._deprecated_user.id;


--
-- Name: users_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq1 OWNED BY public.users.id;


--
-- Name: v_compatibility_analysis; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_compatibility_analysis AS
 SELECT date(created_at) AS check_date,
    outcome_quality,
    user_decision,
    count(*) AS total_checks,
    avg(((ai_verdict ->> 'confidence'::text))::numeric) AS avg_ai_confidence,
    count(DISTINCT build_hash) AS unique_builds,
    count(DISTINCT session_id) AS unique_sessions
   FROM public.compatibility_logs
  GROUP BY (date(created_at)), outcome_quality, user_decision
  ORDER BY (date(created_at)) DESC;


--
-- Name: v_pc_upgrade_new_products_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_pc_upgrade_new_products_summary AS
 SELECT category,
    count(*) AS new_products_count,
    max(detected_at) AS latest_detection
   FROM public.pc_upgrade_new_products
  WHERE ((status)::text = 'pending'::text)
  GROUP BY category
  ORDER BY category;


--
-- Name: VIEW v_pc_upgrade_new_products_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_pc_upgrade_new_products_summary IS 'Summary of new products not yet included in reference builds';


--
-- Name: v_pc_upgrade_parameters_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_pc_upgrade_parameters_summary AS
 SELECT ( SELECT count(*) AS count
           FROM public.pc_upgrade_usage_types
          WHERE (pc_upgrade_usage_types.is_active = true)) AS active_usage_types,
    ( SELECT count(*) AS count
           FROM public.pc_upgrade_year_ranges
          WHERE (pc_upgrade_year_ranges.is_active = true)) AS active_year_ranges,
    ( SELECT count(*) AS count
           FROM public.pc_upgrade_budget_ranges
          WHERE (pc_upgrade_budget_ranges.is_active = true)) AS active_budget_ranges,
    ((( SELECT count(*) AS count
           FROM public.pc_upgrade_usage_types
          WHERE (pc_upgrade_usage_types.is_active = true)) * ( SELECT count(*) AS count
           FROM public.pc_upgrade_year_ranges
          WHERE (pc_upgrade_year_ranges.is_active = true))) * ( SELECT count(*) AS count
           FROM public.pc_upgrade_budget_ranges
          WHERE (pc_upgrade_budget_ranges.is_active = true))) AS expected_total_builds;


--
-- Name: VIEW v_pc_upgrade_parameters_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_pc_upgrade_parameters_summary IS 'Quick summary of active parameters and expected build count';


--
-- Name: webcam; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webcam (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    resolution character varying(50),
    connection character varying(50),
    focus_type character varying(50),
    operating_system character varying(50),
    fov_angle integer,
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    frame_rate character varying(20),
    microphone_builtin boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE webcam; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webcam IS 'Webcam specifications â€” child of pc_parts (Table-Per-Type). FK: webcam.id -> pc_parts.id';


--
-- Name: webcam_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webcam_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webcam_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webcam_id_seq OWNED BY public.webcam.id;


--
-- Name: webcams; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.webcams AS
 SELECT id,
    part_id,
    name,
    resolution,
    connection,
    focus_type,
    operating_system,
    fov_angle,
    frame_rate,
    microphone_builtin,
    privacy_shutter,
    created_at,
    updated_at
   FROM public._deprecated_webcams;


--
-- Name: webcams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webcams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webcams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webcams_id_seq OWNED BY public.webcam.id;


--
-- Name: webcams_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webcams_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webcams_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webcams_id_seq1 OWNED BY public._deprecated_webcams.id;


--
-- Name: _deprecated_monitors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._deprecated_monitors ALTER COLUMN id SET DEFAULT nextval('public.monitors_id_seq1'::regclass);


--
-- Name: _deprecated_webcams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._deprecated_webcams ALTER COLUMN id SET DEFAULT nextval('public.webcams_id_seq1'::regclass);


--
-- Name: _migration_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migration_history ALTER COLUMN id SET DEFAULT nextval('public._migration_history_id_seq'::regclass);


--
-- Name: activity_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log ALTER COLUMN id SET DEFAULT nextval('public.activity_log_id_seq'::regclass);


--
-- Name: ai_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_audit_logs_id_seq'::regclass);


--
-- Name: ai_compatibility_recommendations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_compatibility_recommendations ALTER COLUMN id SET DEFAULT nextval('public.ai_compatibility_recommendations_id_seq'::regclass);


--
-- Name: ai_corrections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_corrections ALTER COLUMN id SET DEFAULT nextval('public.ai_corrections_id_seq'::regclass);


--
-- Name: ai_experiment_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_experiment_variants ALTER COLUMN id SET DEFAULT nextval('public.ai_experiment_variants_id_seq'::regclass);


--
-- Name: ai_feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback ALTER COLUMN id SET DEFAULT nextval('public.ai_feedback_id_seq'::regclass);


--
-- Name: ai_feedback_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback_stats ALTER COLUMN id SET DEFAULT nextval('public.ai_feedback_stats_id_seq'::regclass);


--
-- Name: ai_learning_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_learning_patterns ALTER COLUMN id SET DEFAULT nextval('public.ai_learning_patterns_id_seq'::regclass);


--
-- Name: ai_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_logs_id_seq'::regclass);


--
-- Name: ai_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_metrics ALTER COLUMN id SET DEFAULT nextval('public.ai_metrics_id_seq'::regclass);


--
-- Name: ai_pending_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_pending_reviews ALTER COLUMN id SET DEFAULT nextval('public.ai_pending_reviews_id_seq'::regclass);


--
-- Name: ai_recommendations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_recommendations ALTER COLUMN id SET DEFAULT nextval('public.ai_recommendations_id_seq'::regclass);


--
-- Name: ai_training_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_training_data ALTER COLUMN id SET DEFAULT nextval('public.ai_training_data_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: assistance_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistance_requests ALTER COLUMN id SET DEFAULT nextval('public.assistance_requests_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: bios_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bios_compatibility ALTER COLUMN id SET DEFAULT nextval('public.bios_compatibility_id_seq'::regclass);


--
-- Name: build_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_history ALTER COLUMN id SET DEFAULT nextval('public.build_history_id_seq'::regclass);


--
-- Name: build_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns ALTER COLUMN id SET DEFAULT nextval('public.build_patterns_id_seq'::regclass);


--
-- Name: case_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_compatibility ALTER COLUMN id SET DEFAULT nextval('public.case_compatibility_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: compatibility_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_cache ALTER COLUMN id SET DEFAULT nextval('public.compatibility_cache_id_seq'::regclass);


--
-- Name: compatibility_issue_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_issue_templates ALTER COLUMN id SET DEFAULT nextval('public.compatibility_issue_templates_id_seq'::regclass);


--
-- Name: compatibility_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_logs ALTER COLUMN id SET DEFAULT nextval('public.compatibility_logs_id_seq'::regclass);


--
-- Name: compatibility_matrix id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_matrix ALTER COLUMN id SET DEFAULT nextval('public.compatibility_matrix_id_seq'::regclass);


--
-- Name: compatibility_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_rules ALTER COLUMN id SET DEFAULT nextval('public.compatibility_rules_id_seq'::regclass);


--
-- Name: compatibility_rules_confidence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_rules_confidence ALTER COLUMN id SET DEFAULT nextval('public.compatibility_rules_confidence_id_seq'::regclass);


--
-- Name: component_performance_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_performance_tiers ALTER COLUMN id SET DEFAULT nextval('public.component_performance_tiers_id_seq'::regclass);


--
-- Name: cooling id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cooling ALTER COLUMN id SET DEFAULT nextval('public.cooling_id_seq'::regclass);


--
-- Name: cooling_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cooling_compatibility ALTER COLUMN id SET DEFAULT nextval('public.cooling_compatibility_id_seq'::regclass);


--
-- Name: cpu id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu ALTER COLUMN id SET DEFAULT nextval('public.cpu_id_seq'::regclass);


--
-- Name: cpu_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu_compatibility ALTER COLUMN id SET DEFAULT nextval('public.cpu_compatibility_id_seq'::regclass);


--
-- Name: deployment_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_config ALTER COLUMN id SET DEFAULT nextval('public.deployment_config_id_seq'::regclass);


--
-- Name: diagnostic_issues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_issues ALTER COLUMN id SET DEFAULT nextval('public.diagnostic_issues_id_seq'::regclass);


--
-- Name: feedback_review_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_review_queue ALTER COLUMN id SET DEFAULT nextval('public.feedback_review_queue_id_seq'::regclass);


--
-- Name: feedback_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions ALTER COLUMN id SET DEFAULT nextval('public.feedback_submissions_id_seq'::regclass);


--
-- Name: feedback_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_votes ALTER COLUMN id SET DEFAULT nextval('public.feedback_votes_id_seq'::regclass);


--
-- Name: gpu id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpu ALTER COLUMN id SET DEFAULT nextval('public.gpu_id_seq'::regclass);


--
-- Name: gpu_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpu_compatibility ALTER COLUMN id SET DEFAULT nextval('public.gpu_compatibility_id_seq'::regclass);


--
-- Name: headphones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.headphones ALTER COLUMN id SET DEFAULT nextval('public.headphones_id_seq'::regclass);


--
-- Name: historical_builds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historical_builds ALTER COLUMN id SET DEFAULT nextval('public.historical_builds_id_seq'::regclass);


--
-- Name: historical_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historical_patterns ALTER COLUMN id SET DEFAULT nextval('public.historical_patterns_id_seq'::regclass);


--
-- Name: ip_access_control id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_access_control ALTER COLUMN id SET DEFAULT nextval('public.ip_access_control_id_seq'::regclass);


--
-- Name: ip_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_logs ALTER COLUMN id SET DEFAULT nextval('public.ip_logs_id_seq'::regclass);


--
-- Name: issue_verifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_verifications ALTER COLUMN id SET DEFAULT nextval('public.issue_verifications_id_seq'::regclass);


--
-- Name: keyboard id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyboard ALTER COLUMN id SET DEFAULT nextval('public.keyboard_id_seq'::regclass);


--
-- Name: kiosk_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kiosk_sessions ALTER COLUMN id SET DEFAULT nextval('public.kiosk_sessions_id_seq'::regclass);


--
-- Name: known_compatibility_issues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.known_compatibility_issues ALTER COLUMN id SET DEFAULT nextval('public.known_compatibility_issues_id_seq'::regclass);


--
-- Name: known_issues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.known_issues ALTER COLUMN id SET DEFAULT nextval('public.known_issues_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: monitor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor ALTER COLUMN id SET DEFAULT nextval('public.monitors_id_seq'::regclass);


--
-- Name: motherboard id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motherboard ALTER COLUMN id SET DEFAULT nextval('public.motherboard_id_seq'::regclass);


--
-- Name: motherboard_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motherboard_compatibility ALTER COLUMN id SET DEFAULT nextval('public.motherboard_compatibility_id_seq'::regclass);


--
-- Name: mouse id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mouse ALTER COLUMN id SET DEFAULT nextval('public.mouse_id_seq'::regclass);


--
-- Name: notification_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue ALTER COLUMN id SET DEFAULT nextval('public.notification_queue_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: order_counters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_counters ALTER COLUMN id SET DEFAULT nextval('public.order_counters_id_seq'::regclass);


--
-- Name: order_deduplication_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_deduplication_log ALTER COLUMN id SET DEFAULT nextval('public.order_deduplication_log_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: order_locks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_locks ALTER COLUMN id SET DEFAULT nextval('public.order_locks_id_seq'::regclass);


--
-- Name: order_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_queue ALTER COLUMN id SET DEFAULT nextval('public.order_queue_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: package id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package ALTER COLUMN id SET DEFAULT nextval('public.packages_id_seq'::regclass);


--
-- Name: password_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history ALTER COLUMN id SET DEFAULT nextval('public.password_history_id_seq'::regclass);


--
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


--
-- Name: payment payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment ALTER COLUMN payment_id SET DEFAULT nextval('public.payments_payment_id_seq'::regclass);


--
-- Name: pc_case id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_case ALTER COLUMN id SET DEFAULT nextval('public.pc_case_id_seq'::regclass);


--
-- Name: pc_customized_ai_builds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_builds ALTER COLUMN id SET DEFAULT nextval('public.pc_customized_ai_builds_id_seq'::regclass);


--
-- Name: pc_customized_ai_builds_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_builds_metadata ALTER COLUMN id SET DEFAULT nextval('public.pc_customized_ai_builds_metadata_id_seq'::regclass);


--
-- Name: pc_customized_ai_reference_builds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds ALTER COLUMN id SET DEFAULT nextval('public.pc_customized_ai_reference_builds_id_seq'::regclass);


--
-- Name: pc_customized_budget_ranges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_budget_ranges ALTER COLUMN id SET DEFAULT nextval('public.pc_customized_budget_ranges_id_seq'::regclass);


--
-- Name: pc_customized_gaming_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_gaming_preferences ALTER COLUMN id SET DEFAULT nextval('public.pc_customized_gaming_preferences_id_seq'::regclass);


--
-- Name: pc_customized_performance_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_performance_preferences ALTER COLUMN id SET DEFAULT nextval('public.pc_customized_performance_preferences_id_seq'::regclass);


--
-- Name: pc_customized_usage_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_usage_types ALTER COLUMN id SET DEFAULT nextval('public.pc_customized_usage_types_id_seq'::regclass);


--
-- Name: pc_parts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_parts ALTER COLUMN id SET DEFAULT nextval('public.pc_parts_id_seq'::regclass);


--
-- Name: pc_services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_services ALTER COLUMN id SET DEFAULT nextval('public.pc_services_id_seq'::regclass);


--
-- Name: pc_upgrade_budget_ranges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_budget_ranges ALTER COLUMN id SET DEFAULT nextval('public.pc_upgrade_budget_ranges_id_seq'::regclass);


--
-- Name: pc_upgrade_new_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_new_products ALTER COLUMN id SET DEFAULT nextval('public.pc_upgrade_new_products_id_seq'::regclass);


--
-- Name: pc_upgrade_reference_builds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_reference_builds ALTER COLUMN id SET DEFAULT nextval('public.pc_upgrade_reference_builds_id_seq'::regclass);


--
-- Name: pc_upgrade_reference_builds_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_reference_builds_metadata ALTER COLUMN id SET DEFAULT nextval('public.pc_upgrade_reference_builds_metadata_id_seq'::regclass);


--
-- Name: pc_upgrade_usage_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_usage_types ALTER COLUMN id SET DEFAULT nextval('public.pc_upgrade_usage_types_id_seq'::regclass);


--
-- Name: pc_upgrade_year_ranges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_year_ranges ALTER COLUMN id SET DEFAULT nextval('public.pc_upgrade_year_ranges_id_seq'::regclass);


--
-- Name: pending_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_orders ALTER COLUMN id SET DEFAULT nextval('public.pending_orders_id_seq'::regclass);


--
-- Name: performancestats stat_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performancestats ALTER COLUMN stat_id SET DEFAULT nextval('public.performancestats_stat_id_seq'::regclass);


--
-- Name: pre_built_pc_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_built_pc_history ALTER COLUMN id SET DEFAULT nextval('public.pre_built_pc_history_id_seq'::regclass);


--
-- Name: prebuilt_components id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prebuilt_components ALTER COLUMN id SET DEFAULT nextval('public.prebuilt_components_id_seq'::regclass);


--
-- Name: prebuilt_pcs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prebuilt_pcs ALTER COLUMN id SET DEFAULT nextval('public.prebuilt_pcs_id_seq'::regclass);


--
-- Name: price_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts ALTER COLUMN id SET DEFAULT nextval('public.price_alerts_id_seq'::regclass);


--
-- Name: price_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history ALTER COLUMN id SET DEFAULT nextval('public.price_history_id_seq'::regclass);


--
-- Name: product_comparisons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_comparisons ALTER COLUMN id SET DEFAULT nextval('public.product_comparisons_id_seq'::regclass);


--
-- Name: psu id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psu ALTER COLUMN id SET DEFAULT nextval('public.psu_id_seq'::regclass);


--
-- Name: psu_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psu_compatibility ALTER COLUMN id SET DEFAULT nextval('public.psu_compatibility_id_seq'::regclass);


--
-- Name: queue queue_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue ALTER COLUMN queue_id SET DEFAULT nextval('public.queue_id_seq'::regclass);


--
-- Name: queue_cycles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_cycles ALTER COLUMN id SET DEFAULT nextval('public.queue_cycles_id_seq'::regclass);


--
-- Name: queue_management id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_management ALTER COLUMN id SET DEFAULT nextval('public.queue_management_id_seq'::regclass);


--
-- Name: ram id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ram ALTER COLUMN id SET DEFAULT nextval('public.ram_id_seq'::regclass);


--
-- Name: ram_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ram_compatibility ALTER COLUMN id SET DEFAULT nextval('public.ram_compatibility_id_seq'::regclass);


--
-- Name: rate_limits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits ALTER COLUMN id SET DEFAULT nextval('public.rate_limits_id_seq'::regclass);


--
-- Name: reference_builds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_builds ALTER COLUMN id SET DEFAULT nextval('public.reference_builds_id_seq'::regclass);


--
-- Name: rule_ab_test_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_test_results ALTER COLUMN id SET DEFAULT nextval('public.rule_ab_test_results_id_seq'::regclass);


--
-- Name: rule_ab_tests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_tests ALTER COLUMN id SET DEFAULT nextval('public.rule_ab_tests_id_seq'::regclass);


--
-- Name: rule_effectiveness_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_effectiveness_metrics ALTER COLUMN id SET DEFAULT nextval('public.rule_effectiveness_metrics_id_seq'::regclass);


--
-- Name: rule_version_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_version_history ALTER COLUMN id SET DEFAULT nextval('public.rule_version_history_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: speakers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers ALTER COLUMN id SET DEFAULT nextval('public.speakers_id_seq'::regclass);


--
-- Name: specification_schemas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specification_schemas ALTER COLUMN id SET DEFAULT nextval('public.specification_schemas_id_seq'::regclass);


--
-- Name: stock_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_categories ALTER COLUMN id SET DEFAULT nextval('public.stock_categories_id_seq'::regclass);


--
-- Name: stock_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items ALTER COLUMN id SET DEFAULT nextval('public.stock_items_id_seq'::regclass);


--
-- Name: storage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage ALTER COLUMN id SET DEFAULT nextval('public.storage_id_seq'::regclass);


--
-- Name: storage_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_compatibility ALTER COLUMN id SET DEFAULT nextval('public.storage_compatibility_id_seq'::regclass);


--
-- Name: successful_builds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds ALTER COLUMN id SET DEFAULT nextval('public.successful_builds_id_seq'::regclass);


--
-- Name: system_monitoring id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_monitoring ALTER COLUMN id SET DEFAULT nextval('public.system_monitoring_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: thermal_compatibility id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thermal_compatibility ALTER COLUMN id SET DEFAULT nextval('public.thermal_compatibility_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: upgrade_paths id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upgrade_paths ALTER COLUMN id SET DEFAULT nextval('public.upgrade_paths_id_seq'::regclass);


--
-- Name: user_compatibility_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_compatibility_reports ALTER COLUMN id SET DEFAULT nextval('public.user_compatibility_reports_id_seq'::regclass);


--
-- Name: user_personas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_personas ALTER COLUMN id SET DEFAULT nextval('public.user_personas_id_seq'::regclass);


--
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: user_virtual_build id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_virtual_build ALTER COLUMN id SET DEFAULT nextval('public.user_virtual_build_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq1'::regclass);


--
-- Name: webcam id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webcam ALTER COLUMN id SET DEFAULT nextval('public.webcams_id_seq'::regclass);


--
-- Name: _migration_history _migration_history_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migration_history
    ADD CONSTRAINT _migration_history_migration_name_key UNIQUE (migration_name);


--
-- Name: _migration_history _migration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migration_history
    ADD CONSTRAINT _migration_history_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: ai_audit_logs ai_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audit_logs
    ADD CONSTRAINT ai_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_cache ai_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_cache
    ADD CONSTRAINT ai_cache_pkey PRIMARY KEY (cache_key);


--
-- Name: ai_compatibility_recommendations ai_compatibility_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_compatibility_recommendations
    ADD CONSTRAINT ai_compatibility_recommendations_pkey PRIMARY KEY (id);


--
-- Name: ai_corrections ai_corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_corrections
    ADD CONSTRAINT ai_corrections_pkey PRIMARY KEY (id);


--
-- Name: ai_experiment_variants ai_experiment_variants_experiment_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_experiment_variants
    ADD CONSTRAINT ai_experiment_variants_experiment_id_variant_id_key UNIQUE (experiment_id, variant_id);


--
-- Name: ai_experiment_variants ai_experiment_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_experiment_variants
    ADD CONSTRAINT ai_experiment_variants_pkey PRIMARY KEY (id);


--
-- Name: ai_feedback ai_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_pkey PRIMARY KEY (id);


--
-- Name: ai_feedback_stats ai_feedback_stats_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback_stats
    ADD CONSTRAINT ai_feedback_stats_period_key UNIQUE (period);


--
-- Name: ai_feedback_stats ai_feedback_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback_stats
    ADD CONSTRAINT ai_feedback_stats_pkey PRIMARY KEY (id);


--
-- Name: ai_learning_patterns ai_learning_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_learning_patterns
    ADD CONSTRAINT ai_learning_patterns_pkey PRIMARY KEY (id);


--
-- Name: ai_logs ai_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_logs
    ADD CONSTRAINT ai_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_metrics ai_metrics_metric_date_scenario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_metrics
    ADD CONSTRAINT ai_metrics_metric_date_scenario_key UNIQUE (metric_date, scenario);


--
-- Name: ai_metrics ai_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_metrics
    ADD CONSTRAINT ai_metrics_pkey PRIMARY KEY (id);


--
-- Name: ai_pending_reviews ai_pending_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_pending_reviews
    ADD CONSTRAINT ai_pending_reviews_pkey PRIMARY KEY (id);


--
-- Name: ai_pending_reviews ai_pending_reviews_suggestion_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_pending_reviews
    ADD CONSTRAINT ai_pending_reviews_suggestion_id_key UNIQUE (suggestion_id);


--
-- Name: ai_recommendations ai_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_recommendations
    ADD CONSTRAINT ai_recommendations_pkey PRIMARY KEY (id);


--
-- Name: ai_training_data ai_training_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_training_data
    ADD CONSTRAINT ai_training_data_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: assistance_requests assistance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistance_requests
    ADD CONSTRAINT assistance_requests_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bios_compatibility bios_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bios_compatibility
    ADD CONSTRAINT bios_compatibility_pkey PRIMARY KEY (id);


--
-- Name: build_history build_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_history
    ADD CONSTRAINT build_history_pkey PRIMARY KEY (id);


--
-- Name: build_patterns build_patterns_build_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_build_hash_key UNIQUE (build_hash);


--
-- Name: build_patterns build_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_pkey PRIMARY KEY (id);


--
-- Name: case_compatibility case_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_compatibility
    ADD CONSTRAINT case_compatibility_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: compatibility_cache compatibility_cache_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_cache
    ADD CONSTRAINT compatibility_cache_cache_key_key UNIQUE (cache_key);


--
-- Name: compatibility_cache compatibility_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_cache
    ADD CONSTRAINT compatibility_cache_pkey PRIMARY KEY (id);


--
-- Name: compatibility_issue_templates compatibility_issue_templates_issue_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_issue_templates
    ADD CONSTRAINT compatibility_issue_templates_issue_code_key UNIQUE (issue_code);


--
-- Name: compatibility_issue_templates compatibility_issue_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_issue_templates
    ADD CONSTRAINT compatibility_issue_templates_pkey PRIMARY KEY (id);


--
-- Name: compatibility_logs compatibility_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_logs
    ADD CONSTRAINT compatibility_logs_pkey PRIMARY KEY (id);


--
-- Name: compatibility_matrix compatibility_matrix_component_a_id_component_a_category_co_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_matrix
    ADD CONSTRAINT compatibility_matrix_component_a_id_component_a_category_co_key UNIQUE (component_a_id, component_a_category, component_b_id, component_b_category);


--
-- Name: compatibility_matrix compatibility_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_matrix
    ADD CONSTRAINT compatibility_matrix_pkey PRIMARY KEY (id);


--
-- Name: compatibility_rules_confidence compatibility_rules_confidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_rules_confidence
    ADD CONSTRAINT compatibility_rules_confidence_pkey PRIMARY KEY (id);


--
-- Name: compatibility_rules_confidence compatibility_rules_confidence_rule_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_rules_confidence
    ADD CONSTRAINT compatibility_rules_confidence_rule_name_key UNIQUE (rule_name);


--
-- Name: compatibility_rules compatibility_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_rules
    ADD CONSTRAINT compatibility_rules_pkey PRIMARY KEY (id);


--
-- Name: compatibility_rules compatibility_rules_rule_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_rules
    ADD CONSTRAINT compatibility_rules_rule_name_key UNIQUE (rule_name);


--
-- Name: component_performance_tiers component_performance_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_performance_tiers
    ADD CONSTRAINT component_performance_tiers_pkey PRIMARY KEY (id);


--
-- Name: cooling_compatibility cooling_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cooling_compatibility
    ADD CONSTRAINT cooling_compatibility_pkey PRIMARY KEY (id);


--
-- Name: cooling cooling_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cooling
    ADD CONSTRAINT cooling_pkey PRIMARY KEY (id);


--
-- Name: cpu_compatibility cpu_compatibility_cpu_socket_motherboard_chipset_motherboar_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu_compatibility
    ADD CONSTRAINT cpu_compatibility_cpu_socket_motherboard_chipset_motherboar_key UNIQUE (cpu_socket, motherboard_chipset, motherboard_socket);


--
-- Name: cpu_compatibility cpu_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu_compatibility
    ADD CONSTRAINT cpu_compatibility_pkey PRIMARY KEY (id);


--
-- Name: cpu cpu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu
    ADD CONSTRAINT cpu_pkey PRIMARY KEY (id);


--
-- Name: deployment_config deployment_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_config
    ADD CONSTRAINT deployment_config_config_key_key UNIQUE (config_key);


--
-- Name: deployment_config deployment_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_config
    ADD CONSTRAINT deployment_config_pkey PRIMARY KEY (id);


--
-- Name: diagnostic_issues diagnostic_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnostic_issues
    ADD CONSTRAINT diagnostic_issues_pkey PRIMARY KEY (id);


--
-- Name: feedback_review_queue feedback_review_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_review_queue
    ADD CONSTRAINT feedback_review_queue_pkey PRIMARY KEY (id);


--
-- Name: feedback_submissions feedback_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_pkey PRIMARY KEY (id);


--
-- Name: feedback_votes feedback_votes_feedback_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_feedback_id_user_id_key UNIQUE (feedback_id, user_id);


--
-- Name: feedback_votes feedback_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_pkey PRIMARY KEY (id);


--
-- Name: gpu_compatibility gpu_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpu_compatibility
    ADD CONSTRAINT gpu_compatibility_pkey PRIMARY KEY (id);


--
-- Name: gpu gpu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpu
    ADD CONSTRAINT gpu_pkey PRIMARY KEY (id);


--
-- Name: headphones headphones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.headphones
    ADD CONSTRAINT headphones_pkey PRIMARY KEY (id);


--
-- Name: historical_builds historical_builds_build_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historical_builds
    ADD CONSTRAINT historical_builds_build_hash_key UNIQUE (build_hash);


--
-- Name: historical_builds historical_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historical_builds
    ADD CONSTRAINT historical_builds_pkey PRIMARY KEY (id);


--
-- Name: historical_patterns historical_patterns_pattern_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historical_patterns
    ADD CONSTRAINT historical_patterns_pattern_key_key UNIQUE (pattern_key);


--
-- Name: historical_patterns historical_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historical_patterns
    ADD CONSTRAINT historical_patterns_pkey PRIMARY KEY (id);


--
-- Name: ip_access_control ip_access_control_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_access_control
    ADD CONSTRAINT ip_access_control_ip_address_key UNIQUE (ip_address);


--
-- Name: ip_access_control ip_access_control_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_access_control
    ADD CONSTRAINT ip_access_control_pkey PRIMARY KEY (id);


--
-- Name: ip_logs ip_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_logs
    ADD CONSTRAINT ip_logs_pkey PRIMARY KEY (id);


--
-- Name: issue_verifications issue_verifications_issue_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_verifications
    ADD CONSTRAINT issue_verifications_issue_id_user_id_key UNIQUE (issue_id, user_id);


--
-- Name: issue_verifications issue_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_verifications
    ADD CONSTRAINT issue_verifications_pkey PRIMARY KEY (id);


--
-- Name: keyboard keyboard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyboard
    ADD CONSTRAINT keyboard_pkey PRIMARY KEY (id);


--
-- Name: kiosk_sessions kiosk_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kiosk_sessions
    ADD CONSTRAINT kiosk_sessions_pkey PRIMARY KEY (id);


--
-- Name: kiosk_sessions kiosk_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kiosk_sessions
    ADD CONSTRAINT kiosk_sessions_session_id_key UNIQUE (session_id);


--
-- Name: known_compatibility_issues known_compatibility_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.known_compatibility_issues
    ADD CONSTRAINT known_compatibility_issues_pkey PRIMARY KEY (id);


--
-- Name: known_issues known_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.known_issues
    ADD CONSTRAINT known_issues_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: monitor monitor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor
    ADD CONSTRAINT monitor_pkey PRIMARY KEY (id);


--
-- Name: _deprecated_monitors monitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._deprecated_monitors
    ADD CONSTRAINT monitors_pkey PRIMARY KEY (id);


--
-- Name: motherboard_compatibility motherboard_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motherboard_compatibility
    ADD CONSTRAINT motherboard_compatibility_pkey PRIMARY KEY (id);


--
-- Name: motherboard motherboard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motherboard
    ADD CONSTRAINT motherboard_pkey PRIMARY KEY (id);


--
-- Name: mouse mouse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mouse
    ADD CONSTRAINT mouse_pkey PRIMARY KEY (id);


--
-- Name: notification_queue notification_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_counters order_counters_counter_type_counter_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_counters
    ADD CONSTRAINT order_counters_counter_type_counter_period_key UNIQUE (counter_type, counter_period);


--
-- Name: order_counters order_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_counters
    ADD CONSTRAINT order_counters_pkey PRIMARY KEY (id);


--
-- Name: order_deduplication_log order_deduplication_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_deduplication_log
    ADD CONSTRAINT order_deduplication_log_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_locks order_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_locks
    ADD CONSTRAINT order_locks_pkey PRIMARY KEY (id);


--
-- Name: order_locks order_locks_session_id_cart_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_locks
    ADD CONSTRAINT order_locks_session_id_cart_hash_key UNIQUE (session_id, cart_hash);


--
-- Name: order_queue order_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_queue
    ADD CONSTRAINT order_queue_pkey PRIMARY KEY (id);


--
-- Name: order_queue order_queue_queue_number_queue_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_queue
    ADD CONSTRAINT order_queue_queue_number_queue_date_key UNIQUE (queue_number, queue_date);


--
-- Name: orders orders_order_id_formatted_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_id_formatted_key UNIQUE (order_id_formatted);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_transaction_id_formatted_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_transaction_id_formatted_key UNIQUE (transaction_id_formatted);


--
-- Name: package packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: password_history password_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_reset_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_reset_session_id_key UNIQUE (reset_session_id);


--
-- Name: payment payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: pc_case pc_case_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_case
    ADD CONSTRAINT pc_case_pkey PRIMARY KEY (id);


--
-- Name: pc_customized_ai_builds_metadata pc_customized_ai_builds_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_builds_metadata
    ADD CONSTRAINT pc_customized_ai_builds_metadata_pkey PRIMARY KEY (id);


--
-- Name: pc_customized_ai_builds pc_customized_ai_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_builds
    ADD CONSTRAINT pc_customized_ai_builds_pkey PRIMARY KEY (id);


--
-- Name: pc_customized_ai_builds pc_customized_ai_builds_usage_budget_tier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_builds
    ADD CONSTRAINT pc_customized_ai_builds_usage_budget_tier_key UNIQUE (usage, budget_tier);


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_build_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_build_key_key UNIQUE (build_key);


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_pkey PRIMARY KEY (id);


--
-- Name: pc_customized_budget_ranges pc_customized_budget_ranges_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_budget_ranges
    ADD CONSTRAINT pc_customized_budget_ranges_name_key UNIQUE (name);


--
-- Name: pc_customized_budget_ranges pc_customized_budget_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_budget_ranges
    ADD CONSTRAINT pc_customized_budget_ranges_pkey PRIMARY KEY (id);


--
-- Name: pc_customized_gaming_preferences pc_customized_gaming_preferences_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_gaming_preferences
    ADD CONSTRAINT pc_customized_gaming_preferences_name_key UNIQUE (name);


--
-- Name: pc_customized_gaming_preferences pc_customized_gaming_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_gaming_preferences
    ADD CONSTRAINT pc_customized_gaming_preferences_pkey PRIMARY KEY (id);


--
-- Name: pc_customized_performance_preferences pc_customized_performance_preferences_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_performance_preferences
    ADD CONSTRAINT pc_customized_performance_preferences_name_key UNIQUE (name);


--
-- Name: pc_customized_performance_preferences pc_customized_performance_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_performance_preferences
    ADD CONSTRAINT pc_customized_performance_preferences_pkey PRIMARY KEY (id);


--
-- Name: pc_customized_usage_types pc_customized_usage_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_usage_types
    ADD CONSTRAINT pc_customized_usage_types_name_key UNIQUE (name);


--
-- Name: pc_customized_usage_types pc_customized_usage_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_usage_types
    ADD CONSTRAINT pc_customized_usage_types_pkey PRIMARY KEY (id);


--
-- Name: pc_parts pc_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_parts
    ADD CONSTRAINT pc_parts_pkey PRIMARY KEY (id);


--
-- Name: pc_services pc_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_services
    ADD CONSTRAINT pc_services_pkey PRIMARY KEY (id);


--
-- Name: pc_upgrade_budget_ranges pc_upgrade_budget_ranges_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_budget_ranges
    ADD CONSTRAINT pc_upgrade_budget_ranges_name_key UNIQUE (name);


--
-- Name: pc_upgrade_budget_ranges pc_upgrade_budget_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_budget_ranges
    ADD CONSTRAINT pc_upgrade_budget_ranges_pkey PRIMARY KEY (id);


--
-- Name: pc_upgrade_new_products pc_upgrade_new_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_new_products
    ADD CONSTRAINT pc_upgrade_new_products_pkey PRIMARY KEY (id);


--
-- Name: pc_upgrade_new_products pc_upgrade_new_products_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_new_products
    ADD CONSTRAINT pc_upgrade_new_products_product_id_key UNIQUE (product_id);


--
-- Name: pc_upgrade_reference_builds_metadata pc_upgrade_reference_builds_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_reference_builds_metadata
    ADD CONSTRAINT pc_upgrade_reference_builds_metadata_pkey PRIMARY KEY (id);


--
-- Name: pc_upgrade_reference_builds pc_upgrade_reference_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_reference_builds
    ADD CONSTRAINT pc_upgrade_reference_builds_pkey PRIMARY KEY (id);


--
-- Name: pc_upgrade_usage_types pc_upgrade_usage_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_usage_types
    ADD CONSTRAINT pc_upgrade_usage_types_name_key UNIQUE (name);


--
-- Name: pc_upgrade_usage_types pc_upgrade_usage_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_usage_types
    ADD CONSTRAINT pc_upgrade_usage_types_pkey PRIMARY KEY (id);


--
-- Name: pc_upgrade_year_ranges pc_upgrade_year_ranges_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_year_ranges
    ADD CONSTRAINT pc_upgrade_year_ranges_name_key UNIQUE (name);


--
-- Name: pc_upgrade_year_ranges pc_upgrade_year_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_year_ranges
    ADD CONSTRAINT pc_upgrade_year_ranges_pkey PRIMARY KEY (id);


--
-- Name: pending_orders pending_orders_order_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_orders
    ADD CONSTRAINT pending_orders_order_hash_key UNIQUE (order_hash);


--
-- Name: pending_orders pending_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_orders
    ADD CONSTRAINT pending_orders_pkey PRIMARY KEY (id);


--
-- Name: performancestats performancestats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performancestats
    ADD CONSTRAINT performancestats_pkey PRIMARY KEY (stat_id);


--
-- Name: pre_built_pc_history pre_built_pc_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_built_pc_history
    ADD CONSTRAINT pre_built_pc_history_pkey PRIMARY KEY (id);


--
-- Name: prebuilt_components prebuilt_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prebuilt_components
    ADD CONSTRAINT prebuilt_components_pkey PRIMARY KEY (id);


--
-- Name: prebuilt_pcs prebuilt_pcs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prebuilt_pcs
    ADD CONSTRAINT prebuilt_pcs_pkey PRIMARY KEY (id);


--
-- Name: price_alerts price_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: product_comparisons product_comparisons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_comparisons
    ADD CONSTRAINT product_comparisons_pkey PRIMARY KEY (id);


--
-- Name: product_specs product_specs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_specs
    ADD CONSTRAINT product_specs_pkey PRIMARY KEY (product_id);


--
-- Name: psu_compatibility psu_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psu_compatibility
    ADD CONSTRAINT psu_compatibility_pkey PRIMARY KEY (id);


--
-- Name: psu psu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psu
    ADD CONSTRAINT psu_pkey PRIMARY KEY (id);


--
-- Name: queue_cycles queue_cycles_cycle_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_cycles
    ADD CONSTRAINT queue_cycles_cycle_number_key UNIQUE (cycle_number);


--
-- Name: queue_cycles queue_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_cycles
    ADD CONSTRAINT queue_cycles_pkey PRIMARY KEY (id);


--
-- Name: queue_management queue_management_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_management
    ADD CONSTRAINT queue_management_pkey PRIMARY KEY (id);


--
-- Name: queue_management queue_management_queue_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_management
    ADD CONSTRAINT queue_management_queue_number_key UNIQUE (queue_number);


--
-- Name: queue queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_pkey PRIMARY KEY (queue_id);


--
-- Name: ram_compatibility ram_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ram_compatibility
    ADD CONSTRAINT ram_compatibility_pkey PRIMARY KEY (id);


--
-- Name: ram ram_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ram
    ADD CONSTRAINT ram_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_key_key UNIQUE (key);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: reference_builds reference_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_builds
    ADD CONSTRAINT reference_builds_pkey PRIMARY KEY (id);


--
-- Name: rule_ab_test_results rule_ab_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_test_results
    ADD CONSTRAINT rule_ab_test_results_pkey PRIMARY KEY (id);


--
-- Name: rule_ab_tests rule_ab_tests_experiment_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_tests
    ADD CONSTRAINT rule_ab_tests_experiment_name_key UNIQUE (experiment_name);


--
-- Name: rule_ab_tests rule_ab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_tests
    ADD CONSTRAINT rule_ab_tests_pkey PRIMARY KEY (id);


--
-- Name: rule_effectiveness_metrics rule_effectiveness_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_effectiveness_metrics
    ADD CONSTRAINT rule_effectiveness_metrics_pkey PRIMARY KEY (id);


--
-- Name: rule_effectiveness_metrics rule_effectiveness_metrics_rule_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_effectiveness_metrics
    ADD CONSTRAINT rule_effectiveness_metrics_rule_id_date_key UNIQUE (rule_id, date);


--
-- Name: rule_version_history rule_version_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_version_history
    ADD CONSTRAINT rule_version_history_pkey PRIMARY KEY (id);


--
-- Name: rule_version_history rule_version_history_rule_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_version_history
    ADD CONSTRAINT rule_version_history_rule_id_version_key UNIQUE (rule_id, version);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: speakers speakers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_pkey PRIMARY KEY (id);


--
-- Name: specification_schemas specification_schemas_category_field_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specification_schemas
    ADD CONSTRAINT specification_schemas_category_field_name_key UNIQUE (category, field_name);


--
-- Name: specification_schemas specification_schemas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specification_schemas
    ADD CONSTRAINT specification_schemas_pkey PRIMARY KEY (id);


--
-- Name: stock_categories stock_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_categories
    ADD CONSTRAINT stock_categories_pkey PRIMARY KEY (id);


--
-- Name: stock_categories stock_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_categories
    ADD CONSTRAINT stock_categories_slug_key UNIQUE (slug);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: storage_compatibility storage_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_compatibility
    ADD CONSTRAINT storage_compatibility_pkey PRIMARY KEY (id);


--
-- Name: storage storage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage
    ADD CONSTRAINT storage_pkey PRIMARY KEY (id);


--
-- Name: successful_builds successful_builds_build_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_build_hash_key UNIQUE (build_hash);


--
-- Name: successful_builds successful_builds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_pkey PRIMARY KEY (id);


--
-- Name: system_monitoring system_monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_monitoring
    ADD CONSTRAINT system_monitoring_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: thermal_compatibility thermal_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thermal_compatibility
    ADD CONSTRAINT thermal_compatibility_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_transaction_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_transaction_number_key UNIQUE (transaction_number);


--
-- Name: price_alerts unique_active_alert; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT unique_active_alert UNIQUE (user_id, product_id, is_active);


--
-- Name: upgrade_paths upgrade_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upgrade_paths
    ADD CONSTRAINT upgrade_paths_pkey PRIMARY KEY (id);


--
-- Name: user_compatibility_reports user_compatibility_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_compatibility_reports
    ADD CONSTRAINT user_compatibility_reports_pkey PRIMARY KEY (id);


--
-- Name: user_personas user_personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_personas
    ADD CONSTRAINT user_personas_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_refresh_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_refresh_token_key UNIQUE (refresh_token);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: user_virtual_build user_virtual_build_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_virtual_build
    ADD CONSTRAINT user_virtual_build_pkey PRIMARY KEY (id);


--
-- Name: _deprecated_user users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._deprecated_user
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- Name: _deprecated_user users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._deprecated_user
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey1 PRIMARY KEY (id);


--
-- Name: users users_reference_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_reference_email_key UNIQUE (reference_email);


--
-- Name: webcam webcam_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webcam
    ADD CONSTRAINT webcam_pkey PRIMARY KEY (id);


--
-- Name: _deprecated_webcams webcams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._deprecated_webcams
    ADD CONSTRAINT webcams_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_builds_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_builds_active ON public.pc_customized_ai_builds USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_ai_cache_accessed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_cache_accessed ON public.ai_cache USING btree (last_accessed DESC);


--
-- Name: idx_ai_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_cache_expires ON public.ai_cache USING btree (expires_at);


--
-- Name: idx_ai_cache_scenario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_cache_scenario ON public.ai_cache USING btree (scenario);


--
-- Name: idx_ai_compat_base; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_compat_base ON public.ai_compatibility_recommendations USING btree (base_component_id, base_component_category);


--
-- Name: idx_ai_compat_recommended; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_compat_recommended ON public.ai_compatibility_recommendations USING btree (recommended_component_id);


--
-- Name: idx_ai_compat_tier_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_compat_tier_match ON public.ai_compatibility_recommendations USING btree (base_component_tier, recommended_component_tier);


--
-- Name: idx_ai_corrections_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_corrections_admin ON public.ai_corrections USING btree (admin_user_id);


--
-- Name: idx_ai_corrections_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_corrections_created ON public.ai_corrections USING btree (created_at DESC);


--
-- Name: idx_ai_corrections_suggestion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_corrections_suggestion_id ON public.ai_corrections USING btree (suggestion_id);


--
-- Name: idx_ai_corrections_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_corrections_type ON public.ai_corrections USING btree (suggestion_type);


--
-- Name: idx_ai_experiments_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_experiments_active ON public.ai_experiment_variants USING btree (is_active);


--
-- Name: idx_ai_experiments_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_experiments_id ON public.ai_experiment_variants USING btree (experiment_id);


--
-- Name: idx_ai_experiments_winner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_experiments_winner ON public.ai_experiment_variants USING btree (is_winner);


--
-- Name: idx_ai_feedback_accurate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_feedback_accurate ON public.ai_feedback USING btree (accurate);


--
-- Name: idx_ai_feedback_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_feedback_category ON public.ai_feedback USING btree (category);


--
-- Name: idx_ai_feedback_recommendation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_feedback_recommendation ON public.ai_feedback USING btree (recommendation_id);


--
-- Name: idx_ai_feedback_reviewed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_feedback_reviewed ON public.ai_feedback USING btree (reviewed_at DESC);


--
-- Name: idx_ai_learning_patterns_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_learning_patterns_confidence ON public.ai_learning_patterns USING btree (confidence_score DESC);


--
-- Name: idx_ai_learning_patterns_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_learning_patterns_type ON public.ai_learning_patterns USING btree (pattern_type);


--
-- Name: idx_ai_logs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_logs_date ON public.ai_logs USING btree (created_at DESC);


--
-- Name: idx_ai_logs_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_logs_endpoint ON public.ai_logs USING btree (endpoint);


--
-- Name: idx_ai_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_logs_user ON public.ai_logs USING btree (user_id);


--
-- Name: idx_ai_metrics_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_date ON public.ai_metrics USING btree (metric_date DESC);


--
-- Name: idx_ai_metrics_scenario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_scenario ON public.ai_metrics USING btree (scenario);


--
-- Name: idx_ai_pending_reviews_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_pending_reviews_assigned ON public.ai_pending_reviews USING btree (assigned_to);


--
-- Name: idx_ai_pending_reviews_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_pending_reviews_priority ON public.ai_pending_reviews USING btree (priority DESC);


--
-- Name: idx_ai_pending_reviews_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_pending_reviews_status ON public.ai_pending_reviews USING btree (status);


--
-- Name: idx_ai_recommendations_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_recommendations_confidence ON public.ai_recommendations USING btree (confidence DESC);


--
-- Name: idx_ai_recommendations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_recommendations_created ON public.ai_recommendations USING btree (created_at DESC);


--
-- Name: idx_ai_recommendations_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_recommendations_hash ON public.ai_recommendations USING btree (request_hash);


--
-- Name: idx_ai_recommendations_scenario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_recommendations_scenario ON public.ai_recommendations USING btree (scenario);


--
-- Name: idx_ai_recommendations_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_recommendations_source ON public.ai_recommendations USING btree (source);


--
-- Name: idx_ai_training_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_training_date ON public.ai_training_data USING btree (created_at DESC);


--
-- Name: idx_ai_training_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_training_score ON public.ai_training_data USING btree (feedback_score);


--
-- Name: idx_ai_training_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_training_user ON public.ai_training_data USING btree (user_id);


--
-- Name: idx_assistance_requests_kiosk_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assistance_requests_kiosk_id ON public.assistance_requests USING btree (kiosk_id);


--
-- Name: idx_assistance_requests_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assistance_requests_requested_at ON public.assistance_requests USING btree (requested_at DESC);


--
-- Name: idx_assistance_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assistance_requests_status ON public.assistance_requests USING btree (status);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_date_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_date_action ON public.audit_logs USING btree (created_at, action);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity);


--
-- Name: idx_audit_logs_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_ip_address ON public.audit_logs USING btree (ip_address);


--
-- Name: idx_audit_logs_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_role ON public.audit_logs USING btree (role);


--
-- Name: idx_audit_logs_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_severity ON public.audit_logs USING btree (severity);


--
-- Name: idx_audit_logs_table_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_table_name ON public.audit_logs USING btree (table_name);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_audit_logs_user_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_action ON public.audit_logs USING btree (user_id, action);


--
-- Name: idx_audit_logs_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_created ON public.audit_logs USING btree (user_id, created_at);


--
-- Name: idx_bios_compat_chipset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bios_compat_chipset ON public.bios_compatibility USING btree (chipset);


--
-- Name: idx_bios_compat_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bios_compat_composite ON public.bios_compatibility USING btree (chipset, cpu_generation);


--
-- Name: idx_bios_compat_cpu_gen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bios_compat_cpu_gen ON public.bios_compatibility USING btree (cpu_generation);


--
-- Name: idx_bios_compat_motherboard; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bios_compat_motherboard ON public.bios_compatibility USING btree (motherboard_model);


--
-- Name: idx_budget_ranges_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_ranges_active ON public.pc_upgrade_budget_ranges USING btree (is_active, sort_order);


--
-- Name: idx_build_history_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_history_created ON public.build_history USING btree (created_at DESC);


--
-- Name: idx_build_history_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_history_price ON public.build_history USING btree (total_price) WHERE (is_public = true);


--
-- Name: idx_build_history_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_history_public ON public.build_history USING btree (is_public, created_at DESC) WHERE (is_public = true);


--
-- Name: idx_build_history_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_history_score ON public.build_history USING btree (compatibility_score DESC) WHERE (is_public = true);


--
-- Name: idx_build_history_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_history_session ON public.build_history USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_build_history_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_history_tags ON public.build_history USING gin (tags);


--
-- Name: idx_build_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_history_user ON public.build_history USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_build_patterns_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_patterns_count ON public.build_patterns USING btree (build_count DESC);


--
-- Name: idx_build_patterns_satisfaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_patterns_satisfaction ON public.build_patterns USING btree (avg_satisfaction DESC);


--
-- Name: idx_build_patterns_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_build_patterns_type ON public.build_patterns USING btree (build_type);


--
-- Name: idx_case_compat_cooler_clearance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_compat_cooler_clearance ON public.case_compatibility USING btree (max_cpu_cooler_height_mm);


--
-- Name: idx_case_compat_form_factor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_compat_form_factor ON public.case_compatibility USING btree (form_factor);


--
-- Name: idx_case_compat_gpu_clearance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_compat_gpu_clearance ON public.case_compatibility USING btree (max_gpu_length_mm);


--
-- Name: idx_case_form_factor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_form_factor ON public.pc_case USING btree (form_factor);


--
-- Name: idx_case_form_factor_support; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_form_factor_support ON public.pc_case USING btree (form_factor_support);


--
-- Name: idx_case_max_gpu_length; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_max_gpu_length ON public.pc_case USING btree (max_gpu_length) WHERE (max_gpu_length IS NOT NULL);


--
-- Name: idx_case_psu_support; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_psu_support ON public.pc_case USING btree (psu_form_factor_support);


--
-- Name: idx_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_active ON public.categories USING btree (is_active);


--
-- Name: idx_compat_matrix_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_matrix_score ON public.compatibility_matrix USING btree (compatibility_score DESC);


--
-- Name: INDEX idx_compat_matrix_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_compat_matrix_score IS 'Index for score-based sorting';


--
-- Name: idx_compat_matrix_warnings_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_matrix_warnings_gin ON public.compatibility_matrix USING gin (warnings);


--
-- Name: idx_compat_rules_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_rules_category ON public.compatibility_rules USING btree (rule_category);


--
-- Name: idx_compat_rules_category_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_rules_category_severity ON public.compatibility_rules USING btree (rule_category, severity) WHERE (enabled = true);


--
-- Name: idx_compat_rules_comp_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_rules_comp_a ON public.compatibility_rules USING btree (component_a_category);


--
-- Name: idx_compat_rules_comp_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_rules_comp_b ON public.compatibility_rules USING btree (component_b_category);


--
-- Name: idx_compat_rules_components_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_rules_components_enabled ON public.compatibility_rules USING btree (component_a_category, component_b_category, enabled) WHERE (enabled = true);


--
-- Name: idx_compat_rules_components_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_rules_components_type ON public.compatibility_rules USING btree (component_a_category, component_b_category, rule_type) WHERE (enabled = true);


--
-- Name: idx_compat_rules_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_rules_enabled ON public.compatibility_rules USING btree (enabled);


--
-- Name: idx_compat_rules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compat_rules_type ON public.compatibility_rules USING btree (rule_type);


--
-- Name: idx_compatibility_cache_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_cache_created ON public.compatibility_cache USING btree (created_at DESC);


--
-- Name: idx_compatibility_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_cache_expires ON public.compatibility_cache USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_compatibility_cache_hit_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_cache_hit_count ON public.compatibility_cache USING btree (hit_count DESC);


--
-- Name: idx_compatibility_cache_hits; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_cache_hits ON public.compatibility_cache USING btree (hit_count DESC) WHERE (hit_count > 0);


--
-- Name: idx_compatibility_logs_build_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_logs_build_hash ON public.compatibility_logs USING btree (build_hash);


--
-- Name: idx_compatibility_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_logs_created ON public.compatibility_logs USING btree (created_at DESC);


--
-- Name: idx_compatibility_logs_parts_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_logs_parts_gin ON public.compatibility_logs USING gin (parts_json);


--
-- Name: idx_compatibility_logs_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_logs_session_id ON public.compatibility_logs USING btree (session_id);


--
-- Name: idx_compatibility_rules_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_rules_category ON public.compatibility_rules_confidence USING btree (rule_category);


--
-- Name: idx_compatibility_rules_components; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_rules_components ON public.compatibility_rules USING btree (component_a_category, component_b_category);


--
-- Name: idx_compatibility_rules_confidence_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_rules_confidence_score ON public.compatibility_rules_confidence USING btree (adjusted_confidence DESC);


--
-- Name: idx_compatibility_rules_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_rules_enabled ON public.compatibility_rules USING btree (enabled) WHERE (enabled = true);


--
-- Name: idx_compatibility_rules_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compatibility_rules_priority ON public.compatibility_rules USING btree (priority DESC);


--
-- Name: idx_cooling_compat_height; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cooling_compat_height ON public.cooling_compatibility USING btree (cooler_height_mm);


--
-- Name: idx_cooling_compat_tdp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cooling_compat_tdp ON public.cooling_compatibility USING btree (tdp_rating);


--
-- Name: idx_cooling_compat_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cooling_compat_type ON public.cooling_compatibility USING btree (cooler_type);


--
-- Name: idx_cooling_compatible_sockets; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cooling_compatible_sockets ON public.cooling USING gin (compatible_sockets);


--
-- Name: idx_cooling_cooler_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cooling_cooler_type ON public.cooling USING btree (cooler_type);


--
-- Name: idx_cooling_height; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cooling_height ON public.cooling USING btree (height) WHERE (height IS NOT NULL);


--
-- Name: idx_cooling_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cooling_name ON public.cooling USING btree (name);


--
-- Name: idx_cooling_tdp_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cooling_tdp_rating ON public.cooling USING btree (tdp_rating) WHERE (tdp_rating IS NOT NULL);


--
-- Name: idx_cooling_water_cooled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cooling_water_cooled ON public.cooling USING btree (water_cooled);


--
-- Name: idx_cpu_compat_chipset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpu_compat_chipset ON public.cpu_compatibility USING btree (motherboard_chipset);


--
-- Name: idx_cpu_compat_compatible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpu_compat_compatible ON public.cpu_compatibility USING btree (compatible) WHERE (compatible = true);


--
-- Name: idx_cpu_compat_socket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpu_compat_socket ON public.cpu_compatibility USING btree (cpu_socket);


--
-- Name: idx_cpu_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpu_name ON public.cpu USING btree (name);


--
-- Name: idx_cpu_socket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpu_socket ON public.cpu USING btree (socket);


--
-- Name: idx_cpu_socket_generation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpu_socket_generation ON public.cpu USING btree (socket, generation) WHERE (socket IS NOT NULL);


--
-- Name: idx_cpu_tdp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpu_tdp ON public.cpu USING btree (tdp) WHERE (tdp IS NOT NULL);


--
-- Name: idx_diagnostic_issues_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diagnostic_issues_active ON public.diagnostic_issues USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_diagnostic_issues_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diagnostic_issues_category ON public.diagnostic_issues USING btree (category);


--
-- Name: idx_diagnostic_issues_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diagnostic_issues_severity ON public.diagnostic_issues USING btree (severity);


--
-- Name: idx_feedback_review_queue_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_review_queue_assigned ON public.feedback_review_queue USING btree (assigned_to);


--
-- Name: idx_feedback_review_queue_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_review_queue_priority ON public.feedback_review_queue USING btree (priority);


--
-- Name: idx_feedback_review_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_review_queue_status ON public.feedback_review_queue USING btree (status);


--
-- Name: idx_feedback_submissions_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_submissions_component ON public.feedback_submissions USING btree (component_id);


--
-- Name: idx_feedback_submissions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_submissions_created ON public.feedback_submissions USING btree (created_at DESC);


--
-- Name: idx_feedback_submissions_issue_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_submissions_issue_type ON public.feedback_submissions USING btree (issue_type);


--
-- Name: idx_feedback_submissions_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_submissions_severity ON public.feedback_submissions USING btree (severity);


--
-- Name: idx_feedback_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_submissions_status ON public.feedback_submissions USING btree (status);


--
-- Name: idx_feedback_submissions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_submissions_user ON public.feedback_submissions USING btree (user_id);


--
-- Name: idx_feedback_votes_feedback; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_votes_feedback ON public.feedback_votes USING btree (feedback_id);


--
-- Name: idx_feedback_votes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_votes_user ON public.feedback_votes USING btree (user_id);


--
-- Name: idx_gpu_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpu_brand ON public.gpu USING btree (brand);


--
-- Name: idx_gpu_compat_length; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpu_compat_length ON public.gpu_compatibility USING btree (gpu_length_mm);


--
-- Name: idx_gpu_compat_power; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpu_compat_power ON public.gpu_compatibility USING btree (min_psu_wattage);


--
-- Name: idx_gpu_compat_slots; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpu_compat_slots ON public.gpu_compatibility USING btree (gpu_slots);


--
-- Name: idx_gpu_compat_tdp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpu_compat_tdp ON public.gpu_compatibility USING btree (tdp);


--
-- Name: idx_gpu_length; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpu_length ON public.gpu USING btree (length);


--
-- Name: idx_gpu_memory_capacity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpu_memory_capacity ON public.gpu USING btree (memory_capacity) WHERE (memory_capacity IS NOT NULL);


--
-- Name: idx_gpu_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpu_name ON public.gpu USING btree (name);


--
-- Name: idx_gpu_tdp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gpu_tdp ON public.gpu USING btree (tdp);


--
-- Name: idx_headphones_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_headphones_name ON public.headphones USING btree (name);


--
-- Name: idx_historical_builds_bottleneck; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_builds_bottleneck ON public.historical_builds USING btree (bottleneck_type);


--
-- Name: idx_historical_builds_cpu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_builds_cpu ON public.historical_builds USING btree (cpu_id);


--
-- Name: idx_historical_builds_cpu_gpu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_builds_cpu_gpu ON public.historical_builds USING btree (cpu_id, gpu_id);


--
-- Name: idx_historical_builds_gpu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_builds_gpu ON public.historical_builds USING btree (gpu_id);


--
-- Name: idx_historical_builds_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_builds_price ON public.historical_builds USING btree (total_price);


--
-- Name: idx_historical_builds_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_builds_tier ON public.historical_builds USING btree (performance_tier);


--
-- Name: idx_historical_patterns_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_patterns_active ON public.historical_patterns USING btree (is_active);


--
-- Name: idx_historical_patterns_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_patterns_category ON public.historical_patterns USING btree (category);


--
-- Name: idx_historical_patterns_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_patterns_confidence ON public.historical_patterns USING btree (confidence DESC);


--
-- Name: idx_historical_patterns_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_patterns_data ON public.historical_patterns USING gin (pattern_data);


--
-- Name: idx_historical_patterns_occurrence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_patterns_occurrence ON public.historical_patterns USING btree (occurrence_count DESC);


--
-- Name: idx_historical_patterns_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historical_patterns_type ON public.historical_patterns USING btree (pattern_type);


--
-- Name: idx_ip_access_first_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_access_first_seen ON public.ip_access_control USING btree (first_seen DESC);


--
-- Name: idx_ip_access_last_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_access_last_seen ON public.ip_access_control USING btree (last_seen DESC);


--
-- Name: idx_ip_access_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_access_status ON public.ip_access_control USING btree (status);


--
-- Name: idx_issue_templates_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_templates_category ON public.compatibility_issue_templates USING btree (issue_category);


--
-- Name: idx_issue_templates_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_templates_severity ON public.compatibility_issue_templates USING btree (severity);


--
-- Name: idx_issue_verifications_issue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_verifications_issue ON public.issue_verifications USING btree (issue_id);


--
-- Name: idx_issue_verifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_verifications_user ON public.issue_verifications USING btree (user_id);


--
-- Name: idx_keyboard_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyboard_name ON public.keyboard USING btree (name);


--
-- Name: idx_kiosk_sessions_cart_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kiosk_sessions_cart_hash ON public.kiosk_sessions USING btree (cart_hash);


--
-- Name: idx_kiosk_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kiosk_sessions_expires_at ON public.kiosk_sessions USING btree (expires_at);


--
-- Name: idx_kiosk_sessions_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kiosk_sessions_last_activity ON public.kiosk_sessions USING btree (last_activity);


--
-- Name: idx_kiosk_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kiosk_sessions_status ON public.kiosk_sessions USING btree (status);


--
-- Name: idx_kiosk_sessions_tablet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kiosk_sessions_tablet_id ON public.kiosk_sessions USING btree (tablet_id);


--
-- Name: idx_known_issues_component1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_known_issues_component1 ON public.known_issues USING btree (component1_id);


--
-- Name: idx_known_issues_component2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_known_issues_component2 ON public.known_issues USING btree (component2_id);


--
-- Name: idx_known_issues_parts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_known_issues_parts ON public.known_compatibility_issues USING gin (affected_parts);


--
-- Name: idx_known_issues_reported; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_known_issues_reported ON public.known_compatibility_issues USING btree (reported_count DESC);


--
-- Name: idx_known_issues_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_known_issues_resolved ON public.known_compatibility_issues USING btree (is_resolved) WHERE (is_resolved = false);


--
-- Name: idx_known_issues_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_known_issues_severity ON public.known_compatibility_issues USING btree (severity);


--
-- Name: idx_known_issues_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_known_issues_status ON public.known_issues USING btree (status);


--
-- Name: idx_known_issues_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_known_issues_verified ON public.known_issues USING btree (verified);


--
-- Name: idx_mb_compat_chipset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mb_compat_chipset ON public.motherboard_compatibility USING btree (chipset);


--
-- Name: idx_mb_compat_form_factor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mb_compat_form_factor ON public.motherboard_compatibility USING btree (form_factor);


--
-- Name: idx_mb_compat_socket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mb_compat_socket ON public.motherboard_compatibility USING btree (socket);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (from_user_id, to_user_id, created_at);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);


--
-- Name: idx_messages_from_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_from_user ON public.messages USING btree (from_user_id);


--
-- Name: idx_messages_to_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_to_user ON public.messages USING btree (to_user_id);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (to_user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_monitors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monitors_name ON public._deprecated_monitors USING btree (name);


--
-- Name: idx_motherboard_chipset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_motherboard_chipset ON public.motherboard USING btree (chipset) WHERE (chipset IS NOT NULL);


--
-- Name: idx_motherboard_form_factor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_motherboard_form_factor ON public.motherboard USING btree (form_factor);


--
-- Name: idx_motherboard_memory_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_motherboard_memory_type ON public.motherboard USING btree (memory_type);


--
-- Name: idx_motherboard_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_motherboard_name ON public.motherboard USING btree (name);


--
-- Name: idx_motherboard_socket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_motherboard_socket ON public.motherboard USING btree (socket);


--
-- Name: idx_motherboard_socket_memory; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_motherboard_socket_memory ON public.motherboard USING btree (socket, memory_type) WHERE ((socket IS NOT NULL) AND (memory_type IS NOT NULL));


--
-- Name: idx_mouse_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mouse_name ON public.mouse USING btree (name);


--
-- Name: idx_new_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_new_products_category ON public.pc_upgrade_new_products USING btree (category);


--
-- Name: idx_new_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_new_products_status ON public.pc_upgrade_new_products USING btree (status, detected_at);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_order_dedup_cart_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_dedup_cart_hash ON public.order_deduplication_log USING btree (cart_hash);


--
-- Name: idx_order_dedup_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_dedup_session_id ON public.order_deduplication_log USING btree (session_id);


--
-- Name: idx_order_dedup_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_dedup_timestamp ON public.order_deduplication_log USING btree (attempt_timestamp);


--
-- Name: idx_order_items_description; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_description ON public.order_items USING btree (description);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_locks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_locks_expires ON public.order_locks USING btree (expires_at);


--
-- Name: idx_order_locks_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_locks_session ON public.order_locks USING btree (session_id);


--
-- Name: idx_order_locks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_locks_status ON public.order_locks USING btree (status);


--
-- Name: idx_order_queue_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_queue_date ON public.order_queue USING btree (queue_date);


--
-- Name: idx_order_queue_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_queue_order ON public.order_queue USING btree (order_id);


--
-- Name: idx_order_queue_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_queue_priority ON public.order_queue USING btree (priority DESC);


--
-- Name: idx_order_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_queue_status ON public.order_queue USING btree (status);


--
-- Name: idx_orders_assisted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_assisted_by ON public.orders USING btree (assisted_by);


--
-- Name: idx_orders_cancelled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_cancelled_at ON public.orders USING btree (cancelled_at) WHERE (cancelled_at IS NOT NULL);


--
-- Name: idx_orders_cancelled_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_cancelled_by ON public.orders USING btree (cancelled_by) WHERE (cancelled_by IS NOT NULL);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_customer_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_email ON public.orders USING btree (customer_email);


--
-- Name: idx_orders_date_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_date_status ON public.orders USING btree (created_at DESC, status);


--
-- Name: idx_orders_duplicate_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_duplicate_hash ON public.orders USING btree (duplicate_check_hash);


--
-- Name: idx_orders_serving; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_serving ON public.orders USING btree (is_now_serving, serving_position) WHERE (is_now_serving = true);


--
-- Name: idx_orders_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_session_id ON public.orders USING btree (session_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_status_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status_active ON public.orders USING btree (status) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'confirmed'::character varying])::text[]));


--
-- Name: idx_orders_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status_created ON public.orders USING btree (status, created_at DESC);


--
-- Name: idx_password_resets_code_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_resets_code_hash ON public.password_resets USING btree (code_hash);


--
-- Name: idx_password_resets_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_resets_expires_at ON public.password_resets USING btree (expires_at);


--
-- Name: idx_password_resets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_resets_status ON public.password_resets USING btree (status);


--
-- Name: idx_password_resets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_resets_user_id ON public.password_resets USING btree (user_id);


--
-- Name: idx_password_resets_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_resets_user_status ON public.password_resets USING btree (user_id, status);


--
-- Name: idx_pc_case_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_case_name ON public.pc_case USING btree (name);


--
-- Name: idx_pc_customized_builds_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_customized_builds_active ON public.pc_customized_ai_reference_builds USING btree (is_active);


--
-- Name: idx_pc_customized_builds_budget; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_customized_builds_budget ON public.pc_customized_ai_reference_builds USING btree (budget_range);


--
-- Name: idx_pc_customized_builds_performance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_customized_builds_performance ON public.pc_customized_ai_reference_builds USING btree (performance_preference);


--
-- Name: idx_pc_customized_builds_usage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_customized_builds_usage ON public.pc_customized_ai_reference_builds USING btree (usage_type);


--
-- Name: idx_pc_parts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_active ON public.pc_parts USING btree (is_active);


--
-- Name: idx_pc_parts_approval_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_approval_status ON public.pc_parts USING btree (((specifications ->> 'approvalStatus'::text))) WHERE (((category)::text = 'Pre-Built'::text) AND ((specifications ->> 'buildSource'::text) = 'community'::text));


--
-- Name: idx_pc_parts_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_brand ON public.pc_parts USING btree (brand);


--
-- Name: idx_pc_parts_brand_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_brand_active ON public.pc_parts USING btree (brand, is_active) WHERE (is_active = true);


--
-- Name: idx_pc_parts_brand_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_brand_category ON public.pc_parts USING btree (brand, category) WHERE (is_active = true);


--
-- Name: idx_pc_parts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category ON public.pc_parts USING btree (category);


--
-- Name: idx_pc_parts_category_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category_active ON public.pc_parts USING btree (category, is_active);


--
-- Name: idx_pc_parts_category_active_stock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category_active_stock ON public.pc_parts USING btree (category, is_active, stock) WHERE ((is_active = true) AND (stock > 0));


--
-- Name: idx_pc_parts_category_active_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category_active_visible ON public.pc_parts USING btree (category, is_active, kiosk_visible) WHERE (is_active = true);


--
-- Name: idx_pc_parts_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category_id ON public.pc_parts USING btree (category, id);


--
-- Name: idx_pc_parts_category_prebuilt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category_prebuilt ON public.pc_parts USING btree (category) WHERE ((category)::text = 'Pre-Built'::text);


--
-- Name: idx_pc_parts_category_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category_price ON public.pc_parts USING btree (category, price) WHERE (is_active = true);


--
-- Name: idx_pc_parts_category_socket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category_socket ON public.pc_parts USING btree (category, ((specifications ->> 'socket'::text))) WHERE (((specifications ->> 'socket'::text) IS NOT NULL) AND (is_active = true));


--
-- Name: idx_pc_parts_category_status_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category_status_id ON public.pc_parts USING btree (category, is_active, id) WHERE (is_active = true);


--
-- Name: idx_pc_parts_category_stock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_category_stock ON public.pc_parts USING btree (category, stock) WHERE (is_active = true);


--
-- Name: idx_pc_parts_community_builds; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_community_builds ON public.pc_parts USING btree (category, ((specifications ->> 'buildSource'::text))) WHERE (((category)::text = 'Pre-Built'::text) AND ((specifications ->> 'buildSource'::text) = 'community'::text));


--
-- Name: idx_pc_parts_compatible_sockets; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_compatible_sockets ON public.pc_parts USING gin (compatible_sockets);


--
-- Name: idx_pc_parts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_created_at ON public.pc_parts USING btree (created_at);


--
-- Name: idx_pc_parts_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_is_active ON public.pc_parts USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_pc_parts_kiosk_category_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_kiosk_category_order ON public.pc_parts USING btree (kiosk_category_order);


--
-- Name: idx_pc_parts_kiosk_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_kiosk_visible ON public.pc_parts USING btree (kiosk_visible) WHERE (kiosk_visible = true);


--
-- Name: idx_pc_parts_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_name ON public.pc_parts USING btree (name);


--
-- Name: idx_pc_parts_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_name_trgm ON public.pc_parts USING gin (name public.gin_trgm_ops);


--
-- Name: INDEX idx_pc_parts_name_trgm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_pc_parts_name_trgm IS 'Trigram index for fast name search queries';


--
-- Name: idx_pc_parts_on_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_on_sale ON public.pc_parts USING btree (on_sale) WHERE (on_sale = true);


--
-- Name: idx_pc_parts_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_price ON public.pc_parts USING btree (price);


--
-- Name: INDEX idx_pc_parts_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_pc_parts_price IS 'Index for price-based sorting and filtering';


--
-- Name: idx_pc_parts_price_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_price_active ON public.pc_parts USING btree (price, is_active) WHERE (is_active = true);


--
-- Name: idx_pc_parts_sale_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_sale_active ON public.pc_parts USING btree (on_sale, is_active) WHERE ((is_active = true) AND (on_sale = true));


--
-- Name: idx_pc_parts_spec_chipset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_spec_chipset ON public.pc_parts USING btree (((specifications ->> 'chipset'::text))) WHERE (((specifications ->> 'chipset'::text) IS NOT NULL) AND (is_active = true));


--
-- Name: idx_pc_parts_spec_ddr_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_spec_ddr_type ON public.pc_parts USING btree (((specifications ->> 'ddr_type'::text))) WHERE (((specifications ->> 'ddr_type'::text) IS NOT NULL) AND (is_active = true));


--
-- Name: idx_pc_parts_spec_socket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_spec_socket ON public.pc_parts USING btree (((specifications ->> 'socket'::text))) WHERE (((specifications ->> 'socket'::text) IS NOT NULL) AND (is_active = true));


--
-- Name: idx_pc_parts_specifications; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_specifications ON public.pc_parts USING gin (specifications);


--
-- Name: idx_pc_parts_stock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_stock ON public.pc_parts USING btree (stock);


--
-- Name: idx_pc_parts_stock_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_stock_active ON public.pc_parts USING btree (stock, is_active) WHERE ((is_active = true) AND (stock > 0));


--
-- Name: idx_pc_parts_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_parts_tier ON public.pc_parts USING btree (tier) WHERE (is_active = true);


--
-- Name: idx_pc_services_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_services_active ON public.pc_services USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_pc_services_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_services_category ON public.pc_services USING btree (category);


--
-- Name: idx_pc_services_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_services_display_order ON public.pc_services USING btree (display_order);


--
-- Name: idx_pc_services_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_services_featured ON public.pc_services USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_pc_upgrade_ref_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_upgrade_ref_active ON public.pc_upgrade_reference_builds USING btree (is_active);


--
-- Name: idx_pc_upgrade_ref_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_upgrade_ref_age ON public.pc_upgrade_reference_builds USING btree (age_range);


--
-- Name: idx_pc_upgrade_ref_budget; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_upgrade_ref_budget ON public.pc_upgrade_reference_builds USING btree (budget_range);


--
-- Name: idx_pc_upgrade_ref_components; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_upgrade_ref_components ON public.pc_upgrade_reference_builds USING gin (components);


--
-- Name: idx_pc_upgrade_ref_usage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pc_upgrade_ref_usage ON public.pc_upgrade_reference_builds USING btree (usage_type);


--
-- Name: idx_pending_orders_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_orders_created ON public.pending_orders USING btree (created_at);


--
-- Name: idx_pending_orders_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_orders_expires ON public.pending_orders USING btree (expires_at);


--
-- Name: idx_pending_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_orders_status ON public.pending_orders USING btree (status);


--
-- Name: idx_prebuilt_components_part_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prebuilt_components_part_id ON public.prebuilt_components USING btree (pc_part_id);


--
-- Name: idx_prebuilt_components_pc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prebuilt_components_pc_id ON public.prebuilt_components USING btree (prebuilt_pc_id);


--
-- Name: idx_prebuilt_history_pc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prebuilt_history_pc_id ON public.pre_built_pc_history USING btree (pre_built_pc_id);


--
-- Name: idx_prebuilt_pcs_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prebuilt_pcs_available ON public.prebuilt_pcs USING btree (is_available) WHERE (is_available = true);


--
-- Name: idx_prebuilt_pcs_build_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prebuilt_pcs_build_source ON public.prebuilt_pcs USING btree (build_source);


--
-- Name: idx_prebuilt_pcs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prebuilt_pcs_category ON public.prebuilt_pcs USING btree (category);


--
-- Name: idx_prebuilt_pcs_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prebuilt_pcs_featured ON public.prebuilt_pcs USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_prebuilt_pcs_purposes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prebuilt_pcs_purposes ON public.prebuilt_pcs USING gin (purposes);


--
-- Name: idx_prebuilt_pcs_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prebuilt_pcs_tier ON public.prebuilt_pcs USING btree (tier);


--
-- Name: idx_price_alerts_product_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_alerts_product_active ON public.price_alerts USING btree (product_id, is_active) WHERE (is_active = true);


--
-- Name: idx_price_alerts_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_alerts_user_active ON public.price_alerts USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: idx_price_history_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_date ON public.price_history USING btree (recorded_at DESC);


--
-- Name: idx_price_history_price_change; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_price_change ON public.price_history USING btree (price_change DESC) WHERE ((price_change IS NOT NULL) AND (abs(price_change) > (0)::numeric));


--
-- Name: idx_price_history_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_product ON public.price_history USING btree (product_id);


--
-- Name: idx_price_history_product_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_product_date ON public.price_history USING btree (product_id, recorded_at DESC);


--
-- Name: idx_product_comparisons_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_comparisons_category ON public.product_comparisons USING btree (product1_category);


--
-- Name: idx_product_comparisons_products; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_comparisons_products ON public.product_comparisons USING btree (product1_id, product2_id);


--
-- Name: idx_product_comparisons_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_comparisons_session ON public.product_comparisons USING btree (session_id);


--
-- Name: idx_product_specs_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_specs_metadata ON public.product_specs USING gin (compatibility_metadata);


--
-- Name: idx_product_specs_specs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_specs_specs ON public.product_specs USING gin (normalized_specs);


--
-- Name: idx_psu_compat_form_factor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psu_compat_form_factor ON public.psu_compatibility USING btree (form_factor);


--
-- Name: idx_psu_compat_wattage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psu_compat_wattage ON public.psu_compatibility USING btree (wattage);


--
-- Name: idx_psu_efficiency_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psu_efficiency_rating ON public.psu USING btree (efficiency_rating) WHERE (efficiency_rating IS NOT NULL);


--
-- Name: idx_psu_form_factor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psu_form_factor ON public.psu USING btree (form_factor);


--
-- Name: idx_psu_modular; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psu_modular ON public.psu USING btree (modular);


--
-- Name: idx_psu_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psu_name ON public.psu USING btree (name);


--
-- Name: idx_psu_wattage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psu_wattage ON public.psu USING btree (wattage);


--
-- Name: idx_queue_cycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_cycle ON public.queue_management USING btree (queue_cycle, used_in_cycle);


--
-- Name: idx_queue_cycles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_cycles_active ON public.queue_cycles USING btree (cycle_number) WHERE (ended_at IS NULL);


--
-- Name: idx_queue_management_assigned_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_management_assigned_date ON public.queue_management USING btree (assigned_date);


--
-- Name: idx_queue_management_queue_number_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_management_queue_number_range ON public.queue_management USING btree (queue_number) WHERE ((queue_number >= 1) AND (queue_number <= 99));


--
-- Name: idx_queue_management_queue_number_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_management_queue_number_status ON public.queue_management USING btree (queue_number, status);


--
-- Name: idx_queue_management_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_management_status ON public.queue_management USING btree (status);


--
-- Name: idx_queue_now_serving; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_now_serving ON public.queue_management USING btree (is_now_serving) WHERE (is_now_serving = true);


--
-- Name: idx_queue_now_serving_station; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_now_serving_station ON public.queue_management USING btree (now_serving_station) WHERE (now_serving_station IS NOT NULL);


--
-- Name: idx_ram_compat_chipset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_compat_chipset ON public.ram_compatibility USING btree (chipset_support);


--
-- Name: idx_ram_compat_height; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_compat_height ON public.ram_compatibility USING btree (height_mm);


--
-- Name: idx_ram_compat_speed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_compat_speed ON public.ram_compatibility USING btree (memory_speed);


--
-- Name: idx_ram_compat_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_compat_type ON public.ram_compatibility USING btree (memory_type);


--
-- Name: idx_ram_compat_type_speed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_compat_type_speed ON public.ram_compatibility USING btree (memory_type, memory_speed);


--
-- Name: idx_ram_memory_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_memory_type ON public.ram USING btree (memory_type);


--
-- Name: idx_ram_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_name ON public.ram USING btree (name);


--
-- Name: idx_ram_speed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_speed ON public.ram USING btree (speed) WHERE (speed IS NOT NULL);


--
-- Name: idx_ram_stick_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_stick_count ON public.ram USING btree (stick_count);


--
-- Name: idx_ram_total_capacity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_total_capacity ON public.ram USING btree (total_capacity) WHERE (total_capacity IS NOT NULL);


--
-- Name: idx_ram_type_speed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ram_type_speed ON public.ram USING btree (memory_type, speed) WHERE (memory_type IS NOT NULL);


--
-- Name: idx_reference_builds_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reference_builds_active ON public.reference_builds USING btree (is_active);


--
-- Name: idx_reference_builds_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reference_builds_category ON public.reference_builds USING btree (category);


--
-- Name: idx_reference_builds_cost; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reference_builds_cost ON public.reference_builds USING btree (total_cost);


--
-- Name: idx_reference_builds_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reference_builds_featured ON public.reference_builds USING btree (featured);


--
-- Name: idx_reference_builds_popularity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reference_builds_popularity ON public.reference_builds USING btree (popularity_score DESC);


--
-- Name: idx_rule_ab_test_results_experiment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_ab_test_results_experiment ON public.rule_ab_test_results USING btree (experiment_id);


--
-- Name: idx_rule_ab_test_results_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_ab_test_results_variant ON public.rule_ab_test_results USING btree (experiment_id, variant_type);


--
-- Name: idx_rule_ab_tests_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_ab_tests_dates ON public.rule_ab_tests USING btree (start_date, end_date);


--
-- Name: idx_rule_ab_tests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_ab_tests_status ON public.rule_ab_tests USING btree (status);


--
-- Name: idx_rule_effectiveness_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_effectiveness_date ON public.rule_effectiveness_metrics USING btree (date DESC);


--
-- Name: idx_rule_effectiveness_rule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_effectiveness_rule_id ON public.rule_effectiveness_metrics USING btree (rule_id);


--
-- Name: idx_rule_version_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_version_history_changed_at ON public.rule_version_history USING btree (changed_at DESC);


--
-- Name: idx_rule_version_history_rule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rule_version_history_rule_id ON public.rule_version_history USING btree (rule_id);


--
-- Name: idx_speakers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speakers_name ON public.speakers USING btree (name);


--
-- Name: idx_specification_schemas_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specification_schemas_category ON public.specification_schemas USING btree (category);


--
-- Name: idx_specification_schemas_field_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specification_schemas_field_name ON public.specification_schemas USING btree (field_name);


--
-- Name: idx_stock_category_classification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_category_classification ON public.stock_items USING btree (category_id, classification);


--
-- Name: idx_stock_classification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_classification ON public.stock_items USING btree (classification);


--
-- Name: idx_stock_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_items_category ON public.stock_items USING btree (category_id);


--
-- Name: idx_storage_bus_interface; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_bus_interface ON public.storage USING btree (bus_interface);


--
-- Name: idx_storage_capacity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_capacity ON public.storage USING btree (capacity) WHERE (capacity IS NOT NULL);


--
-- Name: idx_storage_form_factor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_form_factor ON public.storage USING btree (form_factor);


--
-- Name: idx_storage_interface; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_interface ON public.storage USING btree (interface);


--
-- Name: idx_storage_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storage_name ON public.storage USING btree (name);


--
-- Name: idx_successful_builds_components; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_successful_builds_components ON public.successful_builds USING gin (components_json);


--
-- Name: idx_successful_builds_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_successful_builds_created ON public.successful_builds USING btree (created_at DESC);


--
-- Name: idx_successful_builds_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_successful_builds_type ON public.successful_builds USING btree (build_type);


--
-- Name: idx_successful_builds_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_successful_builds_user ON public.successful_builds USING btree (user_id);


--
-- Name: idx_successful_builds_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_successful_builds_verified ON public.successful_builds USING btree (verified);


--
-- Name: idx_system_monitoring_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_monitoring_created_at ON public.system_monitoring USING btree (created_at);


--
-- Name: idx_system_monitoring_metric; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_monitoring_metric ON public.system_monitoring USING btree (metric_name);


--
-- Name: idx_system_monitoring_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_monitoring_status ON public.system_monitoring USING btree (status);


--
-- Name: idx_tier_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tier_category ON public.component_performance_tiers USING btree (component_category);


--
-- Name: idx_tier_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tier_component_id ON public.component_performance_tiers USING btree (component_id);


--
-- Name: idx_tier_perf_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tier_perf_score ON public.component_performance_tiers USING btree (performance_score);


--
-- Name: idx_tier_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tier_score ON public.component_performance_tiers USING btree (tier_score);


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- Name: idx_upgrade_paths_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upgrade_paths_active ON public.upgrade_paths USING btree (is_active);


--
-- Name: idx_upgrade_paths_from_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upgrade_paths_from_category ON public.upgrade_paths USING btree (from_build_category);


--
-- Name: idx_upgrade_paths_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upgrade_paths_priority ON public.upgrade_paths USING btree (priority DESC);


--
-- Name: idx_upgrade_paths_to_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upgrade_paths_to_category ON public.upgrade_paths USING btree (to_build_category);


--
-- Name: idx_usage_types_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_types_active ON public.pc_upgrade_usage_types USING btree (is_active, sort_order);


--
-- Name: idx_user_personas_cluster; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_personas_cluster ON public.user_personas USING btree (persona_cluster);


--
-- Name: idx_user_personas_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_personas_updated ON public.user_personas USING btree (updated_at DESC);


--
-- Name: idx_user_personas_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_personas_user_id ON public.user_personas USING btree (user_id);


--
-- Name: idx_user_preferences_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferences_session ON public.user_preferences USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_user_preferences_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferences_updated ON public.user_preferences USING btree (updated_at DESC);


--
-- Name: idx_user_preferences_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferences_user ON public.user_preferences USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_user_presence_stats_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_presence_stats_last_updated ON public.user_presence_stats USING btree (last_updated);


--
-- Name: idx_user_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_active ON public.user_sessions USING btree (is_active);


--
-- Name: idx_user_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions USING btree (last_activity);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at DESC);


--
-- Name: idx_users_email_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_active ON public.users USING btree (email, is_active);


--
-- Name: idx_users_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_lower ON public.users USING btree (lower((email)::text));


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_last_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_active ON public.users USING btree (last_active_at);


--
-- Name: idx_users_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_activity ON public.users USING btree (last_activity);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_role_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role_active ON public.users USING btree (role, is_active);


--
-- Name: idx_users_role_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role_status ON public.users USING btree (role, is_active) WHERE (is_active = true);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_virtual_build_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_virtual_build_date ON public.user_virtual_build USING btree (estimated_date DESC);


--
-- Name: idx_virtual_build_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_virtual_build_source ON public.user_virtual_build USING btree (source);


--
-- Name: idx_virtual_build_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_virtual_build_user ON public.user_virtual_build USING btree (user_id);


--
-- Name: idx_webcams_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webcams_name ON public._deprecated_webcams USING btree (name);


--
-- Name: idx_year_ranges_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_year_ranges_active ON public.pc_upgrade_year_ranges USING btree (is_active, sort_order);


--
-- Name: ai_compatibility_recommendations ai_compat_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ai_compat_updated_at BEFORE UPDATE ON public.ai_compatibility_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deployment_config deployment_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER deployment_config_updated_at BEFORE UPDATE ON public.deployment_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pc_parts price_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER price_change_trigger AFTER UPDATE ON public.pc_parts FOR EACH ROW EXECUTE FUNCTION public.log_price_change();


--
-- Name: compatibility_rules rule_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER rule_version_trigger BEFORE UPDATE ON public.compatibility_rules FOR EACH ROW EXECUTE FUNCTION public.record_rule_version();


--
-- Name: assistance_requests trigger_assistance_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_assistance_requests_updated_at BEFORE UPDATE ON public.assistance_requests FOR EACH ROW EXECUTE FUNCTION public.update_assistance_requests_updated_at();


--
-- Name: audit_logs trigger_audit_log_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_audit_log_activity AFTER INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.update_user_activity();


--
-- Name: ip_access_control trigger_auto_block_suspicious_ip; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_block_suspicious_ip AFTER UPDATE ON public.ip_access_control FOR EACH ROW WHEN ((new.failed_login_attempts > old.failed_login_attempts)) EXECUTE FUNCTION public.auto_block_suspicious_ip();


--
-- Name: build_history trigger_build_history_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_build_history_updated_at BEFORE UPDATE ON public.build_history FOR EACH ROW EXECUTE FUNCTION public.update_price_history_timestamp();


--
-- Name: compatibility_cache trigger_compatibility_cache_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_compatibility_cache_updated_at BEFORE UPDATE ON public.compatibility_cache FOR EACH ROW EXECUTE FUNCTION public.update_price_history_timestamp();


--
-- Name: price_history trigger_price_history_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_price_history_updated_at BEFORE UPDATE ON public.price_history FOR EACH ROW EXECUTE FUNCTION public.update_price_history_timestamp();


--
-- Name: ai_corrections trigger_update_feedback_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_feedback_stats AFTER INSERT ON public.ai_corrections FOR EACH ROW EXECUTE FUNCTION public.update_ai_feedback_stats();


--
-- Name: ip_access_control trigger_update_ip_access_control_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_ip_access_control_timestamp BEFORE UPDATE ON public.ip_access_control FOR EACH ROW EXECUTE FUNCTION public.update_ip_access_control_timestamp();


--
-- Name: orders trigger_update_queue_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_queue_status AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_queue_status();


--
-- Name: user_preferences trigger_user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_price_history_timestamp();


--
-- Name: user_preferences trigger_validate_user_preferences; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_user_preferences BEFORE INSERT OR UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.validate_user_preferences();


--
-- Name: ai_metrics update_ai_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_metrics_updated_at BEFORE UPDATE ON public.ai_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pc_upgrade_budget_ranges update_budget_ranges_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_budget_ranges_updated_at BEFORE UPDATE ON public.pc_upgrade_budget_ranges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: compatibility_logs update_compatibility_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_compatibility_logs_updated_at BEFORE UPDATE ON public.compatibility_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feedback_submissions update_feedback_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feedback_submissions_updated_at BEFORE UPDATE ON public.feedback_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feedback_votes update_feedback_votes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feedback_votes_updated_at BEFORE UPDATE ON public.feedback_votes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: known_issues update_known_issues_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_known_issues_updated_at BEFORE UPDATE ON public.known_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: messages update_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_messages_updated_at();


--
-- Name: _deprecated_monitors update_monitors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_monitors_updated_at BEFORE UPDATE ON public._deprecated_monitors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_items update_order_items_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_order_items_timestamp BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: order_queue update_order_queue_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_order_queue_timestamp BEFORE UPDATE ON public.order_queue FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: password_resets update_password_resets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_password_resets_updated_at BEFORE UPDATE ON public.password_resets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pc_customized_ai_reference_builds update_pc_customized_ai_reference_builds_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pc_customized_ai_reference_builds_timestamp BEFORE UPDATE ON public.pc_customized_ai_reference_builds FOR EACH ROW EXECUTE FUNCTION public.update_pc_customized_builds_timestamp();


--
-- Name: pc_customized_budget_ranges update_pc_customized_budget_ranges_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pc_customized_budget_ranges_timestamp BEFORE UPDATE ON public.pc_customized_budget_ranges FOR EACH ROW EXECUTE FUNCTION public.update_pc_customized_builds_timestamp();


--
-- Name: pc_customized_gaming_preferences update_pc_customized_gaming_preferences_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pc_customized_gaming_preferences_timestamp BEFORE UPDATE ON public.pc_customized_gaming_preferences FOR EACH ROW EXECUTE FUNCTION public.update_pc_customized_builds_timestamp();


--
-- Name: pc_customized_performance_preferences update_pc_customized_performance_preferences_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pc_customized_performance_preferences_timestamp BEFORE UPDATE ON public.pc_customized_performance_preferences FOR EACH ROW EXECUTE FUNCTION public.update_pc_customized_builds_timestamp();


--
-- Name: pc_customized_usage_types update_pc_customized_usage_types_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pc_customized_usage_types_timestamp BEFORE UPDATE ON public.pc_customized_usage_types FOR EACH ROW EXECUTE FUNCTION public.update_pc_customized_builds_timestamp();


--
-- Name: pc_parts update_pc_parts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pc_parts_updated_at BEFORE UPDATE ON public.pc_parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reference_builds update_reference_builds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reference_builds_updated_at BEFORE UPDATE ON public.reference_builds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_categories update_stock_categories_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_categories_timestamp BEFORE UPDATE ON public.stock_categories FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: stock_items update_stock_items_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_items_timestamp BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: successful_builds update_successful_builds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_successful_builds_updated_at BEFORE UPDATE ON public.successful_builds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_settings update_system_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: upgrade_paths update_upgrade_paths_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_upgrade_paths_updated_at BEFORE UPDATE ON public.upgrade_paths FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pc_upgrade_usage_types update_usage_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_usage_types_updated_at BEFORE UPDATE ON public.pc_upgrade_usage_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_personas update_user_personas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_personas_updated_at BEFORE UPDATE ON public.user_personas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_sessions update_user_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON public.user_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: _deprecated_webcams update_webcams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_webcams_updated_at BEFORE UPDATE ON public._deprecated_webcams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pc_upgrade_year_ranges update_year_ranges_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_year_ranges_updated_at BEFORE UPDATE ON public.pc_upgrade_year_ranges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_log activity_log_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_sessions(id) ON DELETE SET NULL;


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ai_audit_logs ai_audit_logs_recommendation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audit_logs
    ADD CONSTRAINT ai_audit_logs_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.ai_recommendations(id) ON DELETE CASCADE;


--
-- Name: ai_audit_logs ai_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audit_logs
    ADD CONSTRAINT ai_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_corrections ai_corrections_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_corrections
    ADD CONSTRAINT ai_corrections_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(id);


--
-- Name: ai_feedback ai_feedback_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_feedback ai_feedback_compatibility_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_compatibility_log_id_fkey FOREIGN KEY (compatibility_log_id) REFERENCES public.compatibility_logs(id) ON DELETE CASCADE;


--
-- Name: ai_feedback ai_feedback_recommendation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_feedback
    ADD CONSTRAINT ai_feedback_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.ai_recommendations(id) ON DELETE CASCADE;


--
-- Name: ai_logs ai_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_logs
    ADD CONSTRAINT ai_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_pending_reviews ai_pending_reviews_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_pending_reviews
    ADD CONSTRAINT ai_pending_reviews_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: ai_training_data ai_training_data_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_training_data
    ADD CONSTRAINT ai_training_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: assistance_requests assistance_requests_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistance_requests
    ADD CONSTRAINT assistance_requests_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: build_patterns build_patterns_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.pc_parts(id);


--
-- Name: build_patterns build_patterns_cooling_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_cooling_id_fkey FOREIGN KEY (cooling_id) REFERENCES public.pc_parts(id);


--
-- Name: build_patterns build_patterns_cpu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_cpu_id_fkey FOREIGN KEY (cpu_id) REFERENCES public.pc_parts(id);


--
-- Name: build_patterns build_patterns_gpu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_gpu_id_fkey FOREIGN KEY (gpu_id) REFERENCES public.pc_parts(id);


--
-- Name: build_patterns build_patterns_motherboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_motherboard_id_fkey FOREIGN KEY (motherboard_id) REFERENCES public.pc_parts(id);


--
-- Name: build_patterns build_patterns_psu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_psu_id_fkey FOREIGN KEY (psu_id) REFERENCES public.pc_parts(id);


--
-- Name: build_patterns build_patterns_ram_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_ram_id_fkey FOREIGN KEY (ram_id) REFERENCES public.pc_parts(id);


--
-- Name: build_patterns build_patterns_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.build_patterns
    ADD CONSTRAINT build_patterns_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.pc_parts(id);


--
-- Name: compatibility_logs compatibility_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_logs
    ADD CONSTRAINT compatibility_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: compatibility_rules compatibility_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_rules
    ADD CONSTRAINT compatibility_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: compatibility_rules compatibility_rules_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_rules
    ADD CONSTRAINT compatibility_rules_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES public.users(id);


--
-- Name: compatibility_rules compatibility_rules_parent_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compatibility_rules
    ADD CONSTRAINT compatibility_rules_parent_rule_id_fkey FOREIGN KEY (parent_rule_id) REFERENCES public.compatibility_rules(id);


--
-- Name: component_performance_tiers component_performance_tiers_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_performance_tiers
    ADD CONSTRAINT component_performance_tiers_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.pc_parts(id) ON DELETE CASCADE;


--
-- Name: feedback_review_queue feedback_review_queue_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_review_queue
    ADD CONSTRAINT feedback_review_queue_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: feedback_review_queue feedback_review_queue_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_review_queue
    ADD CONSTRAINT feedback_review_queue_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedback_submissions(id) ON DELETE CASCADE;


--
-- Name: feedback_submissions feedback_submissions_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.pc_parts(id);


--
-- Name: feedback_submissions feedback_submissions_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: feedback_submissions feedback_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_submissions
    ADD CONSTRAINT feedback_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: feedback_votes feedback_votes_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.feedback_submissions(id) ON DELETE CASCADE;


--
-- Name: feedback_votes feedback_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_votes
    ADD CONSTRAINT feedback_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cooling fk_cooling_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cooling
    ADD CONSTRAINT fk_cooling_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: cpu fk_cpu_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cpu
    ADD CONSTRAINT fk_cpu_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: order_deduplication_log fk_created_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_deduplication_log
    ADD CONSTRAINT fk_created_order FOREIGN KEY (created_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: gpu fk_gpu_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpu
    ADD CONSTRAINT fk_gpu_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: monitor fk_monitor_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitor
    ADD CONSTRAINT fk_monitor_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: motherboard fk_motherboard_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.motherboard
    ADD CONSTRAINT fk_motherboard_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: pc_case fk_pc_case_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_case
    ADD CONSTRAINT fk_pc_case_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: psu fk_psu_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psu
    ADD CONSTRAINT fk_psu_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: ram fk_ram_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ram
    ADD CONSTRAINT fk_ram_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: storage fk_storage_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage
    ADD CONSTRAINT fk_storage_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: webcam fk_webcam_pc_parts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webcam
    ADD CONSTRAINT fk_webcam_pc_parts FOREIGN KEY (id) REFERENCES public.pc_parts(id) ON UPDATE CASCADE;


--
-- Name: historical_builds historical_builds_cpu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historical_builds
    ADD CONSTRAINT historical_builds_cpu_id_fkey FOREIGN KEY (cpu_id) REFERENCES public.pc_parts(id) ON DELETE SET NULL;


--
-- Name: historical_builds historical_builds_gpu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historical_builds
    ADD CONSTRAINT historical_builds_gpu_id_fkey FOREIGN KEY (gpu_id) REFERENCES public.pc_parts(id) ON DELETE SET NULL;


--
-- Name: historical_patterns historical_patterns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historical_patterns
    ADD CONSTRAINT historical_patterns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ip_access_control ip_access_control_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_access_control
    ADD CONSTRAINT ip_access_control_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ip_logs ip_logs_ip_control_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_logs
    ADD CONSTRAINT ip_logs_ip_control_id_fkey FOREIGN KEY (ip_control_id) REFERENCES public.ip_access_control(id) ON DELETE CASCADE;


--
-- Name: ip_logs ip_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_logs
    ADD CONSTRAINT ip_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: issue_verifications issue_verifications_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_verifications
    ADD CONSTRAINT issue_verifications_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.known_issues(id) ON DELETE CASCADE;


--
-- Name: issue_verifications issue_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_verifications
    ADD CONSTRAINT issue_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: known_issues known_issues_component1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.known_issues
    ADD CONSTRAINT known_issues_component1_id_fkey FOREIGN KEY (component1_id) REFERENCES public.pc_parts(id);


--
-- Name: known_issues known_issues_component2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.known_issues
    ADD CONSTRAINT known_issues_component2_id_fkey FOREIGN KEY (component2_id) REFERENCES public.pc_parts(id);


--
-- Name: known_issues known_issues_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.known_issues
    ADD CONSTRAINT known_issues_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id);


--
-- Name: known_issues known_issues_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.known_issues
    ADD CONSTRAINT known_issues_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: messages messages_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: _deprecated_monitors monitors_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._deprecated_monitors
    ADD CONSTRAINT monitors_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.pc_parts(id) ON DELETE CASCADE;


--
-- Name: notification_queue notification_queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);


--
-- Name: order_locks order_locks_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_locks
    ADD CONSTRAINT order_locks_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_queue order_queue_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_queue
    ADD CONSTRAINT order_queue_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_queue order_queue_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_queue
    ADD CONSTRAINT order_queue_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_assisted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assisted_by_fkey FOREIGN KEY (assisted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: orders orders_virtual_build_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_virtual_build_id_fkey FOREIGN KEY (virtual_build_id) REFERENCES public.user_virtual_build(id) ON DELETE SET NULL;


--
-- Name: password_history password_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_history
    ADD CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.pc_parts(id);


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_cooling_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_cooling_id_fkey FOREIGN KEY (cooling_id) REFERENCES public.pc_parts(id);


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_cpu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_cpu_id_fkey FOREIGN KEY (cpu_id) REFERENCES public.pc_parts(id);


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_gpu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_gpu_id_fkey FOREIGN KEY (gpu_id) REFERENCES public.pc_parts(id);


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_motherboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_motherboard_id_fkey FOREIGN KEY (motherboard_id) REFERENCES public.pc_parts(id);


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_psu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_psu_id_fkey FOREIGN KEY (psu_id) REFERENCES public.pc_parts(id);


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_ram_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_ram_id_fkey FOREIGN KEY (ram_id) REFERENCES public.pc_parts(id);


--
-- Name: pc_customized_ai_reference_builds pc_customized_ai_reference_builds_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_customized_ai_reference_builds
    ADD CONSTRAINT pc_customized_ai_reference_builds_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.pc_parts(id);


--
-- Name: pc_parts pc_parts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_parts
    ADD CONSTRAINT pc_parts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: pc_parts pc_parts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_parts
    ADD CONSTRAINT pc_parts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: pc_upgrade_new_products pc_upgrade_new_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_new_products
    ADD CONSTRAINT pc_upgrade_new_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pc_parts(id);


--
-- Name: pc_upgrade_reference_builds_metadata pc_upgrade_reference_builds_metadata_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pc_upgrade_reference_builds_metadata
    ADD CONSTRAINT pc_upgrade_reference_builds_metadata_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id);


--
-- Name: pre_built_pc_history pre_built_pc_history_action_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pre_built_pc_history
    ADD CONSTRAINT pre_built_pc_history_action_by_fkey FOREIGN KEY (action_by) REFERENCES public.users(id);


--
-- Name: prebuilt_components prebuilt_components_pc_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prebuilt_components
    ADD CONSTRAINT prebuilt_components_pc_part_id_fkey FOREIGN KEY (pc_part_id) REFERENCES public.pc_parts(id) ON DELETE CASCADE;


--
-- Name: prebuilt_components prebuilt_components_prebuilt_pc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prebuilt_components
    ADD CONSTRAINT prebuilt_components_prebuilt_pc_id_fkey FOREIGN KEY (prebuilt_pc_id) REFERENCES public.prebuilt_pcs(id) ON DELETE CASCADE;


--
-- Name: price_alerts price_alerts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pc_parts(id) ON DELETE CASCADE;


--
-- Name: price_alerts price_alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: price_history price_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: price_history price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pc_parts(id) ON DELETE CASCADE;


--
-- Name: product_specs product_specs_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_specs
    ADD CONSTRAINT product_specs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pc_parts(id) ON DELETE CASCADE;


--
-- Name: queue_cycles queue_cycles_reset_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_cycles
    ADD CONSTRAINT queue_cycles_reset_by_user_id_fkey FOREIGN KEY (reset_by_user_id) REFERENCES public.users(id);


--
-- Name: queue_management queue_management_now_serving_set_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_management
    ADD CONSTRAINT queue_management_now_serving_set_by_fkey FOREIGN KEY (now_serving_set_by) REFERENCES public.users(id);


--
-- Name: queue_management queue_management_now_serving_station_set_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_management
    ADD CONSTRAINT queue_management_now_serving_station_set_by_fkey FOREIGN KEY (now_serving_station_set_by) REFERENCES public.users(id);


--
-- Name: queue_management queue_management_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_management
    ADD CONSTRAINT queue_management_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: rule_ab_test_results rule_ab_test_results_experiment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_test_results
    ADD CONSTRAINT rule_ab_test_results_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.rule_ab_tests(id) ON DELETE CASCADE;


--
-- Name: rule_ab_test_results rule_ab_test_results_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_test_results
    ADD CONSTRAINT rule_ab_test_results_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.compatibility_rules(id);


--
-- Name: rule_ab_tests rule_ab_tests_control_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_tests
    ADD CONSTRAINT rule_ab_tests_control_rule_id_fkey FOREIGN KEY (control_rule_id) REFERENCES public.compatibility_rules(id);


--
-- Name: rule_ab_tests rule_ab_tests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_tests
    ADD CONSTRAINT rule_ab_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: rule_ab_tests rule_ab_tests_variant_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_ab_tests
    ADD CONSTRAINT rule_ab_tests_variant_rule_id_fkey FOREIGN KEY (variant_rule_id) REFERENCES public.compatibility_rules(id);


--
-- Name: rule_effectiveness_metrics rule_effectiveness_metrics_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_effectiveness_metrics
    ADD CONSTRAINT rule_effectiveness_metrics_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.compatibility_rules(id) ON DELETE CASCADE;


--
-- Name: rule_version_history rule_version_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_version_history
    ADD CONSTRAINT rule_version_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: rule_version_history rule_version_history_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_version_history
    ADD CONSTRAINT rule_version_history_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.compatibility_rules(id) ON DELETE CASCADE;


--
-- Name: stock_items stock_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.stock_categories(id) ON DELETE CASCADE;


--
-- Name: successful_builds successful_builds_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.pc_parts(id);


--
-- Name: successful_builds successful_builds_cooling_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_cooling_id_fkey FOREIGN KEY (cooling_id) REFERENCES public.pc_parts(id);


--
-- Name: successful_builds successful_builds_cpu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_cpu_id_fkey FOREIGN KEY (cpu_id) REFERENCES public.pc_parts(id);


--
-- Name: successful_builds successful_builds_gpu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_gpu_id_fkey FOREIGN KEY (gpu_id) REFERENCES public.pc_parts(id);


--
-- Name: successful_builds successful_builds_motherboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_motherboard_id_fkey FOREIGN KEY (motherboard_id) REFERENCES public.pc_parts(id);


--
-- Name: successful_builds successful_builds_psu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_psu_id_fkey FOREIGN KEY (psu_id) REFERENCES public.pc_parts(id);


--
-- Name: successful_builds successful_builds_ram_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_ram_id_fkey FOREIGN KEY (ram_id) REFERENCES public.pc_parts(id);


--
-- Name: successful_builds successful_builds_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.pc_parts(id);


--
-- Name: successful_builds successful_builds_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: successful_builds successful_builds_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.successful_builds
    ADD CONSTRAINT successful_builds_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: transactions transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: transactions transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: user_compatibility_reports user_compatibility_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_compatibility_reports
    ADD CONSTRAINT user_compatibility_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_personas user_personas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_personas
    ADD CONSTRAINT user_personas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_virtual_build user_virtual_build_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_virtual_build
    ADD CONSTRAINT user_virtual_build_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_assisted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_assisted_by_fkey FOREIGN KEY (assisted_by) REFERENCES public.users(id);


--
-- Name: _deprecated_webcams webcams_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._deprecated_webcams
    ADD CONSTRAINT webcams_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.pc_parts(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

