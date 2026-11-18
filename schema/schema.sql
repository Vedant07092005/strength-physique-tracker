CREATE DATABASE IF NOT EXISTS forge
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE forge;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exercises (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NULL,
  name VARCHAR(100) NOT NULL,
  muscle_group VARCHAR(60) NOT NULL,
  equipment VARCHAR(60) NULL,
  archived_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exercise_owner_name (owner_id, name),
  KEY idx_exercises_owner_active (owner_id, archived_at),
  CONSTRAINT fk_exercises_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workouts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  workout_date DATE NOT NULL,
  title VARCHAR(100) NOT NULL DEFAULT 'Training session',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_workouts_user_date (user_id, workout_date, id),
  CONSTRAINT fk_workouts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workout_exercises (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workout_id BIGINT UNSIGNED NOT NULL,
  exercise_id BIGINT UNSIGNED NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  notes VARCHAR(500) NULL,
  PRIMARY KEY (id),
  KEY idx_workout_exercises_workout_position (workout_id, position),
  KEY idx_workout_exercises_exercise (exercise_id),
  CONSTRAINT fk_workout_exercises_workout FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE,
  CONSTRAINT fk_workout_exercises_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workout_sets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workout_exercise_id BIGINT UNSIGNED NOT NULL,
  set_number SMALLINT UNSIGNED NOT NULL,
  reps SMALLINT UNSIGNED NULL,
  weight_kg DECIMAL(7,2) NULL,
  duration_seconds INT UNSIGNED NULL,
  is_warmup BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workout_set_order (workout_exercise_id, set_number),
  CONSTRAINT fk_workout_sets_exercise FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS physique_checkins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  checkin_date DATE NOT NULL,
  bodyweight_kg DECIMAL(6,2) NULL,
  body_fat_pct DECIMAL(5,2) NULL,
  waist_cm DECIMAL(6,2) NULL,
  hips_cm DECIMAL(6,2) NULL,
  chest_cm DECIMAL(6,2) NULL,
  arm_cm DECIMAL(6,2) NULL,
  thigh_cm DECIMAL(6,2) NULL,
  notes VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_checkin_user_date (user_id, checkin_date),
  KEY idx_checkins_user_date (user_id, checkin_date),
  CONSTRAINT fk_checkins_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
