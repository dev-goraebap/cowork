package xyz.goraebap.cowork.module.workspace.document.infrastructure;

import static xyz.goraebap.cowork.jooq.tables.Department.DEPARTMENT;
import static xyz.goraebap.cowork.jooq.tables.Employee.EMPLOYEE;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;
import xyz.goraebap.cowork.module.workspace.document.application.access.ReaderQuery;

/**
 * A member's departments (the organization's employee and department rows) and projects (the projects' members), read
 * here as conditions of what 문서함 shows (cowork-guide-backend, 모듈 경계를 넘는 조회). The department tree is small,
 * so it is read whole to walk up from the member's own.
 */
@Repository
@RequiredArgsConstructor
class JooqReaderQuery implements ReaderQuery {
    /** How far up the departments go before a loop is assumed. */
    private static final int DEPTH_MAX = 100;

    private final DSLContext dslContext;

    @Override
    public Set<UUID> departmentsOf(UUID userId) {
        UUID own = dslContext
                .select(EMPLOYEE.DEPARTMENT_ID)
                .from(EMPLOYEE)
                .where(EMPLOYEE.EMPLOYEE_ID.eq(userId))
                .fetchOptional(EMPLOYEE.DEPARTMENT_ID)
                .orElse(null);
        if (own == null) return Set.of();
        Map<UUID, UUID> parents = new HashMap<>();
        dslContext
                .select(DEPARTMENT.DEPARTMENT_ID, DEPARTMENT.PARENT_ID)
                .from(DEPARTMENT)
                .fetch()
                .forEach(row -> parents.put(row.get(DEPARTMENT.DEPARTMENT_ID), row.get(DEPARTMENT.PARENT_ID)));
        Set<UUID> departments = new HashSet<>();
        for (UUID at = own; at != null && departments.size() < DEPTH_MAX && departments.add(at); at = parents.get(at)) {
            // Walks up to the top.
        }
        return departments;
    }

    @Override
    public Map<UUID, String> departmentNames(Collection<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return dslContext
                .select(DEPARTMENT.DEPARTMENT_ID, DEPARTMENT.NAME)
                .from(DEPARTMENT)
                .where(DEPARTMENT.DEPARTMENT_ID.in(ids))
                .fetchMap(DEPARTMENT.DEPARTMENT_ID, DEPARTMENT.NAME);
    }
}
