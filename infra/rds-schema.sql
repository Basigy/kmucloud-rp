-- ============================================================
-- The Verdict - RDS 스키마 (MySQL 호환)
-- 기존 RDS에서 실행하세요
-- ============================================================

CREATE DATABASE IF NOT EXISTS the_verdict
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE the_verdict;

-- ── 사건 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cases (
  case_id       VARCHAR(64)   PRIMARY KEY,
  difficulty    VARCHAR(10)   NOT NULL DEFAULT 'easy',
  title         VARCHAR(200)  NOT NULL,
  subtitle      VARCHAR(200),
  case_data     JSON          NOT NULL COMMENT '전체 사건 JSON (locations, suspects, evidence, truth 등)',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME      COMMENT '자동 삭제용 (7일 후)',
  INDEX idx_created (created_at),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- ── 게임 진행 상황 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_progress (
  id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
  case_id                 VARCHAR(64)   NOT NULL,
  user_id                 VARCHAR(64)   NOT NULL,
  completed_investigations JSON         COMMENT '완료된 조사 ID 배열',
  collected_evidence       JSON         COMMENT '수집된 증거 ID 배열',
  updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_case_user (case_id, user_id),
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 심문 대화 이력 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS interrogation_history (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  case_id       VARCHAR(64)   NOT NULL,
  user_id       VARCHAR(64),
  suspect_id    VARCHAR(64)   NOT NULL,
  question_id   VARCHAR(64)   NOT NULL,
  question_text TEXT,
  answer_text   TEXT          NOT NULL,
  stress_level  INT           NOT NULL DEFAULT 0,
  confessed     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  INDEX idx_case_suspect (case_id, suspect_id)
) ENGINE=InnoDB;

-- ── 게임 결과 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_results (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  case_id         VARCHAR(64)   NOT NULL,
  user_id         VARCHAR(64),
  is_correct      BOOLEAN       NOT NULL DEFAULT FALSE,
  culprit_correct BOOLEAN       NOT NULL DEFAULT FALSE,
  motive_correct  BOOLEAN       NOT NULL DEFAULT FALSE,
  method_correct  BOOLEAN       NOT NULL DEFAULT FALSE,
  score           INT           NOT NULL DEFAULT 0,
  remaining_ap    INT           NOT NULL DEFAULT 0,
  evidence_count  INT           NOT NULL DEFAULT 0,
  ending_text     TEXT,
  confession_text TEXT,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
  INDEX idx_score (score DESC)
) ENGINE=InnoDB;

-- ── 리더보드 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  player_name     VARCHAR(50)   NOT NULL,
  case_id         VARCHAR(64),
  case_title      VARCHAR(200),
  difficulty      VARCHAR(10)   NOT NULL,
  score           INT           NOT NULL DEFAULT 0,
  is_correct      BOOLEAN       NOT NULL DEFAULT FALSE,
  remaining_ap    INT           NOT NULL DEFAULT 0,
  evidence_count  INT           NOT NULL DEFAULT 0,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_difficulty_score (difficulty, score DESC),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ── 만료 데이터 정리 이벤트 (선택) ──────────────────────
-- MySQL 이벤트 스케줄러로 7일 지난 사건 자동 삭제
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_expired_cases
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
  DELETE FROM cases WHERE expires_at IS NOT NULL AND expires_at < NOW();
END //
DELIMITER ;
