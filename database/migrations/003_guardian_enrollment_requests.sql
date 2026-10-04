BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS dance_sections_tenant_id_id_key
  ON dance_sections(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS dance_enrollments_tenant_id_id_key
  ON dance_enrollments(tenant_id, id);

CREATE TABLE IF NOT EXISTS dance_guardian_enrollment_requests (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES dance_tenants(id),
  guardian_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  section_id BIGINT NOT NULL,
  guardian_user_id INTEGER NOT NULL REFERENCES users(id),
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'enrolled', 'waitlisted', 'blocked', 'declined', 'cancelled')),
  enrollment_id BIGINT,
  review_reason TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, guardian_user_id, idempotency_key),
  FOREIGN KEY (tenant_id, guardian_id) REFERENCES dance_guardians(tenant_id, id),
  FOREIGN KEY (tenant_id, guardian_id, guardian_user_id)
    REFERENCES dance_guardian_accounts(tenant_id, guardian_id, user_id),
  FOREIGN KEY (tenant_id, student_id) REFERENCES dance_students(tenant_id, id),
  FOREIGN KEY (tenant_id, section_id) REFERENCES dance_sections(tenant_id, id),
  FOREIGN KEY (tenant_id, enrollment_id) REFERENCES dance_enrollments(tenant_id, id),
  CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  CHECK ((status IN ('enrolled', 'waitlisted', 'blocked')) = (enrollment_id IS NOT NULL)),
  CHECK ((status = 'pending') = (reviewed_at IS NULL)),
  CHECK (reviewed_at IS NULL OR reviewed_by IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS dance_guardian_pending_enrollment_key
  ON dance_guardian_enrollment_requests(tenant_id, student_id, section_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS dance_guardian_request_account_idx
  ON dance_guardian_enrollment_requests(tenant_id, guardian_user_id, requested_at DESC);

COMMIT;
