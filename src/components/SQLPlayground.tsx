import React, { useState } from 'react';
import { useDBStore } from '../postgres-db/stores';
import { executeQuery } from '../postgres-proxy/utils';

const SQLPlayground: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeSqlQuery = async () => {
    try {
      setError(null);
      const result = await executeQuery(query);
      setResults(result);
    } catch (err) {
      setError((err as Error).message);
      setResults(null);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '1.75rem', 
        fontWeight: 'bold', 
        marginBottom: '1.5rem',
        color: '#2d3748'
      }}>SQL Playground</h1>
      
      <h5 style={{ 
        fontSize: '1rem', 
        fontWeight: 'bold', 
        color: '#2d3748'
      }}>If you're a power user, the table is your playground. </h5>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: 'calc(100vh - 150px)'
      }}>
        {/* Query Input Area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: '0 0 40%'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <label style={{ fontWeight: '600', color: '#4a5568' }}>SQL Query</label>
            <button
              style={{
                backgroundColor: '#4299e1',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3182ce'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4299e1'}
              onClick={executeSqlQuery}
            >
              Execute Query
            </button>
          </div>
          <textarea
            style={{
              width: '100%',
              height: '100%',
              padding: '1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              resize: 'none',
              backgroundColor: '#f7fafc',
              outline: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
            }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SELECT * FROM graphs;"
          />
        </div>

        {/* Results Area */}
        <div style={{
          flex: '1 1 60%',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
          borderRadius: '0.375rem',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#edf2f7',
            borderBottom: '1px solid #e2e8f0',
            fontWeight: '600',
            color: '#4a5568'
          }}>
            Results
          </div>
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '1rem',
            backgroundColor: 'white'
          }}>
            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fed7d7',
                border: '1px solid #fc8181',
                color: '#c53030',
                borderRadius: '0.375rem',
                marginBottom: '1rem'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
            
            {results && results[0] && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7fafc' }}>
                      {Object.keys(results[0].rows[0] || {}).map((key) => (
                        <th key={key} style={{
                          border: '1px solid #e2e8f0',
                          padding: '0.75rem',
                          textAlign: 'left',
                          fontWeight: '600'
                        }}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results[0].rows.map((row: any, index: number) => (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? 'white' : '#f7fafc'
                      }}>
                        {Object.values(row).map((value: any, cellIndex: number) => (
                          <td key={cellIndex} style={{
                            border: '1px solid #e2e8f0',
                            padding: '0.75rem',
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {value?.toString() || 
                              <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {!error && (!results || !results[0]) && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#718096',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No results to display</p>
                <p style={{ fontSize: '0.875rem' }}>Execute a query to see results here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SQLPlayground;