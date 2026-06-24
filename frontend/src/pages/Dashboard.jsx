import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TenantContext } from '../App.jsx';
import { fetchLeads, fetchMetrics, submitLead } from '../api/client.js';
import LeafletMap from '../components/LeafletMap.jsx';
import LeadSidePanel from '../components/LeadSidePanel.jsx';
import MetricsTab from '../components/MetricsTab.jsx';
import RadarLoader from '../components/RadarLoader.jsx';
import {
  MapPin, Star, Share2, Calendar, BarChart3, RefreshCw,
  ArrowLeft, Search, Plus, Play, Send, X, Zap, ChevronDown
} from 'lucide-react';

const getBadgeClass = (cls) => {
  const map = {
    high_value: 'badge-high-value',
    valid: 'badge-valid',
    spam: 'badge-spam',
    incomplete: 'badge-incomplete',
    fake: 'badge-fake',
    duplicate: 'badge-duplicate',
  };
  return map[cls] || 'badge-neutral';
};

const ScoreBar = ({ score }) => {
  const color = score >= 80 ? 'var(--gold)' : score >= 50 ? 'var(--cyan)' : 'var(--text-muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color, minWidth: '28px', textAlign: 'right' }}>{score}</span>
    </div>
  );
};

export default function Dashboard() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { currentTenant, selectTenant, tenants } = useContext(TenantContext);

  const [activeTab, setActiveTab] = useState('map');
  const [showRadar, setShowRadar] = useState(true);
  const [leads, setLeads] = useState([]);
  const [selectedSource, setSelectedSource] = useState('All Channels');
  const [metrics, setMetrics] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulateQueued, setSimulateQueued] = useState(false);

  // Default payload — source auto-updated when tenant loads
  const [simulatePayload, setSimulatePayload] = useState({
    name: 'Sarah Connor',
    email: 'sconnor@cyberdyne.co',
    phone: '+1-512-555-0199',
    company: 'Cyberdyne Systems',
    employees: 250,
    industry: 'Aerospace & Defense',
    business_requirement: 'We need urgently to audit our AWS Cloud infrastructure security and establish strict DevOps CI/CD pipelines to prevent unauthorized network access.',
    budget_range: '$50k-100k',
    location: 'Austin, TX',
    preferred_meeting_time: new Date(Date.now() + 86400000).toISOString(),
    source: 'Website contact forms',
  });

  // Sync source to tenant's first active source whenever tenant changes
  useEffect(() => {
    if (tenants.length > 0 && (!currentTenant || currentTenant.tenant_id !== tenantId)) {
      const found = tenants.find(t => t.tenant_id === tenantId);
      if (found) selectTenant(found);
      else navigate('/');
    }
  }, [tenantId, tenants, currentTenant]);

  useEffect(() => {
    if (currentTenant?.active_sources?.length > 0) {
      setSimulatePayload(prev => ({
        ...prev,
        source: currentTenant.active_sources.includes(prev.source)
          ? prev.source
          : currentTenant.active_sources[0]
      }));
    }
  }, [currentTenant]);

  const loadDashboardData = async () => {
    if (!tenantId) return;
    setSyncing(true);
    try {
      const [leadsRes, metricsRes] = await Promise.all([fetchLeads(tenantId), fetchMetrics(tenantId)]);
      setLeads(leadsRes.leads || []);
      setMetrics(metricsRes);
    } catch (error) {
      console.error('Dashboard load failed:', error);
    } finally {
      setSyncing(false);
      setLoadingLeads(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, [tenantId]);

  const handleSimulateWebhook = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      // Backend now returns 202 immediately and processes in background
      await submitLead({ tenant_id: tenantId, ...simulatePayload });
      setShowSimulateModal(false);
      setSimulateQueued(true);

      // Poll for up to 20 seconds for the new lead to appear
      let attempts = 0;
      const poll = async () => {
        const prev = leads.length;
        await loadDashboardData();
        attempts++;
        if (attempts < 10) {
          setTimeout(poll, 2000); // retry every 2s
        } else {
          setSimulateQueued(false);
        }
      };
      setTimeout(poll, 2000);
    } catch (err) {
      console.error('Simulate failed:', err);
      alert('Failed to submit webhook. Is the backend running?');
    } finally {
      setSimulating(false);
    }
  };

  const filteredLeads = (list) =>
    list.filter(l =>
      (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const isRecruitment = currentTenant?.category === 'Recruitment agencies';
  const highValueLeads = filteredLeads(leads.filter(l => l.classification === 'high_value')).sort((a, b) => b.score - a.score);
  const bookedLeads = filteredLeads(leads.filter(l => isRecruitment ? l.status === 'qualified_candidate' : l.meeting_time));

  const getSourcesMap = () => {
    const map = {};
    (currentTenant?.active_sources || []).forEach(s => { map[s] = []; });
    leads.forEach(l => {
      const src = l.source;
      if (map[src]) map[src].push(l);
      else { if (!map['Other']) map['Other'] = []; map['Other'].push(l); }
    });
    return map;
  };

  const TABS = [
    { id: 'map', label: 'Map View', icon: MapPin },
    { id: 'priority', label: `Top Priority`, count: highValueLeads.length, icon: Star },
    { id: 'source', label: 'By Source', icon: Share2 },
    { id: 'booked', label: isRecruitment ? 'Shortlisted' : 'Booked', count: bookedLeads.length, icon: Calendar },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  if (!currentTenant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(6, 182, 212, 0.3)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showRadar && <RadarLoader onComplete={() => setShowRadar(false)} />}

      {/* ── TOP BAR ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 28px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px',
      }}>
        {/* Left: Logo + Tenant name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: '4px', padding: '7px', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', transition: 'all 0.2s',
            }}
          >
            <ArrowLeft size={15} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', color: '#fff' }}>
              {currentTenant.company_name}
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
              background: 'var(--cyan-dim)', color: 'var(--cyan)', border: '1px solid rgba(6, 182, 212, 0.2)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{currentTenant.category}</span>
            <div style={{ width: 7, height: 7, background: 'var(--green)', borderRadius: '50%', boxShadow: '0 0 8px var(--green)', animation: 'pulse 2s infinite' }} title="Agent Live" />
          </div>
        </div>

        {/* Right: Search + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search leads…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '34px', paddingRight: '12px', height: '36px',
                width: '200px', fontSize: '0.82rem',
              }}
            />
          </div>

          <button onClick={() => setShowSimulateModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
            <Plus size={14} /> Simulate Lead
          </button>

          <button
            onClick={loadDashboardData}
            disabled={syncing}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              borderRadius: '4px', padding: '8px 14px', cursor: 'pointer',
              color: syncing ? 'var(--cyan)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.82rem', fontFamily: 'var(--font-sans)', fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
            Sync
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, padding: '28px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>

        {/* ── QUICK STATS ROW ── */}
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Total Leads', value: leads.length, color: 'var(--cyan)' },
              { label: 'High Value', value: leads.filter(l => l.classification === 'high_value').length, color: 'var(--gold)' },
              { label: 'Meetings Booked', value: leads.filter(l => l.meeting_time).length, color: 'var(--green)' },
              { label: 'Spam / Fake', value: leads.filter(l => ['spam','fake'].includes(l.classification)).length, color: 'var(--gray)' },
              { label: 'Avg Score', value: leads.length ? Math.round(leads.reduce((s, l) => s + (l.score || 0), 0) / leads.length) : '—', color: 'var(--purple)', suffix: '' },
            ].map((stat, i) => (
              <div key={i} className="glass-card" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  {stat.label}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                  {stat.value}{stat.suffix ?? ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB BAR ── */}
        <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
          <div className="tab-bar" style={{ width: 'fit-content', minWidth: '100%' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={14} />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 600,
                      background: activeTab === tab.id ? 'rgba(10, 10, 10, 0.2)' : 'rgba(255,255,255,0.07)',
                      color: activeTab === tab.id ? '#0A0A0A' : 'var(--text-muted)',
                      padding: '1px 6px', borderRadius: '99px',
                    }}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB CONTENT ── */}

        {/* MAP TAB */}
        {activeTab === 'map' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
            <div className="glass-card" style={{ overflow: 'hidden', height: '520px' }}>
              <LeafletMap leads={leads} onMarkerClick={setSelectedLead} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Legend */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                  Map Legend
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { emoji: '⭐', label: 'High Value', sub: 'Score ≥ 80' },
                    { emoji: '🔵', label: 'Valid Prospect', sub: 'Score 50–79' },
                    { emoji: '📅', label: 'Meeting Booked', sub: 'Confirmed slot' },
                    { emoji: '⚫', label: 'Low Value', sub: 'Score < 50' },
                    { emoji: '❌', label: 'Spam / Fake', sub: 'Blocked' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#e8edf5', fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent leads list */}
              <div className="glass-card" style={{ padding: '20px', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                  Recent Inbound
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '310px', overflowY: 'auto' }}>
                  {leads.slice(0, 12).map(lead => (
                    <div key={lead.lead_id} className="lead-row" onClick={() => setSelectedLead(lead)}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '4px',
                        background: lead.classification === 'high_value' ? 'var(--gold-dim)' : 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', flexShrink: 0,
                      }}>
                        {lead.classification === 'high_value' ? '⭐' : lead.classification === 'spam' ? '🚫' : '🔵'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company}</div>
                      </div>
                      <span className={`badge ${getBadgeClass(lead.classification)}`} style={{ fontSize: '0.62rem' }}>{lead.score}</span>
                    </div>
                  ))}
                  {leads.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '20px 0' }}>
                      No leads yet. Simulate a webhook to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRIORITY TAB */}
        {activeTab === 'priority' && (
          <div>
            {highValueLeads.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {highValueLeads.map(lead => (
                  <div key={lead.lead_id} className="glass-card" style={{ padding: '22px', borderLeft: '3px solid var(--gold)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <span className={`badge ${getBadgeClass(lead.classification)}`}>{lead.classification?.replace('_', ' ')}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{lead.source}</span>
                    </div>
                    <div style={{ marginBottom: '4px', fontFamily: 'var(--font-sans)', fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>{lead.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{lead.company}</div>
                    <ScoreBar score={lead.score || 0} />
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '12px 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {lead.business_requirement}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #374151' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', textTransform: 'capitalize' }}>
                        {lead.agent_action?.replace('_', ' ')}
                      </span>
                      <button onClick={() => setSelectedLead(lead)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                        Inspect Trace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                <Star size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>No high-value leads yet. Trigger a webhook to test the pipeline.</p>
              </div>
            )}
          </div>
        )}

        {/* SOURCE TAB */}
        {activeTab === 'source' && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
            {/* Left Channel Filter Panel */}
            <div className="glass-card-no-hover" style={{ width: '260px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '6px', flexShrink: 0 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 8px 10px', borderBottom: '1px solid var(--border)' }}>
                Ingest Channels
              </div>
              <button
                onClick={() => setSelectedSource('All Channels')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: selectedSource === 'All Channels' ? 'var(--cyan)' : 'transparent',
                  color: selectedSource === 'All Channels' ? '#0A0A0A' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.8rem',
                  fontWeight: selectedSource === 'All Channels' ? 600 : 500,
                  transition: 'all 150ms ease-out',
                }}
              >
                <span>All Channels</span>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '99px',
                  background: selectedSource === 'All Channels' ? 'var(--cyan-dim)' : 'rgba(255,255,255,0.06)',
                  color: selectedSource === 'All Channels' ? 'var(--cyan)' : 'var(--text-muted)',
                }}>{leads.length}</span>
              </button>
              {Object.entries(getSourcesMap()).map(([sourceName, sourceLeads]) => {
                const isSelected = selectedSource === sourceName;
                return (
                  <button
                    key={sourceName}
                    onClick={() => setSelectedSource(sourceName)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: isSelected ? 'var(--cyan)' : 'transparent',
                      color: isSelected ? '#0A0A0A' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 600 : 500,
                      transition: 'all 150ms ease-out',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{sourceName}</span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '99px',
                      background: isSelected ? 'var(--cyan-dim)' : 'rgba(255,255,255,0.06)',
                      color: isSelected ? 'var(--cyan)' : 'var(--text-muted)',
                    }}>{sourceLeads.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Leads Table Panel */}
            <div className="glass-card-no-hover" style={{ flex: 1, padding: '20px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: '6px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
                  {selectedSource} Inbound Pipeline
                </h3>
              </div>
              
              {(() => {
                const map = getSourcesMap();
                const leadsToRender = selectedSource === 'All Channels' 
                  ? leads 
                  : (map[selectedSource] || []);
                
                return leadsToRender.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Name', 'Company', 'Score', 'Classification', 'Status', ''].map(h => (
                          <th key={h} style={{ padding: '12px 8px 10px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leadsToRender.map(lead => (
                        <tr key={lead.lead_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 500, color: '#fff' }}>{lead.name}</td>
                          <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{lead.company}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, color: (lead.score||0) >= 80 ? 'var(--gold)' : 'var(--cyan)' }}>
                              {lead.score}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span className={`badge ${getBadgeClass(lead.classification)}`}>{lead.classification}</span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{lead.status}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <button onClick={() => setSelectedLead(lead)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cyan)', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'underline', fontFamily: 'var(--font-sans)' }}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No leads registered on this channel.
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* BOOKED TAB */}
        {activeTab === 'booked' && (
          <div>
            {bookedLeads.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {bookedLeads.map(lead => (
                  <div key={lead.lead_id} className="glass-card" style={{ padding: '22px', borderLeft: '3px solid var(--green)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {isRecruitment ? '✅ Shortlisted' : '📅 Meeting Confirmed'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{lead.source}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{lead.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>{lead.company}</div>
                    {isRecruitment ? (
                      <div style={{ padding: '12px', background: 'var(--cyan-dim)', border: '1px solid rgba(6, 182, 212, 0.1)', borderRadius: '4px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>ATS Match</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                          Score: {lead.vertical_result?.ats_score || '75'} / 100
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '12px', background: 'var(--green-dim)', border: '1px solid rgba(16, 185, 129, 0.12)', borderRadius: '4px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Booking Slot</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                          {lead.meeting_time ? new Date(lead.meeting_time).toLocaleString() : '—'}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setSelectedLead(lead)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem' }}>
                        Inspect Trace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                <Calendar size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>No meetings booked yet.</p>
              </div>
            )}
          </div>
        )}

        {/* METRICS TAB */}
        {activeTab === 'metrics' && (
          <MetricsTab metrics={metrics} loading={!metrics} />
        )}
      </div>

      {/* ── SIDE PANEL ── */}
      {selectedLead && (
        <LeadSidePanel
          lead={selectedLead}
          tenant={currentTenant}
          onClose={() => setSelectedLead(null)}
          onRefresh={loadDashboardData}
        />
      )}

      {/* ── SIMULATE WEBHOOK MODAL ── */}
      {showSimulateModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowSimulateModal(false); }}>
          <div className="modal-box">
            {/* Header */}
            <div style={{
              padding: '24px 28px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px',
                  background: 'var(--cyan-dim)', color: 'var(--cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '4px',
                  padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <Zap size={11} /> Webhook Simulator
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                  Fire Test Lead Event
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Triggers the full LangGraph qualification pipeline
                </p>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '7px', padding: '6px', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSimulateWebhook} style={{ padding: '22px 28px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label>Full Name</label>
                  <input type="text" value={simulatePayload.name} onChange={e => setSimulatePayload({ ...simulatePayload, name: e.target.value })} required />
                </div>
                <div>
                  <label>Email Address</label>
                  <input type="email" value={simulatePayload.email} onChange={e => setSimulatePayload({ ...simulatePayload, email: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label>Company</label>
                  <input type="text" value={simulatePayload.company} onChange={e => setSimulatePayload({ ...simulatePayload, company: e.target.value })} />
                </div>
                <div>
                  <label>Employees</label>
                  <input type="number" value={simulatePayload.employees} onChange={e => setSimulatePayload({ ...simulatePayload, employees: parseInt(e.target.value) || 1 })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label>Budget Range</label>
                  <input type="text" value={simulatePayload.budget_range} onChange={e => setSimulatePayload({ ...simulatePayload, budget_range: e.target.value })} placeholder="e.g. $50k-100k" />
                </div>
                <div>
                  <label>Location</label>
                  <input type="text" value={simulatePayload.location} onChange={e => setSimulatePayload({ ...simulatePayload, location: e.target.value })} placeholder="City, Country" />
                </div>
              </div>

              <div>
                <label>Source Channel</label>
                <select value={simulatePayload.source} onChange={e => setSimulatePayload({ ...simulatePayload, source: e.target.value })}>
                  {(currentTenant?.active_sources || [
                    'Website contact forms', 'CRM lead forms', 'Gmail or Outlook inbox',
                    'LinkedIn lead forms', 'Chatbot conversations', 'Landing pages'
                  ]).map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Business Requirement</label>
                <textarea
                  rows={4}
                  value={simulatePayload.business_requirement}
                  onChange={e => setSimulatePayload({ ...simulatePayload, business_requirement: e.target.value })}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={simulating}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
              >
                {simulating ? (
                  <><RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Processing Lead…</>
                ) : (
                  <><Send size={15} /> Fire Webhook Event</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {simulateQueued && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 100,
          background: 'rgba(6, 182, 212, 0.12)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '8px',
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2)',
        }}>
          <div style={{ width: 14, height: 14, border: '2px solid rgba(6,182,212,0.3)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--cyan)' }}>Lead Pipeline Running</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI is qualifying your lead… auto-refreshing</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
