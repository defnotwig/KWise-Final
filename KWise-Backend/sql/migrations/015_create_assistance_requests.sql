-- Create assistance_requests table for kiosk assistance system
CREATE TABLE IF NOT EXISTS assistance_requests (
  id SERIAL PRIMARY KEY,
  kiosk_id VARCHAR(50) NOT NULL DEFAULT 'KIOSK-001',
  request_type VARCHAR(50) NOT NULL DEFAULT 'assisted_service',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP,
  completed_at TIMESTAMP,
  acknowledged_by INTEGER REFERENCES users(id),
  admin_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistance_requests_status ON assistance_requests(status);
CREATE INDEX IF NOT EXISTS idx_assistance_requests_kiosk_id ON assistance_requests(kiosk_id);
CREATE INDEX IF NOT EXISTS idx_assistance_requests_requested_at ON assistance_requests(requested_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assistance_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_assistance_requests_updated_at ON assistance_requests;
CREATE TRIGGER trigger_assistance_requests_updated_at
BEFORE UPDATE ON assistance_requests
FOR EACH ROW
EXECUTE FUNCTION update_assistance_requests_updated_at();

-- Add helpful comments
COMMENT ON TABLE assistance_requests IS 'Tracks assistance requests from kiosk for real-time admin notifications';
COMMENT ON COLUMN assistance_requests.kiosk_id IS 'Identifier of the kiosk making the request';
COMMENT ON COLUMN assistance_requests.request_type IS 'Type of assistance requested (e.g., assisted_service, help, technical_issue)';
COMMENT ON COLUMN assistance_requests.status IS 'Current status of the request (pending, acknowledged, completed, cancelled)';
