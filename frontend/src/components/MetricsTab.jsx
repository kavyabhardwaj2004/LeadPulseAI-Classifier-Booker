import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Clock, Target, Calendar, AlertTriangle, Database, ArrowUpRight } from 'lucide-react';

const COLORS = ['#00d4ff', '#9d4edd', '#ffd700', '#10b981', '#ef4444', '#f59e0b'];

export default function MetricsTab({ metrics, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-sm">Aggregating real-time KPI metrics...</p>
      </div>
    );
  }

  if (!metrics) return null;

  // Format charts data
  const classData = Object.entries(metrics.by_classification || {}).map(([key, val]) => ({
    name: key.replace('_', ' ').toUpperCase(),
    value: val
  }));

  const sourceData = Object.entries(metrics.by_source || {}).map(([key, val]) => ({
    name: key,
    value: val
  }));

  const formatTime = (secs) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.round(mins / 60);
    return `${hours}h`;
  };

  // Pipeline health
  const bookingRate = metrics.meeting_booking_rate || 0;
  let healthText = "Healthy";
  let healthColor = "text-green-400 border-green-500/20 bg-green-500/10";
  if (bookingRate < 30) {
    healthText = "Needs Optimization";
    healthColor = "text-rose-400 border-rose-500/20 bg-rose-500/10";
  } else if (bookingRate < 60) {
    healthText = "Moderate Performance";
    healthColor = "text-yellow-400 border-yellow-500/20 bg-yellow-500/10";
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 5 KPI Grid */}
      <div className="kpi-grid">
        {/* KPI 1 */}
        <div className="glass-card kpi-card border-l-4 border-l-cyan-400">
          <div className="flex justify-between items-start text-gray-500">
            <span className="kpi-label">Avg Response Time</span>
            <Clock size={18} className="text-cyan-400" />
          </div>
          <div className="kpi-value">{formatTime(metrics.lead_response_time_avg)}</div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <ArrowUpRight size={12} className="text-green-400" /> Lead to auto-response email
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card kpi-card border-l-4 border-l-yellow-400">
          <div className="flex justify-between items-start text-gray-500">
            <span className="kpi-label">Qual Accuracy</span>
            <Target size={18} className="text-yellow-400" />
          </div>
          <div className="kpi-value">{metrics.qualification_accuracy}%</div>
          <div className="text-xs text-gray-400">High-value leads converted</div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card kpi-card border-l-4 border-l-emerald-400">
          <div className="flex justify-between items-start text-gray-500">
            <span className="kpi-label">Booking Rate</span>
            <Calendar size={18} className="text-emerald-400" />
          </div>
          <div className="kpi-value">{metrics.meeting_booking_rate}%</div>
          <div className="text-xs text-gray-400">Qualified leads booked</div>
        </div>

        {/* KPI 4 */}
        <div className="glass-card kpi-card border-l-4 border-l-rose-400">
          <div className="flex justify-between items-start text-gray-500">
            <span className="kpi-label">False Positive Rate</span>
            <AlertTriangle size={18} className="text-rose-400" />
          </div>
          <div className="kpi-value">{metrics.false_positive_rate}%</div>
          <div className="text-xs text-gray-400">High-value leads ignored</div>
        </div>

        {/* KPI 5 */}
        <div className="glass-card kpi-card border-l-4 border-l-purple-400">
          <div className="flex justify-between items-start text-gray-500">
            <span className="kpi-label">CRM Sync Success</span>
            <Database size={18} className="text-purple-400" />
          </div>
          <div className="kpi-value">{metrics.crm_entry_success_rate}%</div>
          <div className="text-xs text-gray-400">Audit trail coverage</div>
        </div>
      </div>

      {/* Pipeline Health Alert */}
      <div className={`p-4 rounded border flex justify-between items-center text-sm ${healthColor}`}>
        <span className="font-semibold">Pipeline Efficiency Status: {healthText}</span>
        <span className="text-xs opacity-75">Calculated based on average meeting booking conversion rates</span>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Classification Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold font-display text-white mb-6">Leads by Classification</h3>
          <div className="h-64 w-full">
            {classData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData}>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0c101d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }} />
                  <Bar dataKey="value" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-500">No data available</div>
            )}
          </div>
        </div>

        {/* Source Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold font-display text-white mb-6">Leads by Source</h3>
          <div className="h-64 w-full flex items-center justify-center">
            {sourceData.length > 0 ? (
              <div className="w-full h-full flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0c101d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {sourceData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-gray-400">{entry.name}:</span>
                      <span className="font-semibold text-white">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
