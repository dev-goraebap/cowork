package xyz.goraebap.cowork;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import java.sql.DriverManager;
import java.sql.SQLException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class AgentProfileMigrationTest {
    @TempDir
    Path directory;

    @Test
    void upgradeSeparatesEqualAgentNamesWithoutChangingCredentialsOrPastActors() throws Exception {
        String url = "jdbc:sqlite:" + directory.resolve("agents.db");
        Flyway.configure().dataSource(url, "", "").target("42").load().migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.executeUpdate(
                    "INSERT INTO users(user_id,email) VALUES ('00000000-0000-0000-0000-000000000001','one@example.test')");
            sql.executeUpdate(
                    "INSERT INTO agent_token(token_id,user_id,name,agent_name,prefix,token_hash,created_at,revoked_at) VALUES ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','노트북','Claude Code','prefix-one','hash-one','2026-11-01T00:00:00Z',null),('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','데스크톱','Claude Code','prefix-two','hash-two','2026-11-01T00:00:00Z','2026-11-02T00:00:00Z')");
            sql.executeUpdate(
                    "INSERT INTO activity_entry(entry_id,owner_type,owner_id,kind,field,created_at,created_by) VALUES ('00000000-0000-0000-0000-000000000004','ISSUE','00000000-0000-0000-0000-000000000005','EVENT','CREATED','2026-11-01T00:00:00Z','00000000-0000-0000-0000-000000000001')");
        }
        var flyway = Flyway.configure().dataSource(url, "", "").load();
        flyway.migrate();
        flyway.migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            try (var rows = sql.executeQuery(
                    "SELECT count(*),count(DISTINCT profile_id) FROM agent_token WHERE token_id=profile_id")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getInt(1)).isEqualTo(2);
                assertThat(rows.getInt(2)).isEqualTo(2);
            }
            try (var rows =
                    sql.executeQuery("SELECT token_hash,prefix,revoked_at FROM agent_token ORDER BY token_id")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("hash-one");
                assertThat(rows.getString(2)).isEqualTo("prefix-one");
                assertThat(rows.getString(3)).isNull();
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("hash-two");
                assertThat(rows.getString(3)).isEqualTo("2026-11-02T00:00:00Z");
            }
            try (var rows = sql.executeQuery("SELECT actor_source,agent_profile_id FROM activity_entry")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isNull();
                assertThat(rows.getString(2)).isNull();
            }
            try (var rows = sql.executeQuery("PRAGMA foreign_key_check")) {
                assertThat(rows.next()).isFalse();
            }
        }
    }

    @Test
    void upgradeSplitsSharedAgentsWithoutReassigningTheirOldActivity() throws Exception {
        String url = "jdbc:sqlite:" + directory.resolve("shared-agents.db");
        Flyway.configure().dataSource(url, "", "").target("44").load().migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.executeUpdate("""
                    INSERT INTO users(user_id,email) VALUES ('00000000-0000-0000-0000-000000000001','one@example.test')
                    """);
            sql.executeUpdate("""
                    INSERT INTO agent_profile(profile_id,user_id,name,icon,color)
                    VALUES ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Claude','agent','#2563eb'),
                           ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Draft','agent','#2563eb')
                    """);
            sql.executeUpdate("""
                    INSERT INTO agent_token(token_id,user_id,profile_id,name,agent_name,prefix,token_hash,created_at,expires_at,revoked_at)
                    VALUES ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
                            'Desktop','Claude','prefix-one','hash-one','2026-11-01T00:00:00Z','2027-01-01T00:00:00Z',null),
                           ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
                            'Laptop','Claude','prefix-two','hash-two','2026-11-01T00:00:00Z',null,'2026-11-02T00:00:00Z')
                    """);
            sql.executeUpdate("""
                    INSERT INTO activity_entry(entry_id,owner_type,owner_id,kind,field,created_at,created_by,agent_profile_id,agent_name)
                    VALUES ('00000000-0000-0000-0000-000000000006','ISSUE','00000000-0000-0000-0000-000000000007','EVENT','CREATED',
                            '2026-11-01T00:00:00Z','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Original')
                    """);
        }
        Flyway.configure().dataSource(url, "", "").load().migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            try (var rows = sql.executeQuery("""
                    SELECT token_hash,prefix,expires_at,revoked_at,agent_profile.profile_id,agent_profile.name
                    FROM agent_token JOIN agent_profile USING(profile_id) ORDER BY token_id
                    """)) {
                assertThat(rows.next()).isTrue();
                String profile = rows.getString(5);
                assertThat(rows.getString(1)).isEqualTo("hash-one");
                assertThat(rows.getString(2)).isEqualTo("prefix-one");
                assertThat(rows.getString(3)).isEqualTo("2027-01-01T00:00:00Z");
                assertThat(rows.getString(4)).isNull();
                assertThat(rows.getString(6)).isEqualTo("Claude");
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("hash-two");
                assertThat(rows.getString(4)).isEqualTo("2026-11-02T00:00:00Z");
                assertThat(rows.getString(5)).isNotEqualTo(profile);
                assertThat(rows.next()).isFalse();
            }
            try (var rows = sql.executeQuery("""
                    SELECT activity_entry.agent_name,agent_profile.legacy_shared
                    FROM activity_entry JOIN agent_profile ON agent_profile_id=profile_id
                    """)) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("Original");
                assertThat(rows.getBoolean(2)).isTrue();
            }
            try (var rows =
                    sql.executeQuery("SELECT count(*) FROM agent_profile WHERE name='Draft' AND NOT legacy_shared")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getInt(1)).isEqualTo(1);
            }
            assertThatThrownBy(() -> sql.executeUpdate("""
                    UPDATE agent_token SET profile_id=(SELECT profile_id FROM agent_token WHERE token_hash='hash-one')
                    WHERE token_hash='hash-two'
                    """)).isInstanceOf(SQLException.class);
            try (var rows = sql.executeQuery("PRAGMA foreign_key_check")) {
                assertThat(rows.next()).isFalse();
            }
        }
    }
}
