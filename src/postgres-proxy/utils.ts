import { useDBStore } from "../postgres-db/stores";


export const executeQuery = async (query: string) => {

    const result = useDBStore.getState().execute(query);
    console.log("executing statement result", result);
    return result;
};

export const getRecordsFromTable = async (table_name: string) => {

    const result = useDBStore.getState().execute("select * from " + table_name+";");
    console.log("executing statement result", result);
    return result;
};

export const getGraphsData = async () => {
    console.log("Getting graphs data");
    
    // First, check if any graphs exist
    const checkQuery = `SELECT COUNT(*) as count FROM graphs;`;
    const checkResult = await executeQuery(checkQuery);
    const count = checkResult[0].rows[0].count;
    
    console.log(`Found ${count} graphs in total`);
    
    // If no graphs exist, create some sample graphs
    // if (count === 0) {
    //     console.log("No graphs found, creating sample graphs");
    //     await createSampleGraphs();
    // }
    
    // Now get all graphs with should_display = true
    const query = `
        SELECT *
        FROM graphs WHERE should_display = true;
    `;
    
    const result = await executeQuery(query);
    console.log("result", result);
    
    if (result && result[0].rows) {
        console.log(`Retrieved ${result[0].rows.length} graphs with should_display = true`);
        
        // If no displayable graphs found, update all graphs to be displayable
        if (result[0].rows.length === 0) {
            console.log("No displayable graphs found, updating all graphs to be displayable");
            await executeQuery(`UPDATE graphs SET should_display = true;`);
            
            // Fetch again after update
            const updatedResult = await executeQuery(query);
            console.log("Updated result", updatedResult);
            return updatedResult[0].rows;
        }
    }
    
    return result[0].rows || [];
};

// Helper function to create sample graphs if none exist
const createSampleGraphs = async () => {
    const sampleGraphQueries = [
        `INSERT INTO graphs (
            title, 
            type, 
            data_query, 
            dataset_label, 
            background_colors, 
            hover_background_colors, 
            should_display
        ) VALUES (
            'Tasks Completed by Day', 
            'bar', 
            'WITH date_series AS (
                SELECT generate_series(
                    DATE(NOW() - INTERVAL ''6 days''), 
                    DATE(NOW()), 
                    ''1 day''::interval
                )::date AS date
            ), 
            task_counts AS (
                SELECT DATE(completed_at) AS date, COUNT(*) AS count 
                FROM tasks 
                WHERE completed_at IS NOT NULL 
                AND completed_at >= NOW() - INTERVAL ''7 days'' 
                GROUP BY DATE(completed_at)
            ) 
            SELECT ds.date AS key, COALESCE(tc.count, 0) AS value 
            FROM date_series ds 
            LEFT JOIN task_counts tc ON ds.date = tc.date 
            ORDER BY ds.date;', 
            'Tasks', 
            ARRAY['#36A2EB', '#4BC0C0', '#FFCE56', '#FF6384', '#9966FF'], 
            ARRAY['#1E90FF', '#3CB371', '#FFD700', '#FF4500', '#8A2BE2'], 
            true
        );`,
        
        `INSERT INTO graphs (
            title, 
            type, 
            data_query, 
            dataset_label, 
            background_colors, 
            hover_background_colors, 
            should_display
        ) VALUES (
            'Project Progress', 
            'pie', 
            'SELECT status AS key, COUNT(*) AS value 
            FROM tasks 
            GROUP BY status;', 
            'Status', 
            ARRAY['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'], 
            ARRAY['#FF4500', '#1E90FF', '#FFD700', '#3CB371'], 
            true
        );`
    ];
    
    for (const query of sampleGraphQueries) {
        await executeQuery(query);
    }
    
    console.log("Sample graphs created successfully");
};
