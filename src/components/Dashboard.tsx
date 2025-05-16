import React, { useState, useEffect } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, RadialLinearScale } from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { motion } from 'framer-motion'
import { getGraphsData, executeQuery } from '../postgres-proxy/utils'
import useAppStore from './state-utils/state-management'
import { GiUnicorn } from 'react-icons/gi'
import DashboardStaking from './Staking/DashboardStaking'
import { useWallet } from '@solana/wallet-adapter-react'
import { BarChart3, TrendingUp, Target } from 'lucide-react'
import './Dashboard.css'
import {useDBStore} from '../postgres-db/stores'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, RadialLinearScale)

interface ChartData {
  labels: any[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor: string[];
    hoverBackgroundColor?: string[];
  }[];
}

interface ChartInfo {
  id: number;
  type: 'pie' | 'bar' | 'line' | 'doughnut' | 'radar' | 'polarArea';
  data: ChartData;
  title: string;
}

const GenericChart: React.FC<ChartInfo> = ({ type, data, title }) => {
  return (
    <motion.div
      className="bg-white p-6 rounded-lg shadow-md w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="h-[400px]">
        <Chart 
          type={type} 
          data={data} 
          options={{ 
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
              legend: {
                position: 'top' as const,
              },
              title: {
                display: true,
                text: title,
              },
            },
          }} 
        />
      </div>
    </motion.div>
  )
}

const Dashboard: React.FC = () => {
  const [chartList, setChartList] = useState<ChartInfo[]>([]);
  const { dataVersion } = useAppStore();
  const { connected } = useWallet();
  const [dashboardGenerated, setDashboardGenerated] = useState<boolean>(false);
  const [dashboardMetrics, setDashboardMetrics] = useState<{ name: string; value: number }[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showStakingOption, setShowStakingOption] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dbStore = useDBStore();
  const isDbConnected = dbStore.isConnected;

  const fetchChartData = async () => {
    try {
      console.log("Fetching chart data");
      setError(null);
      
      const graphsData = await getGraphsData();
      console.log("graphsData retrieved:", graphsData);
      
      if (!graphsData || graphsData.length === 0) {
        console.log("No graphs data available");
        setError("No dashboard data available. Please create some graphs first.");
        return;
      }
      
      const charts = await Promise.all(graphsData.map(async (graph: any) => {
        console.log("Processing graph:", graph.title);
        console.log("Executing query:", graph.data_query);
        
        try {
          const rawData = await executeQuery(graph.data_query);
          console.log("Raw data for", graph.title, ":", rawData);
          
          if (!rawData || !rawData[0] || !rawData[0].rows) {
            console.log("No data returned for query");
            return null;
          }
          
          const rows = rawData[0].rows;
          
          // Validate the data before processing
          if (!Array.isArray(rows)) {
            console.error('Expected rows to be an array, got:', rows);
            return null;
          }
          
          if (rows.length === 0) {
            console.log("Query returned empty result set");
            // Return a chart with empty data
            return {
              id: graph.id,
              type: graph.type,
              title: graph.title + " (No Data)",
              data: {
                labels: ["No Data"],
                datasets: [{
                  label: graph.dataset_label || "No Data",
                  data: [0],
                  backgroundColor: ["#cccccc"],
                  hoverBackgroundColor: ["#aaaaaa"]
                }]
              }
            };
          }
          
          // Process the data
          const formattedData = rows
            .filter(row => row !== null && row !== undefined)
            .map(row => {
              // Handle different types of key values
              let dateStr = '';
              
              if (row.key !== undefined && row.key !== null) {
                if (typeof row.key === 'string') {
                  dateStr = row.key;
                } else if (row.key instanceof Date) {
                  dateStr = row.key.toISOString();
                } else {
                  // For numbers or other types
                  dateStr = String(row.key);
                }
              } else {
                dateStr = 'Unknown';
              }
              
              // Now safely use replace if it's a date string
              let formattedDate = dateStr;
              try {
                if (dateStr.includes('T')) {
                  formattedDate = dateStr.replace(/T.*$/, '');
                }
              } catch (e) {
                console.log("Error formatting date:", e);
                // Keep the original value
              }
              
              // Handle value conversion
              let numericValue = 0;
              if (typeof row.value === 'number') {
                numericValue = row.value;
              } else if (typeof row.value === 'string') {
                // Try to convert string to number
                const parsedValue = parseFloat(row.value);
                numericValue = !isNaN(parsedValue) ? parsedValue : 0;
              }
              
              return {
                date: formattedDate,
                value: numericValue
              };
            });
          
          console.log("Formatted data:", formattedData);
          
          const values = formattedData.map(data => data.value);
          const keys = formattedData.map(data => data.date);
          
          console.log("Chart values:", values);
          console.log("Chart keys:", keys);
          
          // Parse background colors
          let backgroundColors;
          let hoverBackgroundColors;
          
          try {
            backgroundColors = typeof graph.background_colors === 'string' 
              ? JSON.parse(graph.background_colors.replace(/'/g, '"')) 
              : graph.background_colors;
              
            hoverBackgroundColors = typeof graph.hover_background_colors === 'string'
              ? JSON.parse(graph.hover_background_colors.replace(/'/g, '"'))
              : graph.hover_background_colors;
          } catch (e) {
            console.log("Error parsing colors:", e);
            backgroundColors = ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF'];
            hoverBackgroundColors = ['#1E90FF', '#FF4500', '#FFD700', '#3CB371', '#8A2BE2'];
          }
          
          // Ensure we have enough colors for all data points
          while (backgroundColors.length < values.length) {
            backgroundColors = [...backgroundColors, ...backgroundColors];
          }
          
          while (hoverBackgroundColors && hoverBackgroundColors.length < values.length) {
            hoverBackgroundColors = [...hoverBackgroundColors, ...hoverBackgroundColors];
          }
          
          // Create chart data
          const chartData = {
            labels: keys,
            datasets: [{
              label: graph.dataset_label || undefined,
              data: values,
              backgroundColor: backgroundColors.slice(0, values.length),
              hoverBackgroundColor: hoverBackgroundColors ? hoverBackgroundColors.slice(0, values.length) : undefined,
            }]
          };
          
          console.log("Chart data for", graph.title, ":", chartData);
          
          return {
            id: graph.id,
            type: graph.type,
            title: graph.title,
            data: chartData
          };
        } catch (error) {
          console.error(`Error processing graph ${graph.title}:`, error);
          return null;
        }
      }));
      
      const validCharts = charts.filter(chart => chart !== null) as ChartInfo[];
      console.log("Valid charts:", validCharts.length);
      
      setChartList(validCharts);
      
      // If we have charts, automatically generate the dashboard
      if (validCharts.length > 0 && !dashboardGenerated) {
        handleGenerateDashboard();
      }
    } catch (error) {
      console.error('Error formatting chart data:', error);
      setError('Failed to load dashboard data. Please try again.');
    }
  };

  useEffect(() => {
    if (isDbConnected) {
      fetchChartData();
    }
  }, [isDbConnected]);

  useEffect(() => {
    fetchChartData();
  }, [dataVersion]);

  // Function to generate dashboard
  const handleGenerateDashboard = () => {
    setIsGenerating(true);
    setError(null);
    
    // Extract metrics from chart data if available
    const extractedMetrics = [];
    
    if (chartList.length > 0) {
      // Try to extract meaningful metrics from charts
      chartList.forEach(chart => {
        if (chart.data && chart.data.datasets && chart.data.datasets[0]) {
          const dataset = chart.data.datasets[0];
          const data = dataset.data;
          
          if (data && data.length > 0) {
            // For pie/doughnut charts, sum all values
            if (chart.type === 'pie' || chart.type === 'doughnut') {
              const total = data.reduce((sum, val) => sum + val, 0);
              extractedMetrics.push({
                name: chart.title,
                value: total
              });
            } 
            // For line/bar charts, use the latest value
            else if (chart.type === 'line' || chart.type === 'bar') {
              extractedMetrics.push({
                name: chart.title,
                value: data[data.length - 1]
              });
            }
          }
        }
      });
    }
    
    // If we couldn't extract metrics, use sample ones
    const metrics = extractedMetrics.length > 0 ? extractedMetrics : [
    ];
    
    // Update state
    setDashboardMetrics(metrics);
    setDashboardGenerated(true);
    setIsGenerating(false);
    setShowStakingOption(true);
    
    console.log('Dashboard generated, metrics:', metrics);
    console.log('Staking should be available now, showStakingOption:', true);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Financial Insights</h1>
        <p>Build your own insight, brick-by-brick!</p>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {dashboardGenerated && (
        <div className="dashboard-content animate-fadeIn">
          <div className="metrics-grid">
            {dashboardMetrics.map((metric, index) => (
              <div key={index} className="metric-card">
                <div className="metric-icon">
                  {index === 0 ? <Target size={24} /> : 
                   index === 1 ? <TrendingUp size={24} /> : 
                   <BarChart3 size={24} />}
                </div>
                <div className="metric-details">
                  <h3>{metric.name}</h3>
                  <p className="metric-value">{metric.value}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Charts section */}
          {chartList.length > 0 ? (
            <div className="charts-grid">
              {chartList.map((chart) => (
                <div key={chart.id} className="chart-container">
                  <GenericChart
                    id={chart.id}
                    type={chart.type}
                    data={chart.data}
                    title={chart.title}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="no-charts-message">
              <p>No charts available. Try refreshing the dashboard.</p>
            </div>
          )}
          
          {/* Debug message to verify the condition */}
          {!showStakingOption && (
            <p className="debug-message">
              Staking option should appear here. If you don't see it, there might be an issue with the wallet connection or component rendering.
            </p>
          )}
          
          {/* Staking section with Tailwind styling */}
          {/* <div 
            className={`mt-8 p-6 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg transition-all duration-300 ${showStakingOption ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
          >
            <h2 className="text-2xl font-bold text-white mb-3">Stake SOL on Your Goals</h2>
            <p className="text-purple-100 mb-6">Set productivity goals and stake SOL to earn rewards when you achieve them!</p>
            
            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-lg border border-purple-300/30">
              <DashboardStaking 
                dashboardGenerated={dashboardGenerated}
                metrics={dashboardMetrics}
                forceShow={true}
              />
            </div>
          </div> */}
        </div>
      )}
      
      {!dashboardGenerated && !isGenerating && (
        <div className="empty-dashboard">
          <BarChart3 size={64} />
          <h2>No Dashboard Generated</h2>
          <p>Generate a dashboard to view your productivity metrics and set staking goals.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
