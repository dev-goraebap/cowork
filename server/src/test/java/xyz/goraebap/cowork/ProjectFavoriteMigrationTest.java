package xyz.goraebap.cowork;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ProjectFavoriteMigrationTest {
    @TempDir
    Path directory;

    @Test
    void upgradeAddsExistingMembersOnceAndPreservesNonMemberFavoritesAndLaterOptOut() throws Exception {
        String url = "jdbc:sqlite:" + directory.resolve("favorites.db");
        Flyway.configure().dataSource(url, "", "").target("40").load().migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.executeUpdate(
                    "INSERT INTO users (user_id,email) VALUES ('00000000-0000-0000-0000-000000000001','one@example.test'), ('00000000-0000-0000-0000-000000000002','two@example.test'), ('00000000-0000-0000-0000-000000000003','three@example.test')");
            sql.executeUpdate(
                    "INSERT INTO project (project_id,name) VALUES ('00000000-0000-0000-0000-000000000010','Project')");
            sql.executeUpdate(
                    "INSERT INTO project_member (project_id,user_id) SELECT project_id,user_id FROM project CROSS JOIN users WHERE email <> 'three@example.test'");
            sql.executeUpdate(
                    "INSERT INTO project_favorite (project_id,user_id) SELECT project_id,user_id FROM project CROSS JOIN users WHERE email <> 'two@example.test'");
        }
        var flyway = Flyway.configure().dataSource(url, "", "").load();
        flyway.migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            try (var rows = sql.executeQuery("SELECT count(*) FROM project_favorite WHERE is_favorite")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getInt(1)).isEqualTo(3);
            }
            sql.executeUpdate(
                    "UPDATE project_favorite SET is_favorite=false WHERE user_id='00000000-0000-0000-0000-000000000002'");
        }
        flyway.migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            try (var rows = sql.executeQuery("SELECT count(*) FROM project_favorite WHERE is_favorite")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getInt(1)).isEqualTo(2);
            }
            try (var rows = sql.executeQuery("PRAGMA foreign_key_check")) {
                assertThat(rows.next()).isFalse();
            }
        }
    }
}
