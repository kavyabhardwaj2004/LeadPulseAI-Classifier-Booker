import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TenantContext } from '../App.jsx';
import { createTenant, startOAuth, checkOAuthStatus } from '../api/client.js';
import {
  Mail, Calendar, Server, Zap, BarChart2, Users,
  ArrowRight, X, ChevronRight, Globe, CheckCircle2,
  Briefcase, TrendingUp, Shield
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'IT service companies',
    name: 'IT Services',
    emoji: '🖥️',
    color: '#00d2ff',
    colorDim: 'rgba(0, 210, 255, 0.1)',
    desc: 'Managed IT, DevOps & Cloud Infrastructure',
    icon: Server,
  },
  {
    id: 'SaaS startups',
    name: 'SaaS Startups',
    emoji: '🚀',
    color: '#a78bfa',
    colorDim: 'rgba(167, 139, 250, 0.1)',
    desc: 'B2B Software & customer engagement platforms',
    icon: Zap,
  },
  {
    id: 'Consulting agencies',
    name: 'Consulting',
    emoji: '📊',
    color: '#34d399',
    colorDim: 'rgba(52, 211, 153, 0.1)',
    desc: 'Digital transformation & strategy advisory',
    icon: BarChart2,
  },
  {
    id: 'Digital marketing agencies',
    name: 'Digital Marketing',
    emoji: '📣',
    color: '#f472b6',
    colorDim: 'rgba(244, 114, 182, 0.1)',
    desc: 'Paid acquisition, CRO, SEO & content',
    icon: TrendingUp,
  },
  {
    id: 'B2B companies',
    name: 'B2B Solutions',
    emoji: '🤝',
    color: '#fb923c',
    colorDim: 'rgba(251, 146, 60, 0.1)',
    desc: 'Enterprise outsourcers & RevOps enablement',
    icon: Briefcase,
  },
  {
    id: 'Recruitment agencies',
    name: 'Recruitment',
    emoji: '🎯',
    color: '#facc15',
    colorDim: 'rgba(250, 204, 21, 0.1)',
    desc: 'ATS candidate qualification & headhunting',
    icon: Users,
  },
];

const TENANT_COLORS = ['#00d2ff', '#a78bfa', '#34d399', '#f472b6', '#fb923c', '#facc15'];

export default function Home() {
  const { tenants, selectTenant, refreshTenants } = useContext(TenantContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [oauthStatus, setOauthStatus] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    website: '',
    employees: 10,
    industry: '',
    services_offered: '',
    competitors: '',
    portfolio_tags: '',
    escalation_email: '',
    timezone: 'America/New_York',
    manual_approval: true,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const oauthResult = searchParams.get('oauth');
    if (oauthResult === 'success') {
      setOauthStatus(true);
      alert('Successfully connected Google Account! Gmail & Calendar services are online.');
    } else if (oauthResult === 'error') {
      alert(`OAuth failed: ${searchParams.get('msg')}`);
    }
    const getStatus = async () => {
      try {
        const res = await checkOAuthStatus();
        setOauthStatus(res.connected);
      } catch (err) {
        console.error(err);
      }
    };
    getStatus();
  }, [searchParams]);

  const handleOAuthConnect = async () => {
    try {
      const res = await startOAuth();
      if (res.url) window.location.href = res.url;
    } catch (err) {
      console.error(err);
      alert('Failed to start Google OAuth flow. Check backend configuration.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmitOnboarding = async (e) => {
    e.preventDefault();
    if (!formData.company_name) { setErrorMsg('Company Name is required.'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        company_name: formData.company_name,
        category: selectedCategory,
        website: formData.website,
        employees: parseInt(formData.employees) || 10,
        industry: formData.industry || 'Technology',
        services_offered: formData.services_offered ? formData.services_offered.split(',').map(s => s.trim()) : [],
        competitors: formData.competitors ? formData.competitors.split(',').map(s => s.trim()) : [],
        portfolio_tags: formData.portfolio_tags ? formData.portfolio_tags.split(',').map(s => s.trim()) : [],
        escalation_email: formData.escalation_email,
        timezone: formData.timezone,
        manual_approval: formData.manual_approval,
        oauth_gmail: oauthStatus,
        oauth_calendar: oauthStatus,
      };
      const newTenant = await createTenant(payload);
      await refreshTenants();
      selectTenant(newTenant);
      navigate(`/dashboard/${newTenant.tenant_id}`);
    } catch (err) {
      setErrorMsg('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cat = selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory) : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP NAVBAR ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        padding: '0 32px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,10,10,0.9)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="#fff" />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            LeadPulse AI
          </span>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700,
            background: 'rgba(20, 184, 166, 0.12)',
            color: '#14B8A6', border: '1px solid rgba(20, 184, 166, 0.25)',
            borderRadius: '4px', padding: '2px 6px',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>v2.0</span>
        </div>

        <button
          onClick={handleOAuthConnect}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '7px 16px',
            background: oauthStatus ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${oauthStatus ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '8px', cursor: 'pointer',
            color: oauthStatus ? '#34d399' : '#9ca3af',
            fontSize: '0.82rem', fontWeight: 600,
            fontFamily: 'var(--font-display)',
            transition: 'all 0.2s',
          }}
        >
          {oauthStatus ? (
            <><CheckCircle2 size={14} /> Google Connected</>
          ) : (
            <><Mail size={14} /> Connect Gmail & Calendar</>
          )}
        </button>
      </nav>

      {/* ── HERO ── */}
      <main style={{ flex: 1, padding: '64px 32px 48px', maxWidth: '1140px', margin: '0 auto', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px',
            background: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.2)',
            borderRadius: '99px', marginBottom: '24px',
            fontSize: '0.78rem', fontWeight: 600, color: '#14B8A6',
            letterSpacing: '0.04em',
          }}>
            <span style={{ width: 7, height: 7, background: '#14B8A6', borderRadius: '50%', boxShadow: '0 0 8px #14B8A6' }} />
            AI Agent Pipeline — Live & Running
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 5vw, 4rem)',
            fontWeight: 900, marginBottom: '20px',
            color: '#fff',
          }}>
            Vertical Lead Qualification<br />
            <span style={{
              background: 'linear-gradient(135deg, #14B8A6 0%, #10B981 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Powered by AI State Machines
            </span>
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.65 }}>
            Automate lead ingestion, AI scoring, vertical-specific logic, and meeting booking.
            Every transition tracked on a living dashboard.
          </p>
        </div>

        {/* ── EXISTING WORKSPACES ── */}
        {tenants.length > 0 && (
          <div style={{ marginBottom: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                Your Workspaces
              </h2>
              <span style={{
                background: 'rgba(20, 184, 166, 0.1)', color: '#14B8A6',
                border: '1px solid rgba(20, 184, 166, 0.2)',
                borderRadius: '99px', padding: '2px 10px',
                fontSize: '0.72rem', fontWeight: 700,
              }}>{tenants.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {tenants.map((t, i) => {
                const accentColor = TENANT_COLORS[i % TENANT_COLORS.length];
                const initials = t.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div
                    key={t.tenant_id}
                    className="tenant-row"
                    onClick={() => { selectTenant(t); navigate(`/dashboard/${t.tenant_id}`); }}
                  >
                    <div className="tenant-avatar" style={{ background: `${accentColor}18`, color: accentColor }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.company_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.category}
                      </div>
                    </div>
                    <ChevronRight size={15} color="var(--text-muted)" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CREATE NEW WORKSPACE ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              {tenants.length > 0 ? 'Create Another Workspace' : 'Choose Your Vertical'}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pick a category to onboard</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  className="vertical-card"
                  onClick={() => { setSelectedCategory(cat.id); setShowModal(true); }}
                  style={{ '--card-color': cat.color }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '11px', flexShrink: 0,
                      background: cat.colorDim, color: cat.color,
                      border: `1px solid ${cat.color}28`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem',
                    }}>
                      {cat.emoji}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '3px' }}>
                        {cat.name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {cat.desc}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.75rem', fontWeight: 600, color: cat.color,
                      opacity: 0.8,
                    }}>
                      Set up <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '20px 32px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '8px',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          © 2026 LeadPulse AI Inc.
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          <Shield size={11} /> AES-256 PII Encryption Enabled
        </div>
      </footer>

      {/* ── ONBOARDING MODAL ── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box">
            {/* Modal Header */}
            <div style={{
              padding: '28px 28px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              <div>
                {cat && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: `${cat.colorDim}`, color: cat.color,
                    border: `1px solid ${cat.color}30`,
                    borderRadius: '6px', padding: '3px 10px',
                    fontSize: '0.72rem', fontWeight: 700,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    marginBottom: '10px',
                  }}>
                    {cat.emoji} {cat.name}
                  </div>
                )}
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                  Create Agency Workspace
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Configure your vertical AI pipeline settings
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <div style={{ padding: '24px 28px 28px' }}>
              {errorMsg && (
                <div style={{
                  padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px',
                  color: '#f87171', fontSize: '0.82rem', marginBottom: '20px',
                }}>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmitOnboarding} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label>Company Name *</label>
                  <input
                    type="text" name="company_name" value={formData.company_name}
                    onChange={handleInputChange} placeholder="e.g. Acme Tech Solutions" required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label>Website</label>
                    <input type="text" name="website" value={formData.website} onChange={handleInputChange} placeholder="acme.com" />
                  </div>
                  <div>
                    <label>Employees</label>
                    <input type="number" name="employees" value={formData.employees} onChange={handleInputChange} />
                  </div>
                </div>

                <div>
                  <label>Industry</label>
                  <input type="text" name="industry" value={formData.industry} onChange={handleInputChange} placeholder="e.g. Healthcare, Finance" />
                </div>

                <div>
                  <label>Services Offered <span style={{ color: 'var(--text-dim)', textTransform: 'none' }}>(comma separated)</span></label>
                  <input type="text" name="services_offered" value={formData.services_offered} onChange={handleInputChange} placeholder="Cloud Infrastructure, DevOps Consulting" />
                </div>

                {(selectedCategory === 'SaaS startups' || selectedCategory === 'Digital marketing agencies') && (
                  <div>
                    <label>Competitors <span style={{ color: 'var(--text-dim)', textTransform: 'none' }}>(comma separated)</span></label>
                    <input type="text" name="competitors" value={formData.competitors} onChange={handleInputChange} placeholder="Competitor A, Competitor B" />
                  </div>
                )}

                {selectedCategory === 'Digital marketing agencies' && (
                  <div>
                    <label>Portfolio Fit Tags <span style={{ color: 'var(--text-dim)', textTransform: 'none' }}>(comma separated)</span></label>
                    <input type="text" name="portfolio_tags" value={formData.portfolio_tags} onChange={handleInputChange} placeholder="Fintech, DTC, Health" />
                  </div>
                )}

                {(selectedCategory === 'IT service companies' || selectedCategory === 'Consulting agencies') && (
                  <div>
                    <label>Escalation Email</label>
                    <input type="email" name="escalation_email" value={formData.escalation_email} onChange={handleInputChange} placeholder="admin@company.com" />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'end' }}>
                  <div>
                    <label>Timezone</label>
                    <select name="timezone" value={formData.timezone} onChange={handleInputChange}>
                      <option value="America/New_York">America / New York</option>
                      <option value="America/Chicago">America / Chicago</option>
                      <option value="America/Los_Angeles">America / Los Angeles</option>
                      <option value="Europe/London">Europe / London</option>
                      <option value="Europe/Berlin">Europe / Berlin</option>
                      <option value="Asia/Kolkata">Asia / Kolkata</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', paddingBottom: '2px' }}>
                    <input
                      type="checkbox" id="manual_approval" name="manual_approval"
                      checked={formData.manual_approval} onChange={handleInputChange}
                      style={{ width: '16px', height: '16px', accentColor: '#14B8A6', cursor: 'pointer' }}
                    />
                    <label htmlFor="manual_approval" style={{ marginBottom: 0, cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal', fontSize: '0.82rem', color: 'var(--text)' }}>
                      Manual Approval Queue
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '4px', padding: '13px' }}>
                  {loading ? 'Creating Workspace...' : 'Launch Workspace →'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
