export async function H(obj) {
    const m = (typeof obj === 'string' ? obj : JSON.stringify(obj));
    const msgUint8 = new TextEncoder().encode(m)                       
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)          
    const hashArray = Array.from(new Uint8Array(hashBuffer))                    
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex;
}

export function toDecimal(num) {
    return parseFloat((Number(num || 0)/100).toFixed(2)).toLocaleString().replace(/\.([0-9])$/, ".$10")
}

export function toPercent(num, den) {
    if ((den || 0) == 0) return "0%";
    return (Number((Number(num) / Number(den)).toFixed(2))*100).toFixed(0) + "%";
}
  
export function format2(str) {
    if (!str) return '00';
    if ((str + '').length == 0) return '00';
    if ((str + '').length == 1) return '0' + str;
    if ((str + '').length == 2) return str;
    throw 'not formattable'
}