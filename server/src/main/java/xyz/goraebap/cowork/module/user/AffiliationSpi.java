package xyz.goraebap.cowork.module.user;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** The department each member belongs to, by name, implemented by the space that keeps the organization. */
public interface AffiliationSpi {
    /** Department names of the given members who have one; the rest are left out. */
    Map<UUID, String> departmentNamesOf(Collection<UUID> userIds);
}
