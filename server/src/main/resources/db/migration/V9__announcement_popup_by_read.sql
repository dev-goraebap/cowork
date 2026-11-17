-- A popup is for reading the notice, so a notice the member read in any way (its page, 확인했어요 on the popup) no
-- longer pops up for them; announcement_read already says so, and the separate record of 확인했어요 goes.
DROP TABLE announcement_popup_confirmed;
