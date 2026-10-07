const cleanString=(value)=>String(value??'').trim();

export function requiredText(value,label){
  const result=cleanString(value);
  if(!result) throw new Error(label+' is required');
  return result;
}

export function normalizePhone(value){
  const digits=cleanString(value).replace(/\D/g,'');
  if(digits.length===10) return digits;
  if(digits.length===12&&digits.startsWith('91')) return digits.slice(2);
  return digits;
}

export function validatePhone(value){
  const phone=normalizePhone(value);
  if(phone.length<10) throw new Error('Valid phone number required');
  return phone;
}

export function positiveMoney(value,label='Amount'){
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<=0) throw new Error(label+' must be greater than 0');
  return Math.round((amount+Number.EPSILON)*100)/100;
}

export function nonNegativeMoney(value,label='Amount'){
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<0) throw new Error(label+' must be 0 or greater');
  return Math.round((amount+Number.EPSILON)*100)/100;
}

export function normalizeDate(value){
  const date=value?new Date(value):new Date();
  if(Number.isNaN(date.getTime())) throw new Error('Invalid date');
  return date.toISOString();
}

export function escapeHtml(value){
  return cleanString(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

export function normalizeError(error,fallback='Something went wrong'){
  return error?.message?String(error.message):fallback;
}
