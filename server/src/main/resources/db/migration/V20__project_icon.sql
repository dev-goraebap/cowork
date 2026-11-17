-- The picture a project shows on its card, in the menu and at its head: one of the drawn icons by its fixed id,
-- motif then background colour (rocket-lilac). Empty, or an id the screens no longer draw, shows the default icon.
ALTER TABLE pj_project ADD COLUMN icon varchar(40);
