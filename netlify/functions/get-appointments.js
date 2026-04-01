const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appI1VGevInWPeMRa';
const TABLE_NAME = 'Appointments';

// John's schedule: { dayOfWeek: [startHour, endHour] } (0=Sun)
const SCHEDULE = {
    0: null, // Sunday closed
    1: [9, 13],   // Mon 9am-1pm
    2: [9, 13],   // Tue 9am-1pm
    3: [9, 18],   // Wed 9am-6pm
    4: [9, 13],   // Thu 9am-1pm
    5: [9, 13],   // Fri 9am-1pm
    6: [10, 14]   // Sat 10am-2pm
};

function getAtlanticOffset(year, month, day) {
    const marchFirst = new Date(year, 2, 1);
    const dstStartDay = 8 + (7 - marchFirst.getDay()) % 7;
    const novFirst = new Date(year, 10, 1);
    const dstEndDay = 1 + (7 - novFirst.getDay()) % 7;
    const dateNum = month * 100 + day;
    if (dateNum > (3 * 100 + dstStartDay) && dateNum < (11 * 100 + dstEndDay)) return -3;
    return -4;
}

function getNowAtlantic() {
    const now = new Date();
    // Try using timezone — Node 18+ supports this
    const str = now.toLocaleString('en-US', { timeZone: 'America/Moncton' });
    return new Date(str);
}

function formatTime12(hour, minute) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return h + ':' + (minute < 10 ? '0' : '') + minute + ' ' + ampm;
}

function formatDayLabel(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[date.getDay()] + ' ' + months[date.getMonth()] + ' ' + date.getDate();
}

async function getAvailableSlots(headers) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const nowAtl = getNowAtlantic();
    const today = new Date(nowAtl.getFullYear(), nowAtl.getMonth(), nowAtl.getDate());

    // Fetch booked appointments for next 2 weeks
    let booked = [];
    if (apiKey) {
        try {
            const startStr = today.toISOString().split('T')[0];
            const endDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
            const endStr = endDate.toISOString().split('T')[0];
            const filter = `AND(IS_AFTER({Date},'${startStr}'),IS_BEFORE({Date},'${endStr}'),{Status}!='Cancelled')`;
            const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=${encodeURIComponent(filter)}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
            if (res.ok) {
                const data = await res.json();
                booked = (data.records || []).map(r => {
                    const d = r.fields.Date || '';
                    const clean = d.replace(/[+-]\d{2}:\d{2}$/, '').replace(/[Zz]$/, '');
                    const p = clean.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
                    if (!p) return null;
                    return {
                        year: parseInt(p[1]), month: parseInt(p[2]), day: parseInt(p[3]),
                        hour: parseInt(p[4]), minute: parseInt(p[5]),
                        duration: r.fields.Duration || 30
                    };
                }).filter(Boolean);
            }
        } catch (e) { console.error('Fetch booked error:', e); }
    }

    // Generate available slots for next 14 days
    const slotsByDay = [];
    for (let d = 0; d < 14; d++) {
        const date = new Date(today.getTime() + d * 24 * 60 * 60 * 1000);
        const dow = date.getDay();
        const sched = SCHEDULE[dow];
        if (!sched) continue;

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const daySlots = [];

        for (let h = sched[0]; h < sched[1]; h++) {
            for (let m = 0; m < 60; m += 30) {
                // Skip past slots
                if (d === 0) {
                    const slotTime = new Date(year, month - 1, day, h, m);
                    if (slotTime <= nowAtl) continue;
                }

                // Check overlap with booked appointments
                const slotStart = h * 60 + m;
                const slotEnd = slotStart + 30;
                const overlaps = booked.some(b => {
                    if (b.year !== year || b.month !== month || b.day !== day) return false;
                    const bStart = b.hour * 60 + b.minute;
                    const bEnd = bStart + b.duration;
                    return slotStart < bEnd && slotEnd > bStart;
                });

                if (!overlaps) {
                    daySlots.push(formatTime12(h, m));
                }
            }
        }

        if (daySlots.length > 0) {
            slotsByDay.push({ label: formatDayLabel(date), slots: daySlots });
        }
    }

    // Build a text summary the agent can read
    const todayLabel = nowAtl.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const currentTime = formatTime12(nowAtl.getHours(), nowAtl.getMinutes());
    let summary = `Today is ${todayLabel}. Current time: ${currentTime} Atlantic.\n\nAvailable slots (Atlantic Time):\n`;
    if (slotsByDay.length === 0) {
        summary += 'No available slots in the next 2 weeks.';
    } else {
        slotsByDay.forEach(day => {
            summary += day.label + ': ' + day.slots.join(', ') + '\n';
        });
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ available_slots: slotsByDay, summary: summary })
    };
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Retell sends POST with action "list" — return available slots
    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body || '{}');
            if (body.action === 'list') {
                return getAvailableSlots(headers);
            }
        } catch (e) { /* fall through to default */ }
    }

    // Default: return raw appointments for dashboards
    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
            headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
        });

        const data = await response.json();

        // Normalize Airtable records into the shape expected by the dashboards
        const appointments = (data.records || [])
            .filter((r) => r.fields && r.fields.Date)
            .map((r) => {
                const f = r.fields;
                // Strip any timezone offset (e.g. -03:00, -04:00) so frontend can handle it
                const rawDate = typeof f.Date === 'string'
                    ? f.Date.replace(/[+-]\d{2}:\d{2}$/, '')
                    : f.Date;

                return {
                    id: r.id,
                    name: f.Name || 'Anonymous',
                    date: rawDate,
                    duration: f.Duration || 30,
                    phone: f.Phone || '',
                    email: f.Email || '',
                    type: f.Type || 'Consultation',
                    notes: f.Notes || '',
                    source: f.Source || '',
                    status: f.Status || 'Scheduled',
                    created: r.createdTime
                };
            });

        // Dashboards expect: { appointments: [...] }
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ appointments })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
