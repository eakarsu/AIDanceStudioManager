BEGIN;

-- Guardian access is provisioned explicitly. An email match or participation
-- consent alone never grants an account access to a child.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS dance_guardians_tenant_id_id_key ON dance_guardians(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS dance_students_tenant_id_id_key ON dance_students(tenant_id, id);

CREATE TABLE IF NOT EXISTS dance_guardian_accounts (
  tenant_id UUID NOT NULL REFERENCES dance_tenants(id),
  guardian_id BIGINT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  linked_by INTEGER NOT NULL REFERENCES users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by INTEGER REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, guardian_id, user_id),
  UNIQUE (tenant_id, user_id),
  FOREIGN KEY (tenant_id, guardian_id) REFERENCES dance_guardians(tenant_id, id),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);

CREATE TABLE IF NOT EXISTS dance_guardian_student_links (
  tenant_id UUID NOT NULL REFERENCES dance_tenants(id),
  guardian_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'guardian',
  linked_by INTEGER NOT NULL REFERENCES users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by INTEGER REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, guardian_id, student_id),
  FOREIGN KEY (tenant_id, guardian_id) REFERENCES dance_guardians(tenant_id, id),
  FOREIGN KEY (tenant_id, student_id) REFERENCES dance_students(tenant_id, id),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);

CREATE INDEX IF NOT EXISTS dance_guardian_student_links_student_idx
  ON dance_guardian_student_links(tenant_id, student_id) WHERE revoked_at IS NULL;

COMMIT;
