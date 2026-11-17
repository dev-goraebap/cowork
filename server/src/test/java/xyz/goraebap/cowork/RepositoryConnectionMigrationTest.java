package xyz.goraebap.cowork;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class RepositoryConnectionMigrationTest {
    @TempDir
    Path directory;

    @Test
    void upgradePreservesConnectionsAndLinksAndChangesOnlyRepositoryUniqueness() throws Exception {
        String url = "jdbc:sqlite:" + directory.resolve("repositories.db");
        Flyway.configure().dataSource(url, "", "").target("48").load().migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.execute("PRAGMA foreign_keys=ON");
            sql.executeUpdate("INSERT INTO project(project_id,name) VALUES ('p','Example')");
            sql.executeUpdate(
                    "INSERT INTO issue_column(column_id,project_id,name,category,position) VALUES ('c','p','Todo','UNSTARTED',0)");
            sql.executeUpdate(
                    "INSERT INTO issue(issue_id,project_id,number,title,type,column_id,position,priority) VALUES ('i','p',1,'Example','TASK','c',0,'NONE')");
            sql.executeUpdate("""
                    INSERT INTO repository_integration(integration_id,project_id,provider,base_url,repository,web_url,
                        token_cipher,webhook_secret_cipher,webhook_id,external_repository_id,version)
                    VALUES ('frontend','p','gitlab','https://git.example.test','team/frontend','https://git.example.test/team/frontend',
                        'sealed-token','sealed-secret','hook-1','remote-1',7)
                    """);
            sql.executeUpdate("""
                    INSERT INTO code_link(code_link_id,integration_id,issue_id,kind,external_id,url,title,state,created_at,updated_at)
                    VALUES ('link','frontend','i','branch','feature/EX-1','https://git.example.test/branch','Branch','open',
                        '2026-11-01T00:00:00.000000Z','2026-11-01T00:00:00.000000Z')
                    """);
        }
        var flyway = Flyway.configure().dataSource(url, "", "").load();
        flyway.migrate();
        flyway.migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.execute("PRAGMA foreign_keys=ON");
            try (var row = sql.executeQuery(
                    "SELECT token_cipher,webhook_secret_cipher,webhook_id,external_repository_id,version FROM repository_integration WHERE integration_id='frontend'")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getString(1)).isEqualTo("sealed-token");
                assertThat(row.getString(2)).isEqualTo("sealed-secret");
                assertThat(row.getString(3)).isEqualTo("hook-1");
                assertThat(row.getString(4)).isEqualTo("remote-1");
                assertThat(row.getLong(5)).isEqualTo(7);
            }
            sql.executeUpdate("""
                    INSERT INTO repository_integration(integration_id,project_id,provider,base_url,repository,web_url,webhook_secret_cipher)
                    VALUES ('backend','p','gitlab','https://git.example.test','team/backend','https://git.example.test/team/backend','another-secret')
                    """);
            assertThatThrownBy(() -> sql.executeUpdate("""
                    INSERT INTO repository_integration(integration_id,project_id,provider,base_url,repository,web_url,webhook_secret_cipher)
                    VALUES ('duplicate','p','gitlab','https://git.example.test','TEAM/FRONTEND','https://git.example.test/team/frontend','secret')
                    """)).isInstanceOf(SQLException.class);
            try (var rows = sql.executeQuery("SELECT integration_id FROM code_link WHERE code_link_id='link'")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("frontend");
            }
            try (var rows = sql.executeQuery("PRAGMA foreign_key_check")) {
                assertThat(rows.next()).isFalse();
            }
        }
    }
}
