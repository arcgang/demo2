-- Migration: 0001_initial_schema
-- PCI-DSS note: payment_attempt deliberately contains no column for raw PAN,
-- CVV, or card expiry. Only PSP-issued token references and provider
-- references are stored.

CREATE TABLE market_config (
    market_code VARCHAR(8) PRIMARY KEY,
    market_name VARCHAR(100) NOT NULL,
    locale_code VARCHAR(16) NOT NULL,
    currency_code VARCHAR(8) NOT NULL,
    tax_label VARCHAR(32) NOT NULL,
    mobile_money_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    card_payment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    lite_mode_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed market configuration
INSERT INTO market_config (market_code, market_name, locale_code, currency_code, tax_label, mobile_money_enabled, card_payment_enabled)
VALUES
    ('ZA', 'South Africa',  'en-ZA', 'ZAR', 'VAT',  TRUE,  TRUE),
    ('TZ', 'Tanzania',      'sw-TZ', 'TZS', 'VAT',  TRUE,  TRUE),
    ('MZ', 'Mozambique',    'pt-MZ', 'MZN', 'IVA',  TRUE,  TRUE),
    ('XX', 'Card-Only Demo','en-XX', 'USD', 'TAX',  FALSE, TRUE);

CREATE TABLE product_cache (
    product_id VARCHAR(64) PRIMARY KEY,
    market_code VARCHAR(8) NOT NULL REFERENCES market_config(market_code),
    product_type VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_once_off NUMERIC(12,2) NOT NULL DEFAULT 0,
    price_recurring NUMERIC(12,2) NOT NULL DEFAULT 0,
    availability_status VARCHAR(32) NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_session (
    session_id UUID PRIMARY KEY,
    customer_id VARCHAR(64),
    line_id VARCHAR(32),
    is_authenticated BOOLEAN NOT NULL DEFAULT FALSE,
    market_code VARCHAR(8) NOT NULL REFERENCES market_config(market_code),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart (
    cart_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES customer_session(session_id),
    market_code VARCHAR(8) NOT NULL REFERENCES market_config(market_code),
    status VARCHAR(32) NOT NULL,
    currency_code VARCHAR(8) NOT NULL,
    once_off_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    recurring_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payable_now NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_item (
    cart_item_id UUID PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES cart(cart_id) ON DELETE CASCADE,
    line_type VARCHAR(32) NOT NULL,
    reference_id VARCHAR(64),
    product_id VARCHAR(64),
    display_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    once_off_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    recurring_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE eligibility_result (
    eligibility_result_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES customer_session(session_id),
    customer_id VARCHAR(64) NOT NULL,
    line_id VARCHAR(32) NOT NULL,
    target_product_id VARCHAR(64) NOT NULL,
    eligibility_status VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64),
    compatible_plans_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    inventory_status VARCHAR(32),
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finance_quote (
    finance_quote_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES customer_session(session_id),
    customer_id VARCHAR(64) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    market_code VARCHAR(8) NOT NULL REFERENCES market_config(market_code),
    quote_status VARCHAR(32) NOT NULL,
    options_json JSONB NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trade_in_quote (
    trade_in_quote_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES customer_session(session_id),
    customer_id VARCHAR(64) NOT NULL,
    market_code VARCHAR(8) NOT NULL REFERENCES market_config(market_code),
    device_payload_json JSONB NOT NULL,
    quote_status VARCHAR(32) NOT NULL,
    estimated_credit NUMERIC(12,2) NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verification_case (
    verification_case_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES customer_session(session_id),
    market_code VARCHAR(8) NOT NULL REFERENCES market_config(market_code),
    product_type VARCHAR(32) NOT NULL,
    customer_payload_json JSONB NOT NULL,
    porting_payload_json JSONB,
    verification_status VARCHAR(32) NOT NULL,
    activation_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    verification_reference VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PCI-DSS: no pan, cvv, card_number, expiry, or card_expiry column.
-- Raw card data is never accepted; only PSP-issued token_reference and
-- provider_reference are stored.
CREATE TABLE payment_attempt (
    payment_attempt_id UUID PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES cart(cart_id),
    payment_method VARCHAR(32) NOT NULL,
    provider_name VARCHAR(64) NOT NULL,
    provider_reference VARCHAR(128),
    token_reference VARCHAR(128),
    wallet_reference VARCHAR(128),
    payment_status VARCHAR(32) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency_code VARCHAR(8) NOT NULL,
    callback_payload_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shop_order (
    order_id UUID PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES cart(cart_id),
    session_id UUID NOT NULL REFERENCES customer_session(session_id),
    customer_id VARCHAR(64),
    market_code VARCHAR(8) NOT NULL REFERENCES market_config(market_code),
    external_order_reference VARCHAR(128),
    order_status VARCHAR(32) NOT NULL,
    payment_status VARCHAR(32) NOT NULL,
    verification_status VARCHAR(32),
    activation_status VARCHAR(32),
    total_amount NUMERIC(12,2) NOT NULL,
    currency_code VARCHAR(8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_item (
    order_item_id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES shop_order(order_id) ON DELETE CASCADE,
    line_type VARCHAR(32) NOT NULL,
    product_id VARCHAR(64),
    display_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    once_off_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    recurring_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE activation_status (
    activation_status_id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES shop_order(order_id),
    activation_state VARCHAR(32) NOT NULL,
    esim_reference VARCHAR(128),
    esim_qr_payload TEXT,
    milestone_payload_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE consent_record (
    consent_record_id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES customer_session(session_id),
    customer_id VARCHAR(64),
    purpose_code VARCHAR(32) NOT NULL,
    granted BOOLEAN NOT NULL,
    source_channel VARCHAR(32) NOT NULL DEFAULT 'WEB',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_event (
    audit_event_id UUID PRIMARY KEY,
    session_id UUID REFERENCES customer_session(session_id),
    order_id UUID REFERENCES shop_order(order_id),
    event_type VARCHAR(64) NOT NULL,
    event_category VARCHAR(64) NOT NULL,
    actor_type VARCHAR(32) NOT NULL,
    actor_id VARCHAR(64),
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
