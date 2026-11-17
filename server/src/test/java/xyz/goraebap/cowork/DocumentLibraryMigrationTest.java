package xyz.goraebap.cowork;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DocumentLibraryMigrationTest {
    @TempDir
    Path directory;

    @Test
    void workspaceLabelsSplitLegacyPathsAndKeepViewReferences() throws Exception {
        var url = "jdbc:sqlite:" + directory.resolve("labels.db");
        Flyway.configure()
                .initSql("PRAGMA foreign_keys=ON")
                .dataSource(url, "", "")
                .target("51")
                .load()
                .migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.execute("PRAGMA foreign_keys=ON");
            sql.executeUpdate("INSERT INTO project(project_id,name) VALUES('p1','One'),('p2','Two')");
            sql.executeUpdate(
                    "INSERT INTO document(document_id,project_id,title) VALUES('d1','p1','One'),('d2','p2','Two')");
            sql.executeUpdate(
                    "INSERT INTO document_label(label_id,project_id,name) VALUES('l1','p1','명세 / 개발'),('l2','p2','명세 / 운영')");
            sql.executeUpdate("INSERT INTO document_folder(folder_id,project_id,name) VALUES('empty','p1','AI 노트')");
            sql.executeUpdate("INSERT INTO document_label(label_id,project_id,name) VALUES('empty','p1','명세 / AI 노트')");
            sql.executeUpdate("INSERT INTO document_label_link VALUES('d1','l1'),('d2','l2')");
            sql.executeUpdate(
                    "INSERT INTO document_view(view_id,project_id,name,label_ids) VALUES('v','p1','View','[\"l1\"]')");
        }
        Flyway.configure()
                .initSql("PRAGMA foreign_keys=ON")
                .dataSource(url, "", "")
                .load()
                .migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            try (var row = sql.executeQuery(
                    "SELECT count(*),count(DISTINCT color) FROM document_label WHERE name NOT LIKE '%/%'")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getInt(1)).isEqualTo(3);
                assertThat(row.getInt(2)).isEqualTo(3);
            }
            try (var row = sql.executeQuery("SELECT count(*) FROM document_label_link WHERE document_id='d1'")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getInt(1)).isEqualTo(2);
            }
            try (var row = sql.executeQuery(
                    "SELECT count(*) FROM document_view v,json_each(v.label_ids) j JOIN document_label l ON l.label_id=j.value WHERE v.view_id='v'")) {
                assertThat(row.next()).isTrue();
                assertThat(row.getInt(1)).isEqualTo(2);
            }
            try (var row = sql.executeQuery("PRAGMA foreign_key_check")) {
                assertThat(row.next()).isFalse();
            }
        }
    }

    @Test
    void migrationPreservesReferencesHistoryAndAccessAndRemovesShared() throws Exception {
        var url = "jdbc:sqlite:" + directory.resolve("library.db");
        Flyway.configure()
                .initSql("PRAGMA foreign_keys=ON")
                .dataSource(url, "", "")
                .target("49")
                .load()
                .migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            sql.execute("PRAGMA foreign_keys=ON");
            sql.executeUpdate("INSERT INTO project(project_id,name) VALUES('p','Project')");
            sql.executeUpdate("INSERT INTO document_folder(folder_id,project_id,name) VALUES('f','p','Design')");
            sql.executeUpdate(
                    "INSERT INTO document(document_id,project_id,folder_id,title,kind,created_by) VALUES('m','p','f','Guide','MANUAL','maker')");
            sql.executeUpdate("INSERT INTO document(document_id,title) VALUES('s','Shared')");
            sql.executeUpdate(
                    "INSERT INTO manual_chapter(chapter_id,document_id,title,position,created_by) VALUES('c','m','Start',0,'writer')");
            sql.executeUpdate(
                    "INSERT INTO manual_chapter(chapter_id,document_id,parent_id,title,position) VALUES('child','m','c','Install',0)");
            sql.executeUpdate(
                    "INSERT INTO document_grant(grant_id,target_type,target_id,subject_type,level) VALUES('grant','DOCUMENT','m','OWNER','READ')");
            sql.executeUpdate(
                    "INSERT INTO rich_body(owner_id,owner_type,body,anchors,version) VALUES('c','MANUAL_CHAPTER','{\"type\":\"doc\"}','{}',7)");
            sql.executeUpdate(
                    "INSERT INTO rich_body_revision(revision_id,owner_id,body,anchors,comment_seq,reason) VALUES('r','c','{\"type\":\"doc\"}','{}',0,'baseline')");
        }
        var flyway = Flyway.configure()
                .initSql("PRAGMA foreign_keys=ON")
                .dataSource(url, "", "")
                .load();
        flyway.migrate();
        flyway.migrate();
        try (var connection = DriverManager.getConnection(url);
                var sql = connection.createStatement()) {
            try (var rows = sql.executeQuery("SELECT kind,folder_id FROM document WHERE document_id='c'")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("PAGE");
                assertThat(rows.getString(2)).isEqualTo("f");
            }
            try (var rows = sql.executeQuery("SELECT parent_id,document_id FROM document WHERE document_id='child'")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("c");
                assertThat(rows.getString(2)).isEqualTo("child");
            }
            try (var rows =
                    sql.executeQuery("SELECT subject_type,subject_id FROM document_grant WHERE target_id='c'")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("USER");
                assertThat(rows.getString(2)).isEqualTo("maker");
            }
            try (var rows = sql.executeQuery("SELECT owner_type,version FROM rich_body WHERE owner_id='c'")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("PROJECT_DOCUMENT");
                assertThat(rows.getLong(2)).isEqualTo(7);
            }
            try (var rows = sql.executeQuery("SELECT count(*) FROM rich_body_revision WHERE owner_id='c'")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getInt(1)).isEqualTo(1);
            }
            try (var rows = sql.executeQuery(
                    "SELECT count(*) FROM document WHERE document_id='s' AND deleted_at IS NOT NULL")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getInt(1)).isEqualTo(1);
            }
            try (var rows = sql.executeQuery("SELECT count(*) FROM document_label_link")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getInt(1)).isEqualTo(1);
            }
            try (var rows = sql.executeQuery("PRAGMA foreign_key_check")) {
                assertThat(rows.next()).isFalse();
            }
        }
    }
}
