-- Hardcoded categories
-- These will be used as constants in the application
-- Category IDs are also used as category names
-- 'cat_1': 'Food'
-- 'cat_2': 'Housing'
-- 'cat_3': 'Transportation'
-- 'cat_4': 'Utilities'
-- 'cat_5': 'Healthcare'
-- 'cat_6': 'Entertainment'
-- 'cat_7': 'Shopping'
-- 'cat_8': 'Education'
-- 'cat_9': 'Travel'
-- 'cat_10': 'Miscellaneous'
CREATE TABLE money_movement (
    id SERIAL PRIMARY KEY,
    from_acc VARCHAR(255),
    to_acc VARCHAR(255),
    from_name VARCHAR(255),
    to_name VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_category CHECK (category IN ('Housing', 'Groceries', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment', 'Dining Out', 'Education', 'Travel', 'Shopping', 'Personal Care', 'Gifts', 'Investments', 'Miscellaneous'))
);

CREATE TABLE graphs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data_query TEXT NOT NULL,
    dataset_label VARCHAR(255),
    background_colors TEXT[] DEFAULT ARRAY[
        '#FF6384', '#36A2EB', '#FFCE56', 
        '#4BC0C0', '#9966FF', '#FF9F40'
    ],
    hover_background_colors TEXT[],
    should_display BOOLEAN DEFAULT true, -- to indicate if the graph should be displayed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
