import { format } from 'date-fns';
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

import type { Chicken, FeedLog } from '@/types';

import { useChicken } from '@/contexts/ChickenContext';

const ChickenDashboard: React.FC = () => {
  const { chickens, loading } = useChicken();

  const dashboardData = useMemo(() => {
    if (!chickens.length) return null;

    const getFeedTotals = (chicken: Chicken & { feedLogs?: FeedLog[] }) => {
      const logs = Array.isArray((chicken as any).feedLogs) ? (chicken as any).feedLogs as FeedLog[] : [];
      if (logs.length === 0) {
        return {
          cost: Number(chicken.feedCost || 0),
          usage: Number(chicken.feedUsage || 0),
        };
      }
      return logs.reduce(
        (acc, l) => {
          acc.cost += Number(l.cost || 0);
          acc.usage += Number(l.pounds || 0);
          return acc;
        },
        { cost: 0, usage: 0 }
      );
    };

    const totalInitialChickens = chickens.reduce((sum, chicken) => sum + (chicken.initialCount || 0), 0);
    const totalCurrentChickens = chickens.reduce((sum, chicken) => sum + (chicken.currentCount || chicken.initialCount || 0), 0);
    const totalsAcross = chickens.map(getFeedTotals);
    const totalFeedCost = totalsAcross.reduce((s, t) => s + t.cost, 0);
    const totalFeedUsage = totalsAcross.reduce((s, t) => s + t.usage, 0);
    const totalMortality = totalInitialChickens - totalCurrentChickens;
    const mortalityRate = totalInitialChickens > 0 ? (totalMortality / totalInitialChickens) * 100 : 0;

    const batchData = chickens.map((chicken) => {
      const { cost, usage } = getFeedTotals(chicken as any);
      return {
        name: chicken.batchName,
        initial: chicken.initialCount || 0,
        current: chicken.currentCount || chicken.initialCount || 0,
        mortality: (chicken.initialCount || 0) - (chicken.currentCount || chicken.initialCount || 0),
        feedCost: cost,
        feedUsage: usage,
        costPerChicken: chicken.initialCount > 0 ? cost / chicken.initialCount : 0,
      };
    });

    const monthlyMap = new Map<string, number>();
    chickens.forEach((chicken) => {
      const logs = Array.isArray((chicken as any).feedLogs) ? ((chicken as any).feedLogs as FeedLog[]) : [];
      if (logs.length > 0) {
        logs.forEach((l) => {
          const d = l.date || chicken.chickDeliveryDate || new Date().toISOString();
          const key = format(new Date(d), 'yyyy-MM');
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(l.cost || 0));
        });
      } else if (chicken.chickDeliveryDate && (chicken.feedCost || 0) > 0) {
        const key = format(new Date(chicken.chickDeliveryDate), 'yyyy-MM');
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(chicken.feedCost || 0));
      }
    });
    const feedCostData = Array.from(monthlyMap.entries())
      .map(([ym, cost]) => ({ date: format(new Date(ym + '-01'), 'MMM yyyy'), cost }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const activeChickens = chickens.filter((chicken) => (chicken.status || (chicken.cullDate ? 'Culled' : 'Active')) === 'Active').length;
    const culledChickens = chickens.filter((chicken) => (chicken.status || (chicken.cullDate ? 'Culled' : 'Active')) === 'Culled').length;

    const statusData = [
      { name: 'Active Batches', value: activeChickens, color: '#10B981' },
      { name: 'Culled Batches', value: culledChickens, color: '#EF4444' },
    ];

    return {
      totals: {
        totalInitialChickens,
        totalCurrentChickens,
        totalFeedCost,
        totalFeedUsage,
        totalMortality,
        mortalityRate,
        activeBatches: activeChickens,
        totalBatches: chickens.length,
      },
      batchData,
      feedCostData,
      statusData,
    };
  }, [chickens]);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!dashboardData || chickens.length === 0) {
    return (
      <div className="dashboard-empty">
        <h2>Dashboard</h2>
        <p>Add some chicken batches to see your dashboard analytics.</p>
      </div>
    );
  }

  const { totals, batchData, feedCostData, statusData } = dashboardData;

  return (
    <div className="chicken-dashboard">
      <h2>Chicken Tracking Dashboard</h2>

      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Chickens</h3>
          <div className="card-value">{totals.totalCurrentChickens}</div>
          <div className="card-subtitle">of {totals.totalInitialChickens} initial</div>
        </div>

        <div className="summary-card">
          <h3>Mortality Rate</h3>
          <div className="card-value">{totals.mortalityRate.toFixed(1)}%</div>
          <div className="card-subtitle">{totals.totalMortality} chickens lost</div>
        </div>

        <div className="summary-card">
          <h3>Total Feed Cost</h3>
          <div className="card-value">${totals.totalFeedCost.toFixed(2)}</div>
          <div className="card-subtitle">{totals.totalFeedUsage.toFixed(1)} lbs used</div>
        </div>

        <div className="summary-card">
          <h3>Active Batches</h3>
          <div className="card-value">{totals.activeBatches}</div>
          <div className="card-subtitle">of {totals.totalBatches} total</div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>Chicken Count by Batch</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={batchData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="initial" fill="#3B82F6" name="Initial Count" />
              <Bar dataKey="current" fill="#10B981" name="Current Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Feed Cost by Batch</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={batchData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Feed Cost']} />
              <Bar dataKey="feedCost" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {feedCostData.length > 1 && (
          <div className="chart-card">
            <h3>Feed Cost Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={feedCostData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Feed Cost']} />
                <Line type="monotone" dataKey="cost" stroke="#8B5CF6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {statusData.some((item) => item.value > 0) && (
          <div className="chart-card">
            <h3>Batch Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 16, right: 72, bottom: 16, left: 72 }}>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="chart-card">
          <h3>Feed Cost Per Chicken</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={batchData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost Per Chicken']} />
              <Bar dataKey="costPerChicken" fill="#EC4899" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Mortality by Batch</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={batchData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="mortality" fill="#EF4444" name="Chickens Lost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChickenDashboard;
