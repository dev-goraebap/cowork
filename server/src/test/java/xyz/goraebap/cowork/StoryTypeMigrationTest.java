package xyz.goraebap.cowork;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class StoryTypeMigrationTest {
    @TempDir
    Path directory;

    @Test
    void anUpgradePreservesExistingTypesDefaultsAndAUserCreatedStory() throws Exception {
        for (String existing : new String[] {"", "스토리", "Story"}) {
            String url = "jdbc:sqlite:" + directory.resolve("case-" + existing.length() + ".db");
            Flyway.configure().dataSource(url, "", "").target("39").load().migrate();
            try (var connection = DriverManager.getConnection(url);
                    var statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE work_item_type SET is_default=0 WHERE code='TASK'");
                statement.executeUpdate("UPDATE work_item_type SET is_default=1 WHERE code='FEATURE'");
                if (!existing.isEmpty()) {
                    try (var insert = connection.prepareStatement(
                            "INSERT INTO work_item_type (code,name,icon,color,position,is_default) VALUES ('CUSTOM',?,'document','#4cb782',4,0)")) {
                        insert.setString(1, existing);
                        insert.executeUpdate();
                    }
                }
            }
            Flyway.configure().dataSource(url, "", "").load().migrate();
            try (var connection = DriverManager.getConnection(url);
                    var statement = connection.createStatement()) {
                try (var types = statement.executeQuery("SELECT count(*) FROM work_item_type")) {
                    assertThat(types.next()).isTrue();
                    assertThat(types.getInt(1)).isEqualTo(5);
                }
                try (var defaults = statement.executeQuery("SELECT code FROM work_item_type WHERE is_default=1")) {
                    assertThat(defaults.next()).isTrue();
                    assertThat(defaults.getString(1)).isEqualTo("FEATURE");
                    assertThat(defaults.next()).isFalse();
                }
                try (var story = statement.executeQuery(
                        "SELECT code FROM work_item_type WHERE lower(name) IN ('스토리','story')")) {
                    assertThat(story.next()).isTrue();
                    assertThat(story.getString(1)).isEqualTo(existing.isEmpty() ? "STORY" : "CUSTOM");
                    assertThat(story.next()).isFalse();
                }
            }
        }
    }
}
