import { useRef, useEffect } from 'react'
import { useActivityFeed } from '../../hooks/useActivityFeed'

// ── Action type config ─────────────────────────────────────────────────────
const ACTION_CONFIG = {
  book_issued:         { icon: '📖', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   label: 'Book Issued' },
  book_returned:       { icon: '✅', color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   label: 'Returned' },
  attendance_marked:   { icon: '📅', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', label: 'Attendance' },
  book_added:          { icon: '➕', color: '#2dd4bf', bg: 'rgba(45,212,191,0.1)',   label: 'Book Added' },
  overdue:             { icon: '⚠️', color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Overdue' },
  fine_paid:           { icon: '💰', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   label: 'Fine Paid' },
}

const DEFAULT_CONFIG = { icon: '🔔', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Event' }

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60)   return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)   return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24)  return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * ActivityFeed — realtime live feed of system events from activity_logs.
 * @param {number}      limit       - max entries (default 50)
 * @param {string|null} actorFilter - narrow to a single actor name (student mini-feed)
 * @param {string}      height      - fixed height for scroll container (default '400px')
 * @param {boolean}     compact     - smaller compact layout
 */
export default function ActivityFeed({ limit = 50, actorFilter = null, height = '400px', compact = false }) {
  const { activities, loading } = useActivityFeed(limit, actorFilter)
  const listRef = useRef(null)

  // Auto-scroll to top on new event
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [activities.length])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '14px', flexShrink: 0,
      }}>
        <div style={{
          fontSize: compact ? '11px' : '12px',
          fontWeight: '800', color: '#64748b',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          {actorFilter ? 'My Activity' : 'Live Activity Feed'}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '20px', padding: '3px 10px',
        }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444',
            animation: 'livePulse 1.5s ease-in-out infinite',
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ color: '#f87171', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>LIVE</span>
        </div>
      </div>

      {/* Feed list */}
      <div
        ref={listRef}
        style={{
          height,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingRight: '4px',
        }}
      >
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
            Loading feed...
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
            No activity yet
          </div>
        ) : (
          activities.map((act) => {
            const cfg = ACTION_CONFIG[act.action_type] || DEFAULT_CONFIG
            return (
              <div
                key={act.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: compact ? '8px 10px' : '10px 12px',
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}22`,
                  borderRadius: '10px',
                  transition: 'opacity 0.2s',
                  flexShrink: 0,
                }}
              >
                {/* Icon */}
                <div style={{
                  width: compact ? '28px' : '32px',
                  height: compact ? '28px' : '32px',
                  borderRadius: '8px',
                  background: `${cfg.color}20`,
                  border: `1px solid ${cfg.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: compact ? '13px' : '15px',
                  flexShrink: 0,
                }}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: compact ? '12px' : '13px',
                    color: '#e2e8f0',
                    lineHeight: '1.4',
                    fontWeight: 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {act.message}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px',
                  }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '700',
                      color: cfg.color,
                      background: `${cfg.color}18`,
                      padding: '1px 6px', borderRadius: '4px',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {cfg.label}
                    </span>
                    <span style={{ color: '#475569', fontSize: '11px' }}>
                      {timeAgo(act.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}
