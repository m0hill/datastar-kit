CREATE TABLE `app_state` (
  `key` text PRIMARY KEY NOT NULL,
  `version` integer DEFAULT 0 NOT NULL
);

CREATE TABLE `todos` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `completed` integer DEFAULT false NOT NULL,
  `created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);

INSERT OR IGNORE INTO `app_state` (`key`, `version`) VALUES ('todos', 0);
