-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scores Table
CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    score BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id)
);

-- Score History Table (Audit Trail)
CREATE TABLE IF NOT EXISTS score_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    score_increment INT NOT NULL,
    previous_score BIGINT NOT NULL,
    new_score BIGINT NOT NULL,
    action_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_score_history_user_id ON score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_score_history_created_at ON score_history(created_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Composite index for efficient leaderboard queries
CREATE INDEX IF NOT EXISTS idx_scores_leaderboard ON scores(score DESC, user_id);

