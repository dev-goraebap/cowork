package xyz.goraebap.cowork.support;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import xyz.goraebap.cowork.shared.persistence.InstantTextBinding;

/**
 * Members put straight into the test database as registration leaves them: who they are in users (made, or completed
 * when the test opened the account first) and their Office record in employee. A member made here without an account
 * cannot sign in until the test lets them.
 */
public final class Members {
    private Members() {}

    public static Member member(UUID id, String name, String email) {
        return new Member(id, name, email, "ACTIVE", LocalDate.parse("2024-01-01"), null, null, null, Instant.now());
    }

    public static void insert(JdbcTemplate jdbc, Member member) {
        jdbc.update(
                "INSERT INTO users(user_id,email,name,status,invited_at,is_active) VALUES (?,?,?,?,?,false)"
                        + " ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, status=excluded.status,"
                        + " invited_at=excluded.invited_at",
                member.id(),
                member.email(),
                member.name(),
                member.status(),
                InstantTextBinding.text(member.invitedAt()));
        jdbc.update(
                "INSERT INTO employee(employee_id,department_id,position_id,title_id,hire_date) VALUES (?,?,?,?,?)",
                member.id(),
                member.departmentId(),
                member.positionId(),
                member.titleId(),
                member.hireDate().toString());
    }

    public record Member(
            UUID id,
            String name,
            String email,
            String status,
            LocalDate hireDate,
            UUID departmentId,
            UUID positionId,
            UUID titleId,
            Instant invitedAt) {
        public Member status(String status) {
            return new Member(id, name, email, status, hireDate, departmentId, positionId, titleId, invitedAt);
        }

        public Member hired(LocalDate hireDate) {
            return new Member(id, name, email, status, hireDate, departmentId, positionId, titleId, invitedAt);
        }

        public Member hired(String hireDate) {
            return hired(LocalDate.parse(hireDate));
        }

        public Member department(UUID departmentId) {
            return new Member(id, name, email, status, hireDate, departmentId, positionId, titleId, invitedAt);
        }

        public Member position(UUID positionId) {
            return new Member(id, name, email, status, hireDate, departmentId, positionId, titleId, invitedAt);
        }

        public Member title(UUID titleId) {
            return new Member(id, name, email, status, hireDate, departmentId, positionId, titleId, invitedAt);
        }

        public Member invitedAt(Instant invitedAt) {
            return new Member(id, name, email, status, hireDate, departmentId, positionId, titleId, invitedAt);
        }
    }
}
