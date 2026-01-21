export function shiftDate(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export function adjustToWorkday(date) {
    const d = new Date(date);
    const day = d.getDay();
    if (day === 0) d.setDate(d.getDate() - 2); 
    else if (day === 6) d.setDate(d.getDate() - 1);
    return d;
}

export function formatDate(date) { 
    return date.toISOString().split('T')[0]; 
}