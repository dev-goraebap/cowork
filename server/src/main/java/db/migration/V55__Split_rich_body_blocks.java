package db.migration;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.zip.GZIPOutputStream;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * 본문을 최상위 블록 행(rich_block)으로 나눈다(V54가 만든 테이블). 본문마다 맨 바깥 블록을 차례대로 한 행씩 넣고, 블록 id가 없거나
 * 겹치면 새로 매겨 조립본(rich_body.body)에도 같은 id를 쓴다(화면이 다시 매기면 블록이 모두 바뀐 것으로 보인다). 루트 attrs(페이지
 * 설정 등)는 rich_body.attrs로 옮긴다. 블록 version은 지금 본문 version이고, 순서 키는 고르게 띄운 6자리 키다.
 *
 * <p>버전 사본(rich_body_revision)은 gzip으로 줄여 body_gz에 두고 body는 비운다.
 */
public class V55__Split_rich_body_blocks extends BaseJavaMigration {
    private static final JsonMapper JSON = JsonMapper.builder()
            .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
            .build();
    private static final int PAGE = 50;
    private static final String DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        // 본문·사본이 클 수 있으니(본문 하나 최대 2MB) 한 번에 PAGE개씩 읽어 옮긴다.
        String after = "";
        while (true) {
            List<String[]> bodies = page(
                    connection,
                    "SELECT owner_id,body,version,updated_by FROM rich_body WHERE owner_id>? ORDER BY owner_id LIMIT "
                            + PAGE,
                    after,
                    4);
            if (bodies.isEmpty()) break;
            split(connection, bodies);
            after = bodies.getLast()[0];
        }
        after = "";
        while (true) {
            List<String[]> revisions = page(
                    connection,
                    "SELECT revision_id,body FROM rich_body_revision WHERE body_gz IS NULL AND revision_id>?"
                            + " ORDER BY revision_id LIMIT " + PAGE,
                    after,
                    2);
            if (revisions.isEmpty()) break;
            try (var compress = connection.prepareStatement(
                    "UPDATE rich_body_revision SET body_gz=?,body='' WHERE revision_id=?")) {
                for (String[] revision : revisions) {
                    compress.setBytes(1, gzip(revision[1]));
                    compress.setString(2, revision[0]);
                    compress.addBatch();
                }
                compress.executeBatch();
            }
            after = revisions.getLast()[0];
        }
    }

    private static List<String[]> page(Connection connection, String sql, String after, int columns)
            throws java.sql.SQLException {
        List<String[]> rows = new ArrayList<>();
        try (var statement = connection.prepareStatement(sql)) {
            statement.setString(1, after);
            try (var found = statement.executeQuery()) {
                while (found.next()) {
                    var row = new String[columns];
                    for (int column = 0; column < columns; column++) row[column] = found.getString(column + 1);
                    rows.add(row);
                }
            }
        }
        return rows;
    }

    /** 본문마다 블록 행을 넣고, 조립본을 블록에서 다시 만든다(저장이 만드는 글과 똑같게: 루트에는 attrs·content·type만). */
    private static void split(Connection connection, List<String[]> bodies) throws Exception {
        try (var insert = connection.prepareStatement(
                        "INSERT INTO rich_block(owner_id,block_id,position,node,version,updated_by) VALUES(?,?,?,?,?,?)");
                var update = connection.prepareStatement("UPDATE rich_body SET body=?,attrs=? WHERE owner_id=?")) {
            for (String[] body : bodies) {
                // Maps, not a tree: the sorted key order holds only for maps, and the blocks must be written as a save
                // writes them.
                if (!(JSON.readValue(body[1], Object.class) instanceof Map<?, ?> root)) continue;
                String attrs = root.get("attrs") instanceof Map<?, ?> found && !found.isEmpty()
                        ? JSON.writeValueAsString(found)
                        : null;
                Set<String> seen = new HashSet<>();
                List<String> nodes = new ArrayList<>();
                if (root.get("content") instanceof List<?> blocks) {
                    for (Object block : blocks) {
                        if (!(block instanceof Map<?, ?> found)) continue;
                        var node = new LinkedHashMap<String, Object>();
                        found.forEach((key, value) -> node.put(String.valueOf(key), value));
                        var blockAttrs = new LinkedHashMap<String, Object>();
                        if (node.get("attrs") instanceof Map<?, ?> given)
                            given.forEach((key, value) -> blockAttrs.put(String.valueOf(key), value));
                        String id = blockAttrs.get("blockId") instanceof String given ? given : "";
                        if (id.isBlank() || id.length() > 64 || !seen.add(id)) {
                            id = UUID.randomUUID().toString();
                            seen.add(id);
                        }
                        blockAttrs.put("blockId", id);
                        node.put("attrs", blockAttrs);
                        String text = JSON.writeValueAsString(node);
                        nodes.add(text);
                        insert.setString(1, body[0]);
                        insert.setString(2, id);
                        insert.setString(3, position(nodes.size() - 1));
                        insert.setString(4, text);
                        insert.setLong(5, Long.parseLong(body[2]));
                        insert.setString(6, body[3]);
                        insert.addBatch();
                    }
                }
                insert.executeBatch();
                update.setString(
                        1,
                        "{" + (attrs == null ? "" : "\"attrs\":" + attrs + ",") + "\"content\":["
                                + String.join(",", nodes) + "],\"type\":\"doc\"}");
                update.setString(2, attrs);
                update.setString(3, body[0]);
                update.executeUpdate();
            }
        }
    }

    /** index번째 블록의 순서 키: 6자리 36진수를 고르게 띄우고, 끝자리를 0이 아니게 둔다(사이에 언제든 새 키를 넣을 수 있게). */
    static String position(int index) {
        long value = (long) index * 46_656L + 18L;
        char[] key = new char[6];
        for (int at = 5; at >= 0; at--) {
            key[at] = DIGITS.charAt((int) (value % 36));
            value /= 36;
        }
        return new String(key);
    }

    private static byte[] gzip(String text) throws IOException {
        var bytes = new ByteArrayOutputStream();
        try (var zip = new GZIPOutputStream(bytes)) {
            zip.write(text.getBytes(StandardCharsets.UTF_8));
        }
        return bytes.toByteArray();
    }
}
