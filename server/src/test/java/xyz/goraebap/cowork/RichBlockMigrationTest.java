package xyz.goraebap.cowork;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.zip.GZIPInputStream;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class RichBlockMigrationTest {
    @TempDir
    Path directory;

    @Test
    void bodiesSplitIntoOrderedBlocksWithUniqueIdsAndRevisionsAreCompressed() throws Exception {
        var url = "jdbc:sqlite:" + directory.resolve("blocks.db");
        Flyway.configure()
                .initSql("PRAGMA foreign_keys=ON")
                .dataSource(url, "", "")
                .target("53")
                .load()
                .migrate();
        String body = "{\"type\":\"doc\",\"attrs\":{\"pageSetup\":{\"size\":\"A4\"}},\"content\":["
                + "{\"type\":\"heading\",\"attrs\":{\"level\":1,\"blockId\":\"a\"},\"content\":[{\"type\":\"text\",\"text\":\"One\"}]},"
                + "{\"type\":\"paragraph\",\"attrs\":{\"blockId\":\"a\"}},"
                + "{\"type\":\"paragraph\"}]}";
        try (var connection = DriverManager.getConnection(url)) {
            try (var insert = connection.prepareStatement(
                    "INSERT INTO rich_body(owner_id,owner_type,body,anchors,version) VALUES('o','PROJECT_DOCUMENT',?,'{}',7)")) {
                insert.setString(1, body);
                insert.executeUpdate();
            }
            try (var insert = connection.prepareStatement(
                    "INSERT INTO rich_body(owner_id,owner_type,body,anchors,version) VALUES('e','PROJECT_ISSUE',?,'{}',2)")) {
                insert.setString(
                        1, "{\"type\":\"doc\",\"attrs\":{},\"extra\":1,\"content\":[{\"type\":\"paragraph\"},7]}");
                insert.executeUpdate();
            }
            try (var insert = connection.prepareStatement(
                    "INSERT INTO rich_body_revision(revision_id,owner_id,body,anchors,comment_seq,reason)"
                            + " VALUES('r','o',?,'{}',0,'automatic')")) {
                insert.setString(1, body);
                insert.executeUpdate();
            }
        }
        Flyway.configure()
                .initSql("PRAGMA foreign_keys=ON")
                .dataSource(url, "", "")
                .load()
                .migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            var ids = new ArrayList<String>();
            var nodes = new ArrayList<String>();
            try (var rows = sql.executeQuery(
                    "SELECT block_id,node,version FROM rich_block WHERE owner_id='o' ORDER BY position")) {
                while (rows.next()) {
                    ids.add(rows.getString(1));
                    nodes.add(rows.getString(2));
                    assertThat(rows.getLong(3)).isEqualTo(7);
                }
            }
            assertThat(ids).hasSize(3).doesNotHaveDuplicates().startsWith("a");
            assertThat(nodes.get(0)).startsWith("{\"attrs\":{\"blockId\":\"a\",\"level\":1}");
            try (var row = sql.executeQuery("SELECT body,attrs FROM rich_body WHERE owner_id='o'")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getString(1))
                        .isEqualTo("{\"attrs\":{\"pageSetup\":{\"size\":\"A4\"}},\"content\":["
                                + String.join(",", nodes) + "],\"type\":\"doc\"}");
                assertThat(row.getString(2)).isEqualTo("{\"pageSetup\":{\"size\":\"A4\"}}");
            }
            try (var row = sql.executeQuery("SELECT body,body_gz FROM rich_body_revision WHERE revision_id='r'")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getString(1)).isEmpty();
                try (var zip = new GZIPInputStream(new ByteArrayInputStream(row.getBytes(2)))) {
                    assertThat(new String(zip.readAllBytes(), StandardCharsets.UTF_8))
                            .isEqualTo(body);
                }
            }
            // The body is written as a save writes it: only its blocks, no empty attrs or other root keys.
            try (var row = sql.executeQuery(
                    "SELECT b.body, b.attrs, k.node FROM rich_body b JOIN rich_block k ON k.owner_id=b.owner_id WHERE b.owner_id='e'")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getString(1)).isEqualTo("{\"content\":[" + row.getString(3) + "],\"type\":\"doc\"}");
                assertThat(row.getString(2)).isNull();
                assertThat(row.next()).isFalse();
            }
            try (var row = sql.executeQuery("PRAGMA foreign_key_check")) {
                assertThat(row.next()).isFalse();
            }
        }
    }
}
