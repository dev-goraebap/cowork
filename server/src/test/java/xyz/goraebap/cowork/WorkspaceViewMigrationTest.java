package xyz.goraebap.cowork;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class WorkspaceViewMigrationTest {
    @TempDir
    Path directory;

    @Test
    void upgradeKeepsCustomViewsAndOrderAndAllowsWorkspaceBoards() throws Exception {
        String url = "jdbc:sqlite:" + directory.resolve("custom-views.db");
        Flyway.configure().dataSource(url, "", "").target("41").load().migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.executeUpdate("UPDATE issue_view SET name='내 맞춤 뷰',version=2,filters='{\"priority\":\"HIGH\"}'");
            sql.executeUpdate(
                    "INSERT INTO issue_view_order(scope,view_keys) SELECT 'area',json_array(view_id,'all') FROM issue_view");
        }
        var flyway = Flyway.configure().dataSource(url, "", "").load();
        flyway.migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            try (var rows = sql.executeQuery("SELECT name,version,filters,view_id FROM issue_view")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("내 맞춤 뷰");
                assertThat(rows.getLong(2)).isEqualTo(2);
                assertThat(rows.getString(3)).isEqualTo("{\"priority\":\"HIGH\"}");
                String id = rows.getString(4);
                try (var order = connection.createStatement();
                        var keys = order.executeQuery("SELECT view_keys FROM issue_view_order")) {
                    assertThat(keys.next()).isTrue();
                    assertThat(keys.getString(1)).isEqualTo("[\"" + id + "\",\"all\"]");
                }
                assertThat(rows.next()).isFalse();
            }
            sql.executeUpdate("UPDATE issue_view SET layout='BOARD'");
            try (var rows = sql.executeQuery("PRAGMA foreign_key_check")) {
                assertThat(rows.next()).isFalse();
            }
        }
        flyway.migrate();
    }

    @Test
    void freshWorkspaceStartsWithKanbanAndBacklogOnce() throws Exception {
        String url = "jdbc:sqlite:" + directory.resolve("fresh-views.db");
        var flyway = Flyway.configure().dataSource(url, "", "").load();
        flyway.migrate();
        flyway.migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement();
                var rows = sql.executeQuery("SELECT name,layout,filters FROM issue_view ORDER BY created_at,view_id")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getString(1)).isEqualTo("칸반보드");
            assertThat(rows.getString(2)).isEqualTo("BOARD");
            assertThat(rows.getString(3)).isEqualTo("{}");
            assertThat(rows.next()).isTrue();
            assertThat(rows.getString(1)).isEqualTo("백로그");
            assertThat(rows.getString(3)).isEqualTo("{\"status\":\"BACKLOG\"}");
            assertThat(rows.next()).isFalse();
        }
    }
}
