import React, { useState } from 'react';
import { X, Mail, Calendar, MapPin, Building, Briefcase, DollarSign, Activity, Sparkles, Check } from 'lucide-react';
import { approveEmail } from '../api/client.js';

export default function LeadSidePanel({ lead, tenant, onClose, onRefresh }) {
  const [approving, setApproving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!lead) return null;

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await approveEmail(lead.lead_id, tenant.tenant_id);
      if (res.status === 'success') {
        setSuccessMsg(res.message);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to approve and send email.");
    } finally {
      setApproving(false);
    }
  };

  const getBadgeClass = (cls) => {
    switch (cls) {
      case 'high_value': return 'badge-high-value';
      case 'valid': return 'badge-valid';
      case 'spam': return 'badge-spam';
      case 'incomplete': return 'badge-incomplete';
      case 'fake': return 'badge-fake';
      case 'duplicate': return 'badge-duplicate';
      default: return 'badge-neutral';
    }
  };

  // Timeline parse helper
  const parseTimeline = (logStr) => {
    // Expected format: "2026-02-16T02:07:04Z — Message text"
    const parts = logStr.split(' — ');
    if (parts.length >= 2) {
      const timestamp = parts[0];
      const message = parts.slice(1).join(' — ');
      try {
        const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return { time, message, valid: true };
      } catch (e) {
        return { time: '', message: logStr, valid: false };
      }
    }
    return { time: '', message: logStr, valid: false };
  };

  const activityLog = lead.activity_log || [];

  return (
    <div className="slide-in-right" style={{
      position: 'fixed', top: 0, right: 0, height: '100vh', width: '100%', maxWidth: '480px',
      background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(12px)',
      borderLeft: '1px solid var(--border)', zIndex: 50,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span className={`badge ${getBadgeClass(lead.classification)}`} style={{ alignSelf: 'flex-start' }}>
            {lead.classification}
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{lead.name}</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{lead.company}</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Score Circle */}
          <div style={{
            position: 'relative', width: '48px', height: '48px', borderRadius: '50%',
            border: '2px dashed rgba(20, 184, 166, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--cyan)' }}>{lead.score}</span>
          </div>
          <button onClick={onClose} style={{
            padding: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Building size={16} color="var(--cyan)" />
            <div>
              <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Industry</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{lead.industry || 'Unknown'}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DollarSign size={16} color="var(--cyan)" />
            <div>
              <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Budget</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{lead.budget_range || 'Unknown'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MapPin size={16} color="var(--cyan)" />
            <div>
              <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Location</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{lead.location || 'Unknown'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Briefcase size={16} color="var(--cyan)" />
            <div>
              <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Employees</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{lead.employees || 'Unknown'}</div>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div style={{ padding: '16px', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.875rem', display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Email:</span>
            <span style={{ fontWeight: 500, color: 'var(--cyan)', userSelect: 'all', marginLeft: 'auto' }}>{lead.email}</span>
          </div>
          {lead.phone && (
            <div style={{ fontSize: '0.875rem', display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)', userSelect: 'all', marginLeft: 'auto' }}>{lead.phone}</span>
            </div>
          )}
          {lead.source && (
            <div style={{ fontSize: '0.875rem', display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ingested Source:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--cyan)', border: '1px solid rgba(20, 184, 166, 0.2)', marginLeft: 'auto' }}>
                {lead.source}
              </span>
            </div>
          )}
        </div>

        {/* Business requirement */}
        <div>
          <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} /> Requirement Brief
          </h3>
          <p style={{ fontSize: '0.875rem', background: 'var(--bg-base)', padding: '16px', borderRadius: '4px', border: '1px solid var(--border)', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            {lead.business_requirement}
          </p>
        </div>

        {/* Vertical Specific Result */}
        {lead.vertical_result && Object.keys(lead.vertical_result).length > 0 && (
          <div>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--cyan)', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} /> Vertical Analysis ({lead.vertical_result.vertical})
            </h3>
            <div style={{ padding: '16px', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
              {Object.entries(lead.vertical_result).map(([k, v]) => {
                if (k === 'vertical') return null;
                return (
                  <div key={k} style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace('_', ' ')}:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginLeft: 'auto' }}>
                      {typeof v === 'boolean' ? (v ? 'Yes ✅' : 'No ❌') : String(v)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agent Reasoning Trace */}
        <div>
          <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} /> Agent Reasoning Trace
          </h3>
          <div style={{ borderLeft: '1.5px solid var(--border)', paddingLeft: '16px', marginLeft: '6px' }}>
            {activityLog.map((log, idx) => {
              const { time, message } = parseTimeline(log);
              return (
                <div key={idx} style={{ marginBottom: '16px', position: 'relative' }}>
                  <div style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)', left: '-21px', top: '4px', border: '2px solid var(--bg-surface)' }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginBottom: '2px' }}>{time}</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.8rem', lineHeight: 1.4 }}>{message}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ padding: '24px', borderTop: '1px solid var(--border)', background: 'var(--bg-base)' }}>
        {/* Outbound email info */}
        {lead.draft_email && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Response Draft Subject</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)', marginBottom: '8px' }}>{lead.draft_subject}</div>
            
            {lead.email_sent ? (
              <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green)' }}>
                <Check size={14} /> Auto-response dispatched via Gmail
              </div>
            ) : successMsg ? (
              <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green)' }}>
                <Check size={14} /> {successMsg}
              </div>
            ) : (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Mail size={16} style={{ marginRight: '8px' }} />
                {approving ? 'Sending Email...' : 'Approve Email Dispatch'}
              </button>
            )}
          </div>
        )}
        
        {lead.meeting_time && (
          <div style={{ padding: '12px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifycontent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--green)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={14} /> Booked: {new Date(lead.meeting_time).toLocaleString()}
            </span>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.625rem', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '4px', marginLeft: 'auto' }}>
              Confirmed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
