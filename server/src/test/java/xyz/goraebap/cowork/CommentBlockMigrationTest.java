package xyz.goraebap.cowork;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class CommentBlockMigrationTest {
    @TempDir
    Path directory;

    @Test
    void quotedCommentsTakeTheOneBlockTheirWordsAreIn() throws Exception {
        var url = "jdbc:sqlite:" + directory.resolve("comments.db");
        Flyway.configure()
                .initSql("PRAGMA foreign_keys=ON")
                .dataSource(url, "", "")
                .target("55")
                .load()
                .migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.executeUpdate(
                    "INSERT INTO rich_body(owner_id,owner_type,body,anchors,version) VALUES('o','PROJECT_DOCUMENT','{}','{}',1)");
            sql.executeUpdate("INSERT INTO rich_block(owner_id,block_id,position,node,version) VALUES"
                    + "('o','a','a0','{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"로그인은 \"},"
                    + "{\"type\":\"text\",\"marks\":[{\"type\":\"bold\"}],\"text\":\"메일 코드\"},{\"type\":\"text\",\"text\":\"로 한다\"}]}',1),"
                    + "('o','b','a1','{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"공통 문장\"}]}',1),"
                    + "('o','c','a2','{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\","
                    + "\"content\":[{\"type\":\"text\",\"text\":\"공통 문장\"}]}]}]}',1)");
            sql.executeUpdate("INSERT INTO activity_entry(entry_id,owner_type,owner_id,kind,body,quote) VALUES"
                    + "('one','PROJECT_DOCUMENT','o','COMMENT','좋아요','로그인은  메일\n코드로'),"
                    + "('two','PROJECT_DOCUMENT','o','COMMENT','어느 쪽?','공통 문장'),"
                    + "('none','PROJECT_DOCUMENT','o','COMMENT','없는 글','지워진 문장'),"
                    + "('plain','PROJECT_DOCUMENT','o','COMMENT','인용 없음',NULL)");
            sql.executeUpdate(
                    "INSERT INTO activity_entry(entry_id,owner_type,owner_id,kind,body,quote,parent_id) VALUES"
                            + "('reply','PROJECT_DOCUMENT','o','COMMENT','답글','로그인은','one')");
        }
        Flyway.configure()
                .initSql("PRAGMA foreign_keys=ON")
                .dataSource(url, "", "")
                .load()
                .migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement();
                var rows = sql.executeQuery("SELECT entry_id, block_id FROM activity_entry ORDER BY entry_id")) {
            var found = new java.util.TreeMap<String, String>();
            while (rows.next()) found.put(rows.getString(1), rows.getString(2));
            assertThat(found)
                    .containsEntry("one", "a")
                    .containsEntry("two", null)
                    .containsEntry("none", null)
                    .containsEntry("plain", null)
                    .containsEntry("reply", null);
        }
    }
}
