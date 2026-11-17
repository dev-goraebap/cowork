package xyz.goraebap.cowork;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.HashMap;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** V64: members until now become editors, whoever made the project its administrator, and no one else joins. */
class ProjectMemberRoleMigrationTest {
    @TempDir
    Path directory;

    @Test
    void membersBecomeEditorsAndTheMakerTheAdministrator() throws Exception {
        String url = "jdbc:sqlite:" + directory.resolve("roles.db");
        Flyway.configure().dataSource(url, "", "").target("63").load().migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.executeUpdate("INSERT INTO users (user_id,email) VALUES"
                    + " ('00000000-0000-0000-0000-000000000001','maker@example.test'),"
                    + " ('00000000-0000-0000-0000-000000000002','member@example.test'),"
                    + " ('00000000-0000-0000-0000-000000000003','outsider@example.test'),"
                    + " ('00000000-0000-0000-0000-000000000004','added@example.test')");
            sql.executeUpdate("INSERT INTO project (project_id,name,created_by) VALUES"
                    + " ('00000000-0000-0000-0000-000000000010','Made','00000000-0000-0000-0000-000000000004'),"
                    + " ('00000000-0000-0000-0000-000000000011','Tagged',NULL)");
            // The maker added themselves; the member was added by the maker; in the second project the maker of the
            // project row (an added member) is its administrator too.
            sql.executeUpdate("INSERT INTO project_member (project_id,user_id,created_by) VALUES"
                    + " ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),"
                    + " ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001'),"
                    + " ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001'),"
                    + " ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000002',NULL)");
        }
        Flyway.configure().dataSource(url, "", "").load().migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement();
                var rows = sql.executeQuery("SELECT project_id, user_id, role FROM project_member")) {
            var roles = new HashMap<String, String>();
            while (rows.next())
                roles.put(
                        rows.getString(1).substring(34) + ":"
                                + rows.getString(2).substring(35),
                        rows.getString(3));
            assertThat(roles)
                    .containsOnly(
                            org.assertj.core.api.Assertions.entry("10:1", "ADMIN"),
                            org.assertj.core.api.Assertions.entry("10:2", "EDITOR"),
                            org.assertj.core.api.Assertions.entry("10:4", "ADMIN"),
                            org.assertj.core.api.Assertions.entry("11:2", "EDITOR"));
        }
    }
}
