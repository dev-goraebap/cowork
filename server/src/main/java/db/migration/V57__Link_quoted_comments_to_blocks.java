package db.migration;

import java.sql.Connection;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * 이미 달린 인용 댓글(스레드 첫 댓글, quote만 있는 것)을 블록에 잇는다(V56). 인용한 글이 그 본문의 맨 바깥 블록 하나에만 들어 있으면
 * 그 블록에 달고, 없거나 여럿이면 위치 없는 댓글로 둔다. 글은 공백을 한 칸으로 줄여 비교한다.
 */
public class V57__Link_quoted_comments_to_blocks extends BaseJavaMigration {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        List<String[]> comments = new ArrayList<>();
        try (var statement = connection.createStatement();
                var rows = statement.executeQuery(
                        "SELECT entry_id, owner_id, quote FROM activity_entry WHERE kind = 'COMMENT'"
                                + " AND parent_id IS NULL AND block_id IS NULL AND quote IS NOT NULL AND trim(quote) <> ''")) {
            while (rows.next()) comments.add(new String[] {rows.getString(1), rows.getString(2), rows.getString(3)});
        }
        Map<String, List<String[]>> blocksOf = new HashMap<>();
        try (var read = connection.prepareStatement("SELECT block_id, node FROM rich_block WHERE owner_id = ?");
                var link = connection.prepareStatement("UPDATE activity_entry SET block_id = ? WHERE entry_id = ?")) {
            for (String[] comment : comments) {
                var blocks = blocksOf.computeIfAbsent(comment[1], owner -> {
                    var found = new ArrayList<String[]>();
                    try {
                        read.setString(1, owner);
                        try (var rows = read.executeQuery()) {
                            while (rows.next())
                                found.add(new String[] {
                                    rows.getString(1), squeeze(textOf(JSON.readTree(rows.getString(2))))
                                });
                        }
                    } catch (Exception failure) {
                        throw new IllegalStateException(failure);
                    }
                    return found;
                });
                String quote = squeeze(comment[2]);
                var matches = blocks.stream()
                        .filter(block -> block[1].contains(quote))
                        .toList();
                if (matches.size() != 1) continue;
                link.setString(1, matches.getFirst()[0]);
                link.setString(2, comment[0]);
                link.addBatch();
            }
            link.executeBatch();
        }
    }

    /** 블록의 글: 한 줄 안의 글(text)은 붙여 잇고, 안쪽 블록(문단·목록 항목·칸)이 끝날 때마다 한 칸 띄운다. */
    static String textOf(JsonNode node) {
        var text = new StringBuilder();
        collect(node, text);
        return text.toString();
    }

    private static void collect(JsonNode node, StringBuilder text) {
        if (node == null) return;
        if (node.get("text") != null && node.get("text").isString())
            text.append(node.get("text").asString());
        if (node.get("content") != null) {
            for (JsonNode child : node.get("content")) collect(child, text);
            text.append(' ');
        }
    }

    static String squeeze(String text) {
        return text == null ? "" : text.replaceAll("\\s+", " ").strip();
    }
}
